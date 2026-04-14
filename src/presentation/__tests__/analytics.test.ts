import { describe, expect, test } from 'vitest';
import { createSessionExportFiles, createSessionTextureMetrics, createStrategyComparisonRows, histogramFromRolls } from '../analytics';
import { advanceRoll, createInitialState, placeBet } from '../../engine/gameEngine';
import { RNG } from '../../engine/rng';

describe('analytics helpers', () => {
  test('builds a histogram across craps totals', () => {
    const histogram = histogramFromRolls([7, 7, 2, 12, 8]);
    expect(histogram.find((entry) => entry.total === 7)?.count).toBe(2);
    expect(histogram.find((entry) => entry.total === 2)?.count).toBe(1);
  });

  test('creates session texture and ranked comparison rows', () => {
    const state = createInitialState({ seed: 'analytics-session' });
    const hero = state.players[0];
    placeBet(state, hero.id, { type: 'pass', amount: 10 });
    const rng = new RNG('analytics-session');
    const sequence = [
      { d1: 2, d2: 2, total: 4, hard: true },
      { d1: 2, d2: 2, total: 4, hard: true },
      { d1: 3, d2: 4, total: 7, hard: false }
    ];
    rng.rollDice = () => sequence.shift()!;

    advanceRoll(state, rng);
    advanceRoll(state, rng);
    advanceRoll(state, rng);

    const texture = createSessionTextureMetrics(state);
    const comparison = createStrategyComparisonRows(state);

    expect(texture.totalRolls).toBe(3);
    expect(texture.pointMadeTotal).toBe(1);
    expect(comparison[0].rank).toBe(1);
    expect(comparison.some((row) => row.archetype.includes('Manual'))).toBe(true);
  });

  test('exports spreadsheet-friendly live session csv files', () => {
    const state = createInitialState({ seed: 'export-session' });
    const rng = new RNG('export-session');
    rng.rollDice = () => ({ d1: 3, d2: 4, total: 7, hard: false });
    advanceRoll(state, rng);

    const files = createSessionExportFiles(state);

    expect(files.map((file) => file.filename)).toEqual([
      'craps-session-summary.csv',
      'craps-player-summary.csv',
      'craps-roll-log.csv',
      'craps-bankroll-timeline.csv'
    ]);
    expect(files[0].content).toContain('section,metric,value');
    expect(files[2].content).toContain('rollNumber,dice,total,shooter');
  });
});
