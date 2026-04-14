import { AI_ARCHETYPES } from '../engine/constants';
import { BatchResult, CsvDownload, GameState, StrategyComparisonRow, SessionTextureMetrics, BetType } from '../engine/types';
import { strategyProfiles } from '../training/strategies';

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatCurrency(value: number) {
  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  return [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\n');
}

function getArchetypeLabel(archetype: string) {
  if (archetype === 'human') return 'Manual / Human';
  return AI_ARCHETYPES[archetype as keyof typeof AI_ARCHETYPES]?.label ?? archetype.replace(/_/g, ' ');
}

function getMaxDrawdown(bankrolls: number[]) {
  let peak = bankrolls[0] ?? 0;
  let maxDrawdown = 0;
  for (const bankroll of bankrolls) {
    peak = Math.max(peak, bankroll);
    maxDrawdown = Math.max(maxDrawdown, peak - bankroll);
  }
  return round(maxDrawdown);
}

function getVolatilityTag(startingBankroll: number, maxDrawdown: number): StrategyComparisonRow['volatilityTag'] {
  const ratio = startingBankroll <= 0 ? 0 : maxDrawdown / startingBankroll;
  if (ratio >= 0.3) return 'Swingy';
  if (ratio >= 0.15) return 'Balanced';
  return 'Steady';
}

function getShooterRhythmLabel(averageRollsPerShooter: number) {
  if (averageRollsPerShooter >= 8.5) return 'Long-running';
  if (averageRollsPerShooter >= 5.5) return 'Balanced';
  return 'Choppy';
}

function getTablePressureLabel(sevenOutRate: number) {
  if (sevenOutRate >= 0.19) return 'Heavy';
  if (sevenOutRate >= 0.15) return 'Moderate';
  return 'Light';
}

function buildInterpretation(archetype: string, metrics: SessionTextureMetrics, net: number) {
  if (archetype === 'human') {
    return 'Manual seat. Use the texture panel to separate decision quality from short-term variance.';
  }

  const profile = strategyProfiles[archetype as keyof typeof strategyProfiles];
  if (!profile) {
    return net >= 0 ? 'Finished ahead in this session.' : 'Finished behind in this session.';
  }

  if (profile.tablePreference === 'Hot' && metrics.shooterRhythm === 'Long-running') {
    return net >= 0 ? 'This session gave its hot-table bias room to breathe.' : 'The table stayed lively, but the timing still worked against it.';
  }
  if (profile.tablePreference === 'Cold' && metrics.shooterRhythm === 'Choppy') {
    return net >= 0 ? 'The hand lengths fit a colder-table profile.' : 'Even a colder rhythm did not line up cleanly with this seat.';
  }
  if (profile.style === 'Broad-coverage') {
    return 'Frequent action can look strong here, but broad coverage often pays more to stay involved.';
  }
  if (profile.style === 'Number-hunting') {
    return 'This result was heavily shaped by whether repeating box numbers showed up before the seven.';
  }
  return net >= 0 ? 'This seat handled the session texture well.' : 'This seat ran into the wrong side of session variance.';
}

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
  const averageShooter = state.stats.totalRolls / Math.max(1, state.stats.totalShooters);
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
      title: 'Shooter rhythm',
      value: averageShooter.toFixed(2),
      hint: getShooterRhythmLabel(averageShooter)
    }
  ];
}

export function createSessionTextureMetrics(state: GameState): SessionTextureMetrics {
  const totalRolls = state.stats.totalRolls;
  const totalShooters = state.stats.totalShooters;
  const averageRollsPerShooter = totalRolls / Math.max(1, totalShooters);
  const longestHeater = Math.max(state.stats.longestShooter, state.stats.currentShooterLength);
  const pointEstablishedTotal = Object.values(state.stats.pointEstablished).reduce((sum, value) => sum + value, 0);
  const pointMadeTotal = Object.values(state.stats.pointMade).reduce((sum, value) => sum + value, 0);
  const sevenOutRate = state.stats.sevenOuts / Math.max(1, totalRolls);
  const recentSevenRate = state.rollHistory.filter((roll) => roll === 7).length / Math.max(1, state.rollHistory.length);
  const shooterRhythm = getShooterRhythmLabel(averageRollsPerShooter);
  const tablePressure = getTablePressureLabel(sevenOutRate);

  return {
    totalRolls,
    totalShooters,
    averageRollsPerShooter: round(averageRollsPerShooter),
    longestHeater,
    sevenOuts: state.stats.sevenOuts,
    sevenOutRate: round(sevenOutRate, 3),
    recentSevenRate: round(recentSevenRate, 3),
    pointEstablishedTotal,
    pointMadeTotal,
    pointConversionRate: round(pointMadeTotal / Math.max(1, pointEstablishedTotal), 3),
    shooterRhythm,
    tablePressure,
    varianceNote:
      'Short sessions can flatter or punish a strategy. Heater length, seven-out clustering, and shooter rhythm can distort results long before the underlying approach has really proved anything.'
  };
}

export function createStrategyComparisonRows(state: GameState): StrategyComparisonRow[] {
  const texture = createSessionTextureMetrics(state);
  const rows = state.players.map((player) => {
    const bankrolls = player.bankrollHistory.map((entry) => entry.bankroll);
    const peakBankroll = round(Math.max(...bankrolls));
    const maxDrawdown = getMaxDrawdown(bankrolls);
    const net = round(player.bankroll - player.startingBankroll);
    return {
      playerId: player.id,
      playerName: player.name,
      archetype: getArchetypeLabel(player.archetype),
      startingBankroll: player.startingBankroll,
      endingBankroll: round(player.bankroll),
      net,
      peakBankroll,
      maxDrawdown,
      rank: 0,
      volatilityTag: getVolatilityTag(player.startingBankroll, maxDrawdown),
      interpretation: buildInterpretation(player.archetype, texture, net)
    };
  });

  return rows
    .sort((left, right) => right.endingBankroll - left.endingBankroll)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function exportBatchCsv(batch: BatchResult) {
  return toCsv(
    ['session', 'totalRolls', 'avgShooterLength', 'longestShooter', 'sevenOuts'],
    batch.rows.map((row) => [row.session, row.totalRolls, row.avgShooterLength, row.longestShooter, row.sevenOuts])
  );
}

export function createSessionExportFiles(state: GameState): CsvDownload[] {
  const texture = createSessionTextureMetrics(state);
  const comparison = createStrategyComparisonRows(state);
  const betTypes: BetType[] = ['pass', 'dontPass', 'come', 'dontCome', 'odds', 'field', 'place', 'buy', 'lay', 'big', 'hard', 'prop'];

  const summaryRows: Array<Array<string | number>> = [
    ['metadata', 'seed', state.seed || 'random'],
    ['metadata', 'startedAt', state.startedAt],
    ['metadata', 'tableMin', state.rules.tableMin],
    ['metadata', 'tableMax', state.rules.tableMax],
    ['metadata', 'startingBankroll', state.rules.startingBankroll],
    ['metadata', 'placeWorkOnComeout', state.rules.placeWorkOnComeout ? 'true' : 'false'],
    ['table', 'totalRolls', texture.totalRolls],
    ['table', 'totalShooters', texture.totalShooters],
    ['table', 'averageRollsPerShooter', texture.averageRollsPerShooter],
    ['table', 'longestHeater', texture.longestHeater],
    ['table', 'sevenOuts', texture.sevenOuts],
    ['table', 'sevenOutRate', texture.sevenOutRate],
    ['table', 'pointEstablishedTotal', texture.pointEstablishedTotal],
    ['table', 'pointMadeTotal', texture.pointMadeTotal],
    ['table', 'pointConversionRate', texture.pointConversionRate],
    ['table', 'shooterRhythm', texture.shooterRhythm],
    ['table', 'tablePressure', texture.tablePressure],
    ['note', 'variance', texture.varianceNote]
  ];

  for (const [point, count] of Object.entries(state.stats.pointEstablished)) {
    summaryRows.push(['pointEstablished', point, count]);
  }
  for (const [point, count] of Object.entries(state.stats.pointMade)) {
    summaryRows.push(['pointMade', point, count]);
  }

  const playerSummaryHeaders = [
    'playerName',
    'archetype',
    'startingBankroll',
    'endingBankroll',
    'net',
    'wins',
    'losses',
    'peakBankroll',
    'maxDrawdown',
    'rank',
    'volatilityTag',
    'interpretation',
    ...betTypes.map((type) => `net_${type}`)
  ];

  const playerSummaryRows = comparison.map((row) => {
    const player = state.players.find((candidate) => candidate.id === row.playerId)!;
    return [
      row.playerName,
      row.archetype,
      row.startingBankroll,
      row.endingBankroll,
      row.net,
      player.stats.wins,
      player.stats.losses,
      row.peakBankroll,
      row.maxDrawdown,
      row.rank,
      row.volatilityTag,
      row.interpretation,
      ...betTypes.map((type) => round(player.stats.byBetType[type] ?? 0))
    ];
  });

  const rollLogRows = [...state.logs]
    .reverse()
    .map((log) => [
      log.rollNumber,
      log.dice,
      log.total,
      log.shooter,
      log.pointBefore ?? 'OFF',
      log.pointAfter ?? 'OFF',
      log.summary,
      log.detail.join(' | ')
    ]);

  const bankrollTimelineRows = state.players.flatMap((player) =>
    player.bankrollHistory.map((entry) => [
      entry.rollNumber,
      player.name,
      getArchetypeLabel(player.archetype),
      entry.bankroll,
      entry.net
    ])
  );

  return [
    {
      filename: 'craps-session-summary.csv',
      content: toCsv(['section', 'metric', 'value'], summaryRows)
    },
    {
      filename: 'craps-player-summary.csv',
      content: toCsv(playerSummaryHeaders, playerSummaryRows)
    },
    {
      filename: 'craps-roll-log.csv',
      content: toCsv(['rollNumber', 'dice', 'total', 'shooter', 'pointBefore', 'pointAfter', 'summary', 'detailNotes'], rollLogRows)
    },
    {
      filename: 'craps-bankroll-timeline.csv',
      content: toCsv(['rollNumber', 'player', 'archetype', 'bankrollAfterRoll', 'netAfterRoll'], bankrollTimelineRows)
    }
  ];
}

export function formatNetAmount(value: number) {
  return formatCurrency(value);
}
