import { Bet, GameState, PlayerState } from './types';
import { recordBetNet } from './stats';

export function clampAmount(amount: number, state: GameState) {
  if (state.rules.freePractice) return Math.max(1, Math.round(amount));
  return Math.max(state.rules.tableMin, Math.min(state.rules.tableMax, Math.round(amount)));
}

export function reserveBet(player: PlayerState, bet: Bet, state: GameState) {
  if (!state.rules.freePractice) {
    player.bankroll -= bet.amount;
  }
}

export function payBet(state: GameState, player: PlayerState, bet: Bet, multiplier: number) {
  const win = Math.round(bet.amount * multiplier * 100) / 100;
  if (!state.rules.freePractice) {
    player.bankroll += bet.amount + win;
  }
  player.stats.net += win;
  player.stats.wins += 1;
  recordBetNet(state, player, bet.type, win);
  return win;
}

export function loseBet(state: GameState, player: PlayerState, bet: Bet) {
  player.stats.net -= bet.amount;
  player.stats.losses += 1;
  recordBetNet(state, player, bet.type, -bet.amount);
}

export function pushBet(state: GameState, player: PlayerState, bet: Bet) {
  if (!state.rules.freePractice) {
    player.bankroll += bet.amount;
  }
}
