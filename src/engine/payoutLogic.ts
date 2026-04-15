import { PAYOUTS, POINT_NUMBERS } from './constants';
import { loseBet, payBet, pushBet } from './bankroll';
import { Bet, GameState, PlayerState, PointNumber, RollResult } from './types';

function findBaseBet(player: PlayerState, bet: Bet) {
  return player.bets.find((candidate) => candidate.id === bet.baseId);
}

function betOffOnComeout(state: GameState, bet: Bet) {
  return state.point === null && ['place', 'buy', 'lay', 'hard', 'big'].includes(bet.type) && !bet.worksOnComeout;
}

export function resolveBet(state: GameState, player: PlayerState, bet: Bet, roll: RollResult, detail: string[]) {
  const total = roll.total;
  const isComeout = state.point === null;
  const point = state.point;

  if (betOffOnComeout(state, bet)) return bet;

  if (bet.type === 'field') {
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      const multiplier = (PAYOUTS.field as Record<number | 'default', number>)[total] ?? PAYOUTS.field.default;
      const win = payBet(state, player, bet, multiplier);
      detail.push(`Field wins $${win.toFixed(2)}.`);
    } else {
      loseBet(state, player, bet);
    }
    return null;
  }

  if (bet.type === 'prop') {
    const won =
      (bet.target === 'any7' && total === 7) ||
      (bet.target === 'yo11' && total === 11) ||
      (bet.target === 'snake2' && total === 2) ||
      (bet.target === 'boxcars12' && total === 12);
    if (won && typeof bet.target === 'string') payBet(state, player, bet, PAYOUTS.props[bet.target]);
    else loseBet(state, player, bet);
    return null;
  }

  if (bet.type === 'pass') {
    if (isComeout && [7, 11].includes(total)) return payBet(state, player, bet, 1), null;
    if (isComeout && [2, 3, 12].includes(total)) return loseBet(state, player, bet), null;
    if (!isComeout && total === point) return payBet(state, player, bet, 1), null;
    if (!isComeout && total === 7) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'dontPass') {
    if (isComeout && [2, 3].includes(total)) return payBet(state, player, bet, 1), null;
    if (isComeout && total === 12) return pushBet(state, player, bet), null;
    if (isComeout && [7, 11].includes(total)) return loseBet(state, player, bet), null;
    if (!isComeout && total === 7) return payBet(state, player, bet, 1), null;
    if (!isComeout && total === point) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'come' || bet.type === 'dontCome') {
    if (bet.phase === 'active') {
      if (bet.type === 'come') {
        if ([7, 11].includes(total)) return payBet(state, player, bet, 1), null;
        if ([2, 3, 12].includes(total)) return loseBet(state, player, bet), null;
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`Come travels to ${total}.`);
        }
      } else {
        if ([2, 3].includes(total)) return payBet(state, player, bet, 1), null;
        if (total === 12) return pushBet(state, player, bet), null;
        if ([7, 11].includes(total)) return loseBet(state, player, bet), null;
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`Don't come travels to ${total}.`);
        }
      }
      return bet;
    }
    if (bet.type === 'come' && total === bet.target) return payBet(state, player, bet, 1), null;
    if (bet.type === 'come' && total === 7) return loseBet(state, player, bet), null;
    if (bet.type === 'dontCome' && total === 7) return payBet(state, player, bet, 1), null;
    if (bet.type === 'dontCome' && total === bet.target) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'odds') {
    const base = findBaseBet(player, bet);
    if (!base) return pushBet(state, player, bet), null;
    const target = (base.target ?? point) as PointNumber;
    const dark = base.type === 'dontPass' || base.type === 'dontCome';
    if (!dark && total === target) return payBet(state, player, bet, PAYOUTS.passOdds[target]), null;
    if (!dark && total === 7) return loseBet(state, player, bet), null;
    if (dark && total === 7) return payBet(state, player, bet, PAYOUTS.dontOdds[target]), null;
    if (dark && total === target) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'place') {
    if (total === bet.target) return payBet(state, player, bet, PAYOUTS.place[bet.target as PointNumber]), bet;
    if (total === 7) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'buy') {
    if (total === bet.target) return payBet(state, player, bet, PAYOUTS.buy[bet.target as 4 | 10]), bet;
    if (total === 7) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'lay') {
    if (total === 7) return payBet(state, player, bet, PAYOUTS.lay[bet.target as PointNumber]), bet;
    if (total === bet.target) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'big') {
    if (total === bet.target) return payBet(state, player, bet, PAYOUTS.big), bet;
    if (total === 7) return loseBet(state, player, bet), null;
    return bet;
  }

  if (bet.type === 'hard') {
    if (total === bet.target && roll.hard) return payBet(state, player, bet, PAYOUTS.hard[bet.target as 4 | 6 | 8 | 10]), bet;
    if (total === 7 || (total === bet.target && !roll.hard)) return loseBet(state, player, bet), null;
  }

  return bet;
}

export function resolveAllBets(state: GameState, roll: RollResult, detail: string[]) {
  for (const player of state.players) {
    player.bets = player.bets.flatMap((bet) => {
      const updated = resolveBet(state, player, bet, roll, detail);
      return updated ? [updated] : [];
    });
  }
}
