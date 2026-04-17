import { AuditExport, Bet, BetResolutionRecord, BetSnapshot, GameState, InvariantFailure, PointNumber, RollAuditRecord, RollContextKind, RoundSummary, RoundTracker, TablePhase } from './types';

export const SIM_VERSION = '0.1.0';

export function getTablePhase(point: PointNumber | null): TablePhase {
  return point === null ? 'come-out' : 'point';
}

export function classifyRollContext(phase: TablePhase, point: PointNumber | null, total: number): RollContextKind {
  if (phase === 'come-out') {
    if (point !== null) return 'invalid_phase';
    if (total === 7 || total === 11) return 'natural';
    if (total === 2 || total === 3 || total === 12) return 'craps';
    if ([4, 5, 6, 8, 9, 10].includes(total)) return 'point_established';
    return 'invalid_result';
  }

  if (point === null) return 'invalid_phase';
  if (total === 7) return 'seven_out';
  if (total === point) return 'point_made';
  if (total >= 2 && total <= 12) return 'point_cycle_continue';
  return 'invalid_result';
}

export function createSessionId(seed: string) {
  const sanitizedSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 24) || 'session';
  return `audit-${sanitizedSeed}-${Date.now()}`;
}

export function createRoundTracker(state: Pick<GameState, 'players' | 'shooterIndex'>, roundIndex: number): RoundTracker {
  const shooter = state.players[state.shooterIndex];
  return {
    roundIndex,
    shooterId: shooter.id,
    shooterName: shooter.name,
    pointEstablished: [],
    rollCount: 0,
    totalsSequence: [],
    bankrollBefore: shooter.bankroll
  };
}

export function updateRoundTracker(round: RoundTracker, classification: RollContextKind, total: number, pointBefore: PointNumber | null) {
  round.rollCount += 1;
  round.totalsSequence.push(total);
  if (classification === 'point_established' && pointBefore === null && [4, 5, 6, 8, 9, 10].includes(total)) {
    round.pointEstablished.push(total as PointNumber);
  }
}

export function finalizeRound(state: GameState, endedBy: RoundSummary['endedBy']) {
  const round = state.audit.currentRound;
  const shooter = state.players.find((player) => player.id === round.shooterId);
  const netResult = shooter ? Math.round((shooter.bankroll - round.bankrollBefore) * 100) / 100 : 0;
  state.audit.rounds.push({
    roundIndex: round.roundIndex,
    shooterId: round.shooterId,
    shooterName: round.shooterName,
    pointEstablished: [...round.pointEstablished],
    endedBy,
    rollCount: round.rollCount,
    totalsSequence: [...round.totalsSequence],
    netResult
  });
  state.audit.currentRound = createRoundTracker(state, state.audit.nextRoundIndex);
  state.audit.nextRoundIndex += 1;
}

export function snapshotBet(bet: Bet): BetSnapshot {
  return {
    id: bet.id,
    ownerId: bet.ownerId,
    type: bet.type,
    amount: bet.amount,
    target: bet.target,
    phase: bet.phase,
    baseId: bet.baseId,
    worksOnComeout: bet.worksOnComeout
  };
}

export function snapshotAllBets(state: GameState) {
  return state.players.flatMap((player) => player.bets.map(snapshotBet));
}

export function createReasoning(classification: RollContextKind, detail: string[]) {
  const intro =
    classification === 'natural'
      ? 'Come-out natural resolved immediately.'
      : classification === 'craps'
        ? 'Come-out craps total resolved immediately.'
        : classification === 'point_established'
          ? 'Come-out total established a new point.'
          : classification === 'point_made'
            ? 'Existing point was rolled and the shooter continues on a fresh come-out.'
            : classification === 'seven_out'
              ? 'Seven-out ended the shooter hand and cleared the point.'
              : classification === 'point_cycle_continue'
                ? 'Point cycle continued without changing the shooter.'
                : 'Roll classification indicates an invalid or inconsistent state.';
  return [intro, ...detail];
}

export function checkRollInvariants(record: RollAuditRecord): InvariantFailure[] {
  // These invariants intentionally restate the core point-cycle rules so exports
  // can explain exactly which assumption failed when a regression slips in.
  const failures: InvariantFailure[] = [];

  if (record.phaseBefore === 'come-out' && record.pointBefore !== null) {
    failures.push({
      sessionId: record.sessionId,
      rollIndex: record.rollIndex,
      code: 'come_out_point_present',
      message: 'Come-out phase must not have an active point.'
    });
  }

  if (record.phaseBefore === 'point' && record.pointBefore === null) {
    failures.push({
      sessionId: record.sessionId,
      rollIndex: record.rollIndex,
      code: 'point_phase_missing_point',
      message: 'Point phase must have an active point.'
    });
  }

  if (record.phaseBefore === 'point' && record.total === 7 && !record.detectedEvents.includes('seven_out')) {
    failures.push({
      sessionId: record.sessionId,
      rollIndex: record.rollIndex,
      code: 'seven_out_not_detected',
      message: 'A 7 rolled during point phase must be detected as seven-out.'
    });
  }

  if (record.detectedEvents.includes('seven_out') && (record.phaseAfter !== 'come-out' || record.pointAfter !== null)) {
    failures.push({
      sessionId: record.sessionId,
      rollIndex: record.rollIndex,
      code: 'seven_out_did_not_reset',
      message: 'After seven-out, the phase must return to come-out and the point must clear.'
    });
  }

  if (
    record.phaseBefore === 'come-out' &&
    [4, 5, 6, 8, 9, 10].includes(record.total) &&
    (record.phaseAfter !== 'point' || record.pointAfter !== record.total)
  ) {
    failures.push({
      sessionId: record.sessionId,
      rollIndex: record.rollIndex,
      code: 'point_not_established_correctly',
      message: 'A point number rolled on the come-out must activate point phase with that number.'
    });
  }

  return failures;
}

export function buildAuditExport(state: GameState): AuditExport {
  const rounds = [...state.audit.rounds];
  const currentRound = state.audit.currentRound;
  if (currentRound.rollCount > 0) {
    const shooter = state.players.find((player) => player.id === currentRound.shooterId);
    rounds.push({
      roundIndex: currentRound.roundIndex,
      shooterId: currentRound.shooterId,
      shooterName: currentRound.shooterName,
      pointEstablished: [...currentRound.pointEstablished],
      endedBy: 'in_progress',
      rollCount: currentRound.rollCount,
      totalsSequence: [...currentRound.totalsSequence],
      netResult: shooter ? Math.round((shooter.bankroll - currentRound.bankrollBefore) * 100) / 100 : 0
    });
  }

  return {
    simVersion: SIM_VERSION,
    auditMode: state.auditMode,
    rngSeed: state.audit.rngSeed,
    sessionId: state.audit.sessionId,
    config: {
      rules: state.rules,
      aiCount: Math.max(0, state.players.length - 1),
      humanName: state.players[0]?.name ?? 'You'
    },
    rounds,
    rolls: state.audit.rolls,
    invariantFailures: state.audit.invariantFailures
  };
}

export function asPayouts(records: BetResolutionRecord[]) {
  return records.filter((record) => record.bankrollDelta !== 0 || record.payout !== 0);
}
