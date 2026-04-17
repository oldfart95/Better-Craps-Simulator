import { describe, expect, test } from 'vitest';
import { advanceRoll, createBatchResult, createInitialState, exportAuditReport, getLegalActionSet, getOddsTargetsForPlayer, placeBet, removeBet } from '../gameEngine';
import { RNG } from '../rng';
import { checkRollInvariants } from '../audit';

describe('craps engine', () => {
  test('pass line resolves on natural on the come-out', () => {
    const state = createInitialState({ seed: 'pass-win' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('pass-win');
    rng.rollDice = () => ({ d1: 4, d2: 3, total: 7, hard: false });
    advanceRoll(state, rng);
    expect(hero.bankroll).toBe(1010);
  });

  test("don't pass pushes on 12", () => {
    const state = createInitialState({ seed: 'dont-pass-push' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'dontPass', amount: 10 });
    const rng = new RNG('dont-pass-push');
    rng.rollDice = () => ({ d1: 6, d2: 6, total: 12, hard: true });
    advanceRoll(state, rng);
    expect(hero.bankroll).toBe(1000);
  });

  test('come bet travels and loses on seven-out', () => {
    const state = createInitialState({ seed: 'come-travel' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('come-travel');
    const sequence = [
      { d1: 3, d2: 3, total: 6, hard: true },
      { d1: 2, d2: 3, total: 5, hard: false },
      { d1: 4, d2: 3, total: 7, hard: false }
    ];
    rng.rollDice = () => sequence.shift()!;
    advanceRoll(state, rng);
    placeBet(state, hero.id, { type: 'come', amount: 10 });
    advanceRoll(state, rng);
    expect(hero.bets.some((bet) => bet.type === 'come' && bet.target === 5)).toBe(true);
    advanceRoll(state, rng);
    expect(hero.bankroll).toBeLessThan(1000);
  });

  test('odds cannot exceed table max multiplier', () => {
    const state = createInitialState({ seed: 'odds-max' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('odds-max');
    rng.rollDice = () => ({ d1: 1, d2: 3, total: 4, hard: false });
    advanceRoll(state, rng);
    const base = hero.bets.find((bet) => bet.type === 'pass');
    const result = getLegalActionSet(state, hero.id, { type: 'odds', amount: 40, baseId: base?.id, target: 4 });
    expect(result.ok).toBe(false);
  });

  test('active come bet cannot take odds before it travels', () => {
    const state = createInitialState({ seed: 'come-odds-gate' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('come-odds-gate');
    rng.rollDice = () => ({ d1: 2, d2: 2, total: 4, hard: true });
    advanceRoll(state, rng);

    placeBet(state, hero.id, { type: 'come', amount: 10 });
    const activeCome = hero.bets.find((bet) => bet.type === 'come');

    expect(activeCome?.phase).toBe('active');
    expect(getOddsTargetsForPlayer(state, hero.id).some((target) => target.baseId === activeCome?.id)).toBe(false);

    const result = getLegalActionSet(state, hero.id, { type: 'odds', amount: 10, baseId: activeCome?.id, target: 4 });
    expect(result.ok).toBe(false);
  });

  test('batch summary returns stable aggregates', () => {
    const batch = createBatchResult({ seed: 'batch-seed' }, 4, 12);
    expect(batch.summary.sessions).toBe(4);
    expect(batch.rows).toHaveLength(4);
    expect(batch.summary.averageRolls).toBeGreaterThan(0);
  });

  test('bankroll history and full roll logs grow with each roll', () => {
    const state = createInitialState({ seed: 'history-seed' });
    const rng = new RNG('history-seed');
    rng.rollDice = () => ({ d1: 3, d2: 4, total: 7, hard: false });

    advanceRoll(state, rng);
    advanceRoll(state, rng);

    expect(state.players[0].bankrollHistory).toHaveLength(3);
    expect(state.logs).toHaveLength(2);
    expect(state.logs[0].shooter).toBeTruthy();
  });

  test('removing a base bet refunds attached odds', () => {
    const state = createInitialState({ seed: 'refund-odds' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('refund-odds');
    rng.rollDice = () => ({ d1: 2, d2: 2, total: 4, hard: true });
    advanceRoll(state, rng);

    const base = hero.bets.find((bet) => bet.type === 'pass');
    expect(base).toBeTruthy();
    placeBet(state, hero.id, { type: 'odds', amount: 20, baseId: base?.id, target: 4 });
    expect(hero.bankroll).toBe(970);

    const removed = removeBet(state, hero.id, base!.id);
    expect(removed).toBe(true);
    expect(hero.bankroll).toBe(1000);
    expect(hero.bets).toHaveLength(0);
  });

  test('audit mode records come-out point establishment with structured context', () => {
    const state = createInitialState({ seed: 'audit-point', auditMode: true });
    const rng = new RNG('audit-point');
    rng.rollDice = () => ({ d1: 2, d2: 2, total: 4, hard: true });

    advanceRoll(state, rng);

    expect(state.audit.rolls).toHaveLength(1);
    expect(state.audit.rolls[0].classification).toBe('point_established');
    expect(state.audit.rolls[0].phaseBefore).toBe('come-out');
    expect(state.audit.rolls[0].phaseAfter).toBe('point');
    expect(state.audit.rolls[0].pointAfter).toBe(4);
    expect(state.audit.invariantFailures).toHaveLength(0);
  });

  test('seven-out audit captures shooter reset and round summary', () => {
    const state = createInitialState({ seed: 'seven-out', auditMode: true });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('seven-out');
    const sequence = [
      { d1: 3, d2: 3, total: 6, hard: true },
      { d1: 4, d2: 3, total: 7, hard: false }
    ];
    rng.rollDice = () => sequence.shift()!;

    advanceRoll(state, rng);
    advanceRoll(state, rng);

    const sevenOutRecord = state.audit.rolls[1];
    expect(sevenOutRecord.classification).toBe('seven_out');
    expect(sevenOutRecord.detectedEvents).toContain('seven_out');
    expect(sevenOutRecord.phaseAfter).toBe('come-out');
    expect(sevenOutRecord.pointAfter).toBeNull();
    expect(state.audit.rounds[0].endedBy).toBe('seven_out');
    expect(state.audit.rounds[0].totalsSequence).toEqual([6, 7]);
  });

  test('audit export carries invariant failures when they are recorded', () => {
    const state = createInitialState({ seed: 'broken-audit', auditMode: true });
    const failures = checkRollInvariants({
      sessionId: state.audit.sessionId,
      rollIndex: 1,
      shooterId: state.players[0].id,
      shooterName: state.players[0].name,
      dice: [3, 4],
      total: 7,
      phaseBefore: 'point',
      pointBefore: 6,
      phaseAfter: 'point',
      pointAfter: 6,
      classification: 'seven_out',
      detectedEvents: ['seven_out'],
      betsBefore: [],
      betsResolved: [],
      payouts: [],
      bankrollBefore: 1000,
      bankrollAfter: 990,
      reasoning: ['forced invalid transition']
    });

    state.audit.invariantFailures.push(...failures);
    const report = exportAuditReport(state);

    expect(report.auditMode).toBe(true);
    expect(report.rngSeed).toBe('broken-audit');
    expect(report.invariantFailures.some((failure) => failure.code === 'seven_out_did_not_reset')).toBe(true);
  });
});
