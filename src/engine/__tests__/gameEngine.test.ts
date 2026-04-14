import { describe, expect, test } from 'vitest';
import { advanceRoll, createBatchResult, createInitialState, getLegalActionSet, placeBet } from '../gameEngine';
import { RNG } from '../rng';

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
});
