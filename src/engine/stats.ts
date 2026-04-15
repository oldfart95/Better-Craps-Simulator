import { BankrollHistoryEntry, BetType, GameState, PlayerState, PointNumber, RollLogEntry, RollResult, SessionStats } from './types';

export const pointZeros = (): Record<PointNumber, number> => ({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });

export function createSessionStats(): SessionStats {
  return {
    totalRolls: 0,
    totalShooters: 1,
    currentShooterLength: 0,
    longestShooter: 0,
    sevenOuts: 0,
    pointEstablished: pointZeros(),
    pointMade: pointZeros(),
    winByBet: {}
  };
}

export function createInitialBankrollEntry(bankroll: number): BankrollHistoryEntry {
  return { rollNumber: 0, bankroll, net: 0 };
}

export function recordBetNet(state: GameState, player: PlayerState, type: BetType, delta: number) {
  player.stats.byBetType[type] = (player.stats.byBetType[type] ?? 0) + delta;
  state.stats.winByBet[type] = (state.stats.winByBet[type] ?? 0) + delta;
}

export function recordRollStats(state: GameState, roll: RollResult) {
  state.dice = roll;
  state.stats.totalRolls += 1;
  state.stats.currentShooterLength += 1;
  state.rollHistory = [roll.total, ...state.rollHistory].slice(0, 120);
}

export function appendRollLog(state: GameState, entry: RollLogEntry) {
  state.logs = [entry, ...state.logs].slice(0, 160);
}

export function snapshotBankrolls(state: GameState) {
  for (const player of state.players) {
    player.bankrollHistory.push({
      rollNumber: state.stats.totalRolls,
      bankroll: Math.round(player.bankroll * 100) / 100,
      net: Math.round((player.bankroll - player.startingBankroll) * 100) / 100
    });
  }
}

export function createAdvancedStats(state: GameState) {
  const human = state.players[0];
  const distribution = Array.from({ length: 11 }, (_, index) => {
    const total = index + 2;
    return { total, count: state.rollHistory.filter((roll) => roll === total).length };
  });
  const pointEstablishedTotal = Object.values(state.stats.pointEstablished).reduce((sum, value) => sum + value, 0);
  const pointMadeTotal = Object.values(state.stats.pointMade).reduce((sum, value) => sum + value, 0);
  const bankrollValues = human.bankrollHistory.map((entry) => entry.bankroll);
  const peak = Math.max(...bankrollValues);
  const low = Math.min(...bankrollValues);

  return {
    rolls: state.stats.totalRolls,
    shooters: state.stats.totalShooters,
    sevenOutRate: state.stats.sevenOuts / Math.max(1, state.stats.totalRolls),
    pointConversion: pointMadeTotal / Math.max(1, pointEstablishedTotal),
    peak,
    low,
    drawdown: peak - low,
    byBetType: human.stats.byBetType,
    distribution
  };
}
