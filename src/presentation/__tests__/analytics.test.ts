import { describe, expect, test } from 'vitest';
import { histogramFromRolls } from '../analytics';

describe('analytics helpers', () => {
  test('builds a histogram across craps totals', () => {
    const histogram = histogramFromRolls([7, 7, 2, 12, 8]);
    expect(histogram.find((entry) => entry.total === 7)?.count).toBe(2);
    expect(histogram.find((entry) => entry.total === 2)?.count).toBe(1);
  });
});
