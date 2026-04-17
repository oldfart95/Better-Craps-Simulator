import { AI_ARCHETYPES, BET_ZONES, DEFAULT_RULES, POINT_NUMBERS } from './constants';
import { asPayouts, buildAuditExport, checkRollInvariants, classifyRollContext, createReasoning, createRoundTracker, createSessionId, finalizeRound, getTablePhase, snapshotAllBets, SIM_VERSION, updateRoundTracker } from './audit';
import { reserveBet, clampAmount } from './bankroll';
import { rollDice } from './diceEngine';
import { getLegalActionSet } from './legalBets';
import { resolveAllBets } from './payoutLogic';
import { applyRollPhaseTransition } from './shooterFlow';
import { appendRollLog, createInitialBankrollEntry, createSessionStats, pointZeros, recordRollStats, snapshotBankrolls } from './stats';
import {
  AuditExport,
  AIArchetypeKey,
  BatchResult,
  BatchSessionRow,
  Bet,
  BetPlacementInput,
  BetTarget,
  BetType,
  EngineConfig,
  GameState,
  PlayerState,
  PointNumber,
  RollLogEntry,
  RollAuditRecord,
  SessionRecap,
  TableRules
} from './types';
import { RNG } from './rng';

let nextId = 0;

function uid(prefix: string) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function createPlayer(name: string, kind: 'human' | 'ai', archetype: string, bankroll: number): PlayerState {
  return {
    id: uid('player'),
    name,
    kind,
    archetype,
    startingBankroll: bankroll,
    bankroll,
    bets: [],
    stats: { net: 0, wins: 0, losses: 0, byBetType: {} },
    bankrollHistory: [createInitialBankrollEntry(bankroll)]
  };
}

export function createInitialState(config: EngineConfig = {}): GameState {
  const rules: TableRules = { ...DEFAULT_RULES, ...config.rules };
  const aiCount = config.aiCount ?? 0;
  const seed = config.seed?.trim() || `session-${Date.now()}`;
  const archetypes = Object.keys(AI_ARCHETYPES);
  const players = [
    createPlayer(config.humanName ?? 'You', 'human', 'human', rules.startingBankroll),
    ...Array.from({ length: aiCount }, (_, index) =>
      createPlayer(`Seat ${index + 2}`, 'ai', archetypes[index % archetypes.length], rules.startingBankroll)
    )
  ];
  const sessionId = createSessionId(seed);
  const baseState = {
    rules,
    seed,
    startedAt: new Date().toISOString(),
    auditMode: config.auditMode ?? false,
    players,
    shooterIndex: 0,
    point: null,
    rollHistory: [],
    dice: null,
    stats: createSessionStats(),
    logs: [],
    recap: {
      title: 'Table ready',
      detail: 'Select a chip, tap a felt area, and place a legal wager.',
      bankrollDelta: 0,
      tone: 'neutral' as const
    }
  };

  return {
    ...baseState,
    audit: {
      sessionId,
      rngSeed: seed,
      rolls: [],
      rounds: [],
      invariantFailures: [],
      currentRound: createRoundTracker(baseState, 1),
      nextRoundIndex: 2
    }
  };
}

function createBet(ownerId: string, input: BetPlacementInput, state: GameState): Bet {
  return {
    id: uid('bet'),
    type: input.type,
    amount: clampAmount(input.amount, state),
    target: input.target ?? null,
    baseId: input.baseId ?? null,
    phase: 'active',
    worksOnComeout: ['place', 'buy', 'lay', 'hard', 'big'].includes(input.type) ? state.rules.placeWorkOnComeout : true,
    ownerId
  };
}

function recordRecap(title: string, detail: string, bankrollDelta: number, tone: SessionRecap['tone']): SessionRecap {
  return { title, detail, bankrollDelta, tone };
}

export { getLegalActionSet };

export function placeBet(state: GameState, playerId: string, input: BetPlacementInput) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: 'Player not found.' };
  const legal = getLegalActionSet(state, playerId, input);
  if (!legal.ok) return legal;
  const bet = createBet(player.id, input, state);
  reserveBet(player, bet, state);
  player.bets.push(bet);
  return { ok: true, bet };
}

export function removeBet(state: GameState, playerId: string, betId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return false;
  const bet = player.bets.find((candidate) => candidate.id === betId);
  if (!bet) return false;
  const removedBets = player.bets.filter((candidate) => candidate.id === betId || candidate.baseId === betId);
  if (!state.rules.freePractice) {
    const refund = removedBets.reduce((total, candidate) => total + candidate.amount, 0);
    player.bankroll += refund;
  }
  player.bets = player.bets.filter((candidate) => candidate.id !== betId && candidate.baseId !== betId);
  return true;
}

function maybeAddOdds(state: GameState, player: PlayerState, baseType: BetType) {
  const base = player.bets.find((bet) => bet.type === baseType && (bet.phase === 'moved' || state.point !== null));
  if (!base) return;
  const target = (base.target ?? state.point) as PointNumber | null;
  if (!target || player.bets.some((bet) => bet.type === 'odds' && bet.baseId === base.id)) return;
  const maxOdds = state.rules.maxOddsMultiplier[target] * base.amount;
  placeBet(state, player.id, { type: 'odds', amount: maxOdds, baseId: base.id, target });
}

export function runAiTurns(state: GameState, rng: RNG) {
  for (const player of state.players.slice(1)) {
    const profile = AI_ARCHETYPES[player.archetype as AIArchetypeKey];
    if (!profile) continue;
    const unit = clampAmount(Math.max(state.rules.tableMin, Math.round(state.rules.tableMin * (0.8 + rng.next()))), state);

    if (state.point === null) {
      if (profile.base && !player.bets.some((bet) => bet.type === profile.base)) {
        placeBet(state, player.id, { type: profile.base as BetType, amount: unit });
      }
      continue;
    }

    if (profile.base && profile.oddsRate > rng.next()) maybeAddOdds(state, player, profile.base as BetType);

    for (const target of profile.place) {
      if (!player.bets.some((bet) => bet.type === 'place' && bet.target === target) && rng.next() < 0.55) {
        placeBet(state, player.id, { type: 'place', amount: unit, target });
      }
    }

    if (!profile.dark && !player.bets.some((bet) => bet.type === 'come') && rng.next() < 0.15) {
      placeBet(state, player.id, { type: 'come', amount: unit });
    }
    if (profile.dark && !player.bets.some((bet) => bet.type === 'dontCome') && rng.next() < 0.15) {
      placeBet(state, player.id, { type: 'dontCome', amount: unit });
    }
    if (profile.field > rng.next()) placeBet(state, player.id, { type: 'field', amount: unit });
  }
}

export function advanceRoll(state: GameState, rng: RNG) {
  runAiTurns(state, rng);

  const humanBefore = state.players[0].bankroll;
  const shooterName = state.players[state.shooterIndex].name;
  const shooterId = state.players[state.shooterIndex].id;
  const phaseBefore = getTablePhase(state.point);
  const pointBefore = state.point;
  const betsBefore = snapshotAllBets(state);
  const roll = rollDice(rng);
  const detail: string[] = [];
  const classification = classifyRollContext(phaseBefore, pointBefore, roll.total);

  // Every live roll now flows through the same sequence: classify, resolve bets,
  // apply point/shooter transitions, then validate the resulting record.
  recordRollStats(state, roll);
  const betsResolved = resolveAllBets(state, roll, detail);
  const transitionEvents = applyRollPhaseTransition(state, classification, roll.total, detail);
  const phaseAfter = getTablePhase(state.point);
  const detectedEvents = Array.from(new Set([classification, ...transitionEvents]));
  updateRoundTracker(state.audit.currentRound, classification, roll.total, pointBefore);

  const delta = Math.round((state.players[0].bankroll - humanBefore) * 100) / 100;
  state.recap =
    delta > 0
      ? recordRecap('Positive roll', `Your layout gained $${delta.toFixed(2)}.`, delta, 'good')
      : delta < 0
        ? recordRecap('Pressure roll', `Your layout dropped $${Math.abs(delta).toFixed(2)}.`, delta, 'warn')
        : recordRecap('Table flow', detail[0] ?? 'No direct bankroll change on your layout.', 0, 'neutral');

  const auditRecord: RollAuditRecord = {
    sessionId: state.audit.sessionId,
    rollIndex: state.stats.totalRolls,
    shooterId,
    shooterName,
    dice: [roll.d1, roll.d2],
    total: roll.total,
    phaseBefore,
    pointBefore,
    phaseAfter,
    pointAfter: state.point,
    classification,
    detectedEvents,
    betsBefore,
    betsResolved,
    payouts: asPayouts(betsResolved),
    bankrollBefore: Math.round(humanBefore * 100) / 100,
    bankrollAfter: Math.round(state.players[0].bankroll * 100) / 100,
    reasoning: createReasoning(classification, detail)
  };
  const failures = checkRollInvariants(auditRecord);
  if (failures.length > 0) {
    state.audit.invariantFailures.push(...failures);
  }
  if (state.auditMode) {
    state.audit.rolls.push(auditRecord);
  }

  if (detectedEvents.includes('seven_out')) {
    finalizeRound(state, 'seven_out');
  }

  const entry: RollLogEntry = {
    id: uid('log'),
    rollNumber: state.stats.totalRolls,
    shooter: shooterName,
    total: roll.total,
    dice: `${roll.d1} + ${roll.d2}`,
    pointBefore,
    pointAfter: state.point,
    summary: `${shooterName} rolled ${roll.total}`,
    detail: failures.length > 0 ? [...detail, ...failures.map((failure) => `Invariant: ${failure.message}`)] : detail
  };
  appendRollLog(state, entry);
  snapshotBankrolls(state);
  return roll;
}

export function getBoardZones() {
  return BET_ZONES;
}

export function getHumanPlayer(state: GameState) {
  return state.players[0];
}

export function getHumanBetForZone(state: GameState, zoneId: string) {
  const zone = BET_ZONES.find((candidate) => candidate.id === zoneId);
  const human = getHumanPlayer(state);
  if (!zone) return [];
  return human.bets.filter((bet) => bet.type === zone.type && bet.target === zone.target);
}

export function getOddsTargetsForPlayer(state: GameState, playerId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return [];
  return player.bets
    .filter((bet) => {
      if (!['pass', 'dontPass', 'come', 'dontCome'].includes(bet.type)) return false;
      if ((bet.type === 'come' || bet.type === 'dontCome') && bet.phase !== 'moved') return false;
      return true;
    })
    .map((bet) => ({
      baseId: bet.id,
      label: `${bet.type === 'pass' ? 'Pass' : bet.type === 'dontPass' ? "Don't Pass" : bet.type === 'come' ? 'Come' : "Don't Come"} odds ${bet.target ?? state.point ?? ''}`.trim(),
      target: (bet.target ?? state.point) as PointNumber | null
    }))
    .filter((item) => item.target !== null);
}

export function createBatchResult(config: EngineConfig, sessions = 60, shooterTarget = 90): BatchResult {
  const rows: BatchSessionRow[] = [];
  const pointMadeTotals = pointZeros();
  const winByBetAggregate: GameState['stats']['winByBet'] = {};

  for (let index = 0; index < sessions; index += 1) {
    const state = createInitialState({ ...config, aiCount: 3, seed: `${config.seed ?? 'batch'}-${index}` });
    const rng = new RNG(state.seed);
    while (state.stats.totalShooters < shooterTarget) advanceRoll(state, rng);
    rows.push({
      session: index + 1,
      totalRolls: state.stats.totalRolls,
      avgShooterLength: Number((state.stats.totalRolls / Math.max(1, state.stats.totalShooters)).toFixed(2)),
      longestShooter: Math.max(state.stats.longestShooter, state.stats.currentShooterLength),
      sevenOuts: state.stats.sevenOuts
    });
    for (const point of POINT_NUMBERS) pointMadeTotals[point] += state.stats.pointMade[point];
    for (const [key, value] of Object.entries(state.stats.winByBet)) {
      winByBetAggregate[key as BetType] = (winByBetAggregate[key as BetType] ?? 0) + (value ?? 0);
    }
  }

  const averageRolls = rows.reduce((total, row) => total + row.totalRolls, 0) / rows.length;
  const averageShooterLength = rows.reduce((total, row) => total + row.avgShooterLength, 0) / rows.length;
  const longestShooter = Math.max(...rows.map((row) => row.longestShooter));
  const sevenOutRate = rows.reduce((total, row) => total + row.sevenOuts, 0) / Math.max(1, rows.reduce((total, row) => total + row.totalRolls, 0));

  return {
    summary: {
      sessions,
      averageRolls: Number(averageRolls.toFixed(2)),
      averageShooterLength: Number(averageShooterLength.toFixed(2)),
      longestShooter,
      sevenOutRate: Number(sevenOutRate.toFixed(3)),
      pointMadeTotals,
      winByBetAggregate
    },
    rows
  };
}

export function exportAuditReport(state: GameState): AuditExport {
  return buildAuditExport(state);
}

export { SIM_VERSION };
