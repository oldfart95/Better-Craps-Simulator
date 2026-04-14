import { AI_ARCHETYPES, BET_ZONES, DEFAULT_RULES, PAYOUTS, POINT_NUMBERS } from './constants';
import {
  BatchResult,
  BatchSessionRow,
  Bet,
  BetPlacementInput,
  BetTarget,
  BetType,
  EngineConfig,
  GameState,
  LegalActionSet,
  PlayerState,
  PointNumber,
  RollLogEntry,
  RollResult,
  SessionRecap,
  TableRules
} from './types';
import { RNG } from './rng';

let nextId = 0;

const pointZeros = (): Record<PointNumber, number> => ({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });

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
    bankroll,
    bets: [],
    stats: { net: 0, wins: 0, losses: 0, byBetType: {} }
  };
}

export function createInitialState(config: EngineConfig = {}): GameState {
  const rules: TableRules = { ...DEFAULT_RULES, ...config.rules };
  const aiCount = config.aiCount ?? 5;
  const archetypes = Object.keys(AI_ARCHETYPES);
  const players = [
    createPlayer(config.humanName ?? 'You', 'human', 'human', rules.startingBankroll),
    ...Array.from({ length: aiCount }, (_, index) =>
      createPlayer(`AI-${index + 1}`, 'ai', archetypes[index % archetypes.length], rules.startingBankroll)
    )
  ];

  return {
    rules,
    seed: config.seed ?? '',
    players,
    shooterIndex: 0,
    point: null,
    rollHistory: [],
    dice: null,
    stats: {
      totalRolls: 0,
      totalShooters: 1,
      currentShooterLength: 0,
      longestShooter: 0,
      sevenOuts: 0,
      pointEstablished: pointZeros(),
      pointMade: pointZeros(),
      winByBet: {}
    },
    logs: [],
    recap: {
      title: 'Table ready',
      detail: 'Build your layout before the shooter goes.',
      bankrollDelta: 0,
      tone: 'neutral'
    }
  };
}

function clampAmount(amount: number, rules: TableRules) {
  return Math.max(rules.tableMin, Math.min(rules.tableMax, Math.round(amount)));
}

function isNumberTarget(target: BetTarget): target is PointNumber {
  return typeof target === 'number';
}

function findBaseBet(player: PlayerState, bet: Bet) {
  return player.bets.find((candidate) => candidate.id === bet.baseId);
}

function findExistingBet(player: PlayerState, type: BetType, target: BetTarget, baseId: string | null) {
  return player.bets.find((bet) => bet.type === type && bet.target === target && bet.baseId === baseId);
}

function createBet(ownerId: string, input: BetPlacementInput, rules: TableRules): Bet {
  return {
    id: uid('bet'),
    type: input.type,
    amount: clampAmount(input.amount, rules),
    target: input.target ?? null,
    baseId: input.baseId ?? null,
    phase: 'active',
    worksOnComeout: ['place', 'buy', 'lay', 'hard', 'big'].includes(input.type) ? rules.placeWorkOnComeout : true,
    ownerId
  };
}

function updateBetPerformance(player: PlayerState, type: BetType, delta: number, state: GameState) {
  player.stats.byBetType[type] = (player.stats.byBetType[type] ?? 0) + delta;
  state.stats.winByBet[type] = (state.stats.winByBet[type] ?? 0) + delta;
}

function pay(player: PlayerState, bet: Bet, multiplier: number, state: GameState) {
  const win = Math.round(bet.amount * multiplier * 100) / 100;
  player.bankroll += bet.amount + win;
  player.stats.net += win;
  player.stats.wins += 1;
  updateBetPerformance(player, bet.type, win, state);
  return win;
}

function lose(player: PlayerState, bet: Bet, state: GameState) {
  player.stats.net -= bet.amount;
  player.stats.losses += 1;
  updateBetPerformance(player, bet.type, -bet.amount, state);
}

function push(player: PlayerState, bet: Bet) {
  player.bankroll += bet.amount;
}

function recordRecap(title: string, detail: string, bankrollDelta: number, tone: SessionRecap['tone']): SessionRecap {
  return { title, detail, bankrollDelta, tone };
}

export function getLegalActionSet(state: GameState, playerId: string, input: BetPlacementInput): LegalActionSet {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: 'Player not found.' };
  const amount = clampAmount(input.amount, state.rules);

  if (player.bankroll < amount) return { ok: false, reason: 'Not enough bankroll for that chip size.' };

  switch (input.type) {
    case 'pass':
    case 'dontPass':
      if (state.point !== null) return { ok: false, reason: 'Line bets only start on the come-out.' };
      break;
    case 'come':
    case 'dontCome':
      if (state.point === null) return { ok: false, reason: 'Come bets require a point to be on.' };
      break;
    case 'field':
      break;
    case 'place':
      if (!POINT_NUMBERS.includes(input.target as PointNumber)) return { ok: false, reason: 'Choose a valid place number.' };
      break;
    case 'buy':
      if (![4, 10].includes(input.target as number)) return { ok: false, reason: 'Buy bets only apply to 4 or 10.' };
      break;
    case 'lay':
      if (!POINT_NUMBERS.includes(input.target as PointNumber)) return { ok: false, reason: 'Choose a valid lay number.' };
      break;
    case 'big':
      if (![6, 8].includes(input.target as number)) return { ok: false, reason: 'Big bets only support 6 or 8.' };
      if (!state.rules.big68Enabled) return { ok: false, reason: 'Big 6/8 is disabled.' };
      break;
    case 'hard':
      if (![4, 6, 8, 10].includes(input.target as number)) return { ok: false, reason: 'Hardways must target 4, 6, 8, or 10.' };
      break;
    case 'prop':
      if (!state.rules.propBetsEnabled) return { ok: false, reason: 'Props are disabled in this table setup.' };
      break;
    case 'odds': {
      if (!input.baseId) return { ok: false, reason: 'Odds must attach to a line or come bet.' };
      const base = player.bets.find((bet) => bet.id === input.baseId);
      if (!base) return { ok: false, reason: 'Base bet not found.' };
      const target = (base.target ?? state.point) as PointNumber | null;
      if (!target) return { ok: false, reason: 'Odds require a point or moved come bet.' };
      const maxOdds = state.rules.maxOddsMultiplier[target] * base.amount;
      if (amount > maxOdds) return { ok: false, reason: `Odds max is ${maxOdds}.` };
      break;
    }
    default:
      break;
  }

  const duplicate = findExistingBet(player, input.type, input.target ?? null, input.baseId ?? null);
  if (duplicate && input.type !== 'field' && input.type !== 'prop') {
    return { ok: false, reason: 'That wager is already working.' };
  }

  return { ok: true, reason: 'Legal now.' };
}

export function placeBet(state: GameState, playerId: string, input: BetPlacementInput) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: 'Player not found.' };
  const legal = getLegalActionSet(state, playerId, input);
  if (!legal.ok) return legal;
  const bet = createBet(player.id, input, state.rules);
  player.bankroll -= bet.amount;
  player.bets.push(bet);
  return { ok: true, bet };
}

export function removeBet(state: GameState, playerId: string, betId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return false;
  const bet = player.bets.find((candidate) => candidate.id === betId);
  if (!bet) return false;
  player.bankroll += bet.amount;
  player.bets = player.bets.filter((candidate) => candidate.id !== betId);
  return true;
}

function rotateShooter(state: GameState) {
  state.stats.longestShooter = Math.max(state.stats.longestShooter, state.stats.currentShooterLength);
  state.stats.currentShooterLength = 0;
  state.shooterIndex = (state.shooterIndex + 1) % state.players.length;
  state.stats.totalShooters += 1;
  state.point = null;
}

function resolveBet(state: GameState, player: PlayerState, bet: Bet, roll: RollResult, detail: string[]) {
  const total = roll.total;
  const isComeout = state.point === null;
  const point = state.point;
  const offOnComeout = isComeout && ['place', 'buy', 'lay', 'hard', 'big'].includes(bet.type) && !bet.worksOnComeout;
  if (offOnComeout) return bet;

  if (bet.type === 'field') {
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      const multiplier = (PAYOUTS.field as Record<number | 'default', number>)[total] ?? PAYOUTS.field.default;
      const win = pay(player, bet, multiplier, state);
      detail.push(`${player.name} field wins ${win.toFixed(2)}.`);
    } else {
      lose(player, bet, state);
    }
    return null;
  }

  if (bet.type === 'prop') {
    const won =
      (bet.target === 'any7' && total === 7) ||
      (bet.target === 'yo11' && total === 11) ||
      (bet.target === 'snake2' && total === 2) ||
      (bet.target === 'boxcars12' && total === 12);
    if (won && typeof bet.target === 'string') {
      pay(player, bet, PAYOUTS.props[bet.target], state);
    } else {
      lose(player, bet, state);
    }
    return null;
  }

  if (bet.type === 'pass') {
    if (isComeout && [7, 11].includes(total)) {
      pay(player, bet, 1, state);
      return null;
    }
    if (isComeout && [2, 3, 12].includes(total)) {
      lose(player, bet, state);
      return null;
    }
    if (!isComeout && total === point) {
      pay(player, bet, 1, state);
      return null;
    }
    if (!isComeout && total === 7) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'dontPass') {
    if (isComeout && [2, 3].includes(total)) {
      pay(player, bet, 1, state);
      return null;
    }
    if (isComeout && total === 12) {
      push(player, bet);
      return null;
    }
    if (isComeout && [7, 11].includes(total)) {
      lose(player, bet, state);
      return null;
    }
    if (!isComeout && total === 7) {
      pay(player, bet, 1, state);
      return null;
    }
    if (!isComeout && total === point) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'come' || bet.type === 'dontCome') {
    if (bet.phase === 'active') {
      if (bet.type === 'come') {
        if ([7, 11].includes(total)) {
          pay(player, bet, 1, state);
          return null;
        }
        if ([2, 3, 12].includes(total)) {
          lose(player, bet, state);
          return null;
        }
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`${player.name} come moves to ${total}.`);
        }
      } else {
        if ([2, 3].includes(total)) {
          pay(player, bet, 1, state);
          return null;
        }
        if (total === 12) {
          push(player, bet);
          return null;
        }
        if ([7, 11].includes(total)) {
          lose(player, bet, state);
          return null;
        }
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`${player.name} don't come moves to ${total}.`);
        }
      }
      return bet;
    }

    if (bet.type === 'come' && total === bet.target) {
      pay(player, bet, 1, state);
      return null;
    }
    if (bet.type === 'come' && total === 7) {
      lose(player, bet, state);
      return null;
    }
    if (bet.type === 'dontCome' && total === 7) {
      pay(player, bet, 1, state);
      return null;
    }
    if (bet.type === 'dontCome' && total === bet.target) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'odds') {
    const base = findBaseBet(player, bet);
    if (!base) {
      push(player, bet);
      return null;
    }
    const target = (base.target ?? point) as PointNumber;
    const dark = base.type === 'dontPass' || base.type === 'dontCome';
    if (!dark && total === target) {
      pay(player, bet, PAYOUTS.passOdds[target], state);
      return null;
    }
    if (!dark && total === 7) {
      lose(player, bet, state);
      return null;
    }
    if (dark && total === 7) {
      pay(player, bet, PAYOUTS.dontOdds[target], state);
      return null;
    }
    if (dark && total === target) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'place') {
    if (total === bet.target) {
      pay(player, bet, PAYOUTS.place[bet.target as PointNumber], state);
      return bet;
    }
    if (total === 7) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'buy') {
    if (total === bet.target) {
      pay(player, bet, PAYOUTS.buy[bet.target as 4 | 10], state);
      const vig = Math.ceil(bet.amount * 0.05);
      player.bankroll -= vig;
      player.stats.net -= vig;
      detail.push(`${player.name} pays ${vig} vig on the buy win.`);
      return bet;
    }
    if (total === 7) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'lay') {
    if (total === 7) {
      pay(player, bet, PAYOUTS.lay[bet.target as PointNumber], state);
      return bet;
    }
    if (total === bet.target) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'big') {
    if (total === bet.target) {
      pay(player, bet, PAYOUTS.big, state);
      return bet;
    }
    if (total === 7) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  if (bet.type === 'hard') {
    if (total === bet.target && roll.hard) {
      pay(player, bet, PAYOUTS.hard[bet.target as 4 | 6 | 8 | 10], state);
      return bet;
    }
    if (total === 7 || (total === bet.target && !roll.hard)) {
      lose(player, bet, state);
      return null;
    }
    return bet;
  }

  return bet;
}

function maybeAddOdds(state: GameState, player: PlayerState, baseType: BetType) {
  const base = player.bets.find((bet) => bet.type === baseType && (bet.phase === 'moved' || state.point !== null));
  if (!base) return;
  const target = (base.target ?? state.point) as PointNumber | null;
  if (!target) return;
  if (player.bets.some((bet) => bet.type === 'odds' && bet.baseId === base.id)) return;
  const maxOdds = state.rules.maxOddsMultiplier[target] * base.amount;
  placeBet(state, player.id, { type: 'odds', amount: maxOdds, baseId: base.id, target });
}

export function runAiTurns(state: GameState, rng: RNG) {
  for (const player of state.players.slice(1)) {
    const profile = AI_ARCHETYPES[player.archetype as keyof typeof AI_ARCHETYPES];
    if (!profile) continue;
    const unit = clampAmount(Math.max(state.rules.tableMin, Math.round(state.rules.tableMin * (0.8 + rng.next()))), state.rules);

    if (state.point === null) {
      if (profile.base && !player.bets.some((bet) => bet.type === profile.base)) {
        placeBet(state, player.id, { type: profile.base as BetType, amount: unit });
      }
      continue;
    }

    if (profile.base && profile.oddsRate > rng.next()) {
      maybeAddOdds(state, player, profile.base as BetType);
    }

    for (const target of profile.place) {
      if (!player.bets.some((bet) => bet.type === 'place' && bet.target === target) && rng.next() < 0.65) {
        placeBet(state, player.id, { type: 'place', amount: unit, target });
      }
    }

    if (!profile.dark && !player.bets.some((bet) => bet.type === 'come') && rng.next() < 0.18) {
      placeBet(state, player.id, { type: 'come', amount: unit });
    }
    if (profile.dark && !player.bets.some((bet) => bet.type === 'dontCome') && rng.next() < 0.18) {
      placeBet(state, player.id, { type: 'dontCome', amount: unit });
    }
    if (profile.field > rng.next()) {
      placeBet(state, player.id, { type: 'field', amount: unit });
    }
    if (profile.props > rng.next()) {
      const props: BetTarget[] = ['any7', 'yo11', 'snake2', 'boxcars12'];
      placeBet(state, player.id, { type: 'prop', amount: unit, target: props[rng.int(0, props.length - 1)] });
    }
  }
}

export function advanceRoll(state: GameState, rng: RNG) {
  runAiTurns(state, rng);

  const before = state.players[0].bankroll;
  const roll = rng.rollDice();
  const detail: string[] = [];

  state.dice = roll;
  state.stats.totalRolls += 1;
  state.stats.currentShooterLength += 1;
  state.rollHistory = [roll.total, ...state.rollHistory].slice(0, 18);

  for (const player of state.players) {
    player.bets = player.bets.flatMap((bet) => {
      const updated = resolveBet(state, player, bet, roll, detail);
      return updated ? [updated] : [];
    });
  }

  if (state.point === null && POINT_NUMBERS.includes(roll.total as PointNumber)) {
    const nextPoint = roll.total as PointNumber;
    state.point = nextPoint;
    state.stats.pointEstablished[nextPoint] += 1;
    detail.push(`Point is set to ${nextPoint}.`);
  } else if (state.point !== null && roll.total === state.point) {
    state.stats.pointMade[state.point] += 1;
    detail.push(`Point ${state.point} made. Back to the come-out.`);
    state.point = null;
  } else if (state.point !== null && roll.total === 7) {
    state.stats.sevenOuts += 1;
    detail.push('Seven-out. Shooter moves clockwise.');
    rotateShooter(state);
  }

  const delta = Math.round((state.players[0].bankroll - before) * 100) / 100;
  state.recap =
    delta > 0
      ? recordRecap('Positive roll', `Your layout gained ${delta.toFixed(2)}.`, delta, 'good')
      : delta < 0
        ? recordRecap('Pressure roll', `Your layout dropped ${Math.abs(delta).toFixed(2)}.`, delta, 'warn')
        : recordRecap('Table flow', detail[0] ?? 'No direct bankroll change this roll.', 0, 'neutral');

  const entry: RollLogEntry = {
    id: uid('log'),
    rollNumber: state.stats.totalRolls,
    total: roll.total,
    dice: `${roll.d1} + ${roll.d2}`,
    summary: `${state.players[state.shooterIndex].name} rolled ${roll.total}`,
    detail
  };
  state.logs = [entry, ...state.logs].slice(0, 30);

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
    .filter((bet) => ['pass', 'dontPass', 'come', 'dontCome'].includes(bet.type))
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
    const state = createInitialState({ ...config, seed: `${config.seed ?? 'batch'}-${index}` });
    const rng = new RNG(state.seed);
    while (state.stats.totalShooters < shooterTarget) {
      advanceRoll(state, rng);
    }
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
