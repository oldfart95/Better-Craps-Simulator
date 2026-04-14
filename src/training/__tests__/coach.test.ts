import { describe, expect, test } from 'vitest';
import { createInitialState, placeBet } from '../../engine/gameEngine';
import { buildCoachPrompts, buildCompactStats } from '../coach';

describe('coach helpers', () => {
  test('suggests a pass line on empty come-out', () => {
    const state = createInitialState();
    expect(buildCoachPrompts(state)[0]).toMatch(/pass line/i);
  });

  test('compact stats expose bankroll and shooter rhythm', () => {
    const state = createInitialState();
    placeBet(state, state.players[0].id, { type: 'pass', amount: 10 });
    const cards = buildCompactStats(state);
    expect(cards.some((card) => card.label === 'Bankroll')).toBe(true);
    expect(cards.some((card) => card.label === 'Shooter rhythm')).toBe(true);
  });
});
