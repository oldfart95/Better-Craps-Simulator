import { BatchResult, GameState } from '../engine/types';

export function histogramFromRolls(rolls: number[]) {
  const histogram = Array.from({ length: 11 }, (_, index) => ({ total: index + 2, count: 0 }));
  for (const roll of rolls) {
    const slot = histogram.find((entry) => entry.total === roll);
    if (slot) slot.count += 1;
  }
  return histogram;
}

export function createAnalyticsCards(state: GameState) {
  const totalRolls = Math.max(1, state.stats.totalRolls);
  const pointEstablished = Object.values(state.stats.pointEstablished).reduce((sum, value) => sum + value, 0);
  return [
    {
      title: 'Seven rate',
      value: (state.rollHistory.filter((roll) => roll === 7).length / Math.max(1, state.rollHistory.length)).toFixed(3),
      hint: 'Visible recent rate'
    },
    {
      title: 'Point frequency',
      value: (pointEstablished / totalRolls).toFixed(3),
      hint: 'Established points per roll'
    },
    {
      title: 'Average shooter',
      value: (state.stats.totalRolls / Math.max(1, state.stats.totalShooters)).toFixed(2),
      hint: 'Rolls per shooter'
    }
  ];
}

export function exportBatchCsv(batch: BatchResult) {
  const rows = ['session,totalRolls,avgShooterLength,longestShooter,sevenOuts'];
  for (const row of batch.rows) {
    rows.push([row.session, row.totalRolls, row.avgShooterLength, row.longestShooter, row.sevenOuts].join(','));
  }
  return rows.join('\n');
}
