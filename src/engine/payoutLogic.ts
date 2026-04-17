import { PAYOUTS, POINT_NUMBERS } from './constants';
import { loseBet, payBet, pushBet } from './bankroll';
import { Bet, BetResolutionRecord, GameState, PlayerState, PointNumber, RollResult } from './types';

function findBaseBet(player: PlayerState, bet: Bet) {
  return player.bets.find((candidate) => candidate.id === bet.baseId);
}

function betOffOnComeout(state: GameState, bet: Bet) {
  return state.point === null && ['place', 'buy', 'lay', 'hard', 'big'].includes(bet.type) && !bet.worksOnComeout;
}

function createResolution(
  player: PlayerState,
  bet: Bet,
  outcome: BetResolutionRecord['outcome'],
  payout: number,
  bankrollDelta: number,
  note: string
): BetResolutionRecord {
  return {
    playerId: player.id,
    playerName: player.name,
    betId: bet.id,
    betType: bet.type,
    target: bet.target,
    outcome,
    amount: bet.amount,
    payout,
    bankrollDelta,
    note
  };
}

function keepBet(player: PlayerState, bet: Bet, note: string) {
  return { bet, resolution: createResolution(player, bet, 'kept', 0, 0, note) };
}

function winBet(state: GameState, player: PlayerState, bet: Bet, multiplier: number, note: string, keep = false) {
  const payout = payBet(state, player, bet, multiplier);
  const bankrollDelta = state.rules.freePractice ? 0 : bet.amount + payout;
  return {
    bet: keep ? bet : null,
    resolution: createResolution(player, bet, 'win', payout, bankrollDelta, note)
  };
}

function loseResolvedBet(state: GameState, player: PlayerState, bet: Bet, note: string) {
  loseBet(state, player, bet);
  return {
    bet: null,
    resolution: createResolution(player, bet, 'lose', 0, 0, note)
  };
}

function pushResolvedBet(state: GameState, player: PlayerState, bet: Bet, note: string) {
  pushBet(state, player, bet);
  const bankrollDelta = state.rules.freePractice ? 0 : bet.amount;
  return {
    bet: null,
    resolution: createResolution(player, bet, 'push', 0, bankrollDelta, note)
  };
}

export function resolveBet(state: GameState, player: PlayerState, bet: Bet, roll: RollResult, detail: string[]) {
  const total = roll.total;
  const isComeout = state.point === null;
  const point = state.point;

  if (betOffOnComeout(state, bet)) return keepBet(player, bet, `${bet.type} is off on the come-out.`);

  if (bet.type === 'field') {
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      const multiplier = (PAYOUTS.field as Record<number | 'default', number>)[total] ?? PAYOUTS.field.default;
      const result = winBet(state, player, bet, multiplier, `Field wins on ${total}.`);
      detail.push(`Field wins $${result.resolution.payout.toFixed(2)}.`);
      return result;
    }
    return loseResolvedBet(state, player, bet, `Field loses on ${total}.`);
  }

  if (bet.type === 'prop') {
    const won =
      (bet.target === 'any7' && total === 7) ||
      (bet.target === 'yo11' && total === 11) ||
      (bet.target === 'snake2' && total === 2) ||
      (bet.target === 'boxcars12' && total === 12);
    if (won && typeof bet.target === 'string') {
      return winBet(state, player, bet, PAYOUTS.props[bet.target], `Prop ${bet.target} hit.`);
    }
    return loseResolvedBet(state, player, bet, `Prop ${String(bet.target)} missed.`);
  }

  if (bet.type === 'pass') {
    if (isComeout && [7, 11].includes(total)) return winBet(state, player, bet, 1, `Pass wins on come-out ${total}.`);
    if (isComeout && [2, 3, 12].includes(total)) return loseResolvedBet(state, player, bet, `Pass loses on come-out ${total}.`);
    if (!isComeout && total === point) return winBet(state, player, bet, 1, `Pass wins by making point ${point}.`);
    if (!isComeout && total === 7) return loseResolvedBet(state, player, bet, 'Pass loses on seven-out.');
    return keepBet(player, bet, 'Pass remains working.');
  }

  if (bet.type === 'dontPass') {
    if (isComeout && [2, 3].includes(total)) return winBet(state, player, bet, 1, `Don't pass wins on come-out ${total}.`);
    if (isComeout && total === 12) return pushResolvedBet(state, player, bet, "Don't pass pushes on 12.");
    if (isComeout && [7, 11].includes(total)) return loseResolvedBet(state, player, bet, `Don't pass loses on come-out ${total}.`);
    if (!isComeout && total === 7) return winBet(state, player, bet, 1, "Don't pass wins on seven-out.");
    if (!isComeout && total === point) return loseResolvedBet(state, player, bet, `Don't pass loses when point ${point} is made.`);
    return keepBet(player, bet, "Don't pass remains working.");
  }

  if (bet.type === 'come' || bet.type === 'dontCome') {
    if (bet.phase === 'active') {
      if (bet.type === 'come') {
        if ([7, 11].includes(total)) return winBet(state, player, bet, 1, `Come wins on ${total}.`);
        if ([2, 3, 12].includes(total)) return loseResolvedBet(state, player, bet, `Come loses on ${total}.`);
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`Come travels to ${total}.`);
          return {
            bet,
            resolution: createResolution(player, bet, 'travel', 0, 0, `Come traveled to ${total}.`)
          };
        }
      } else {
        if ([2, 3].includes(total)) return winBet(state, player, bet, 1, `Don't come wins on ${total}.`);
        if (total === 12) return pushResolvedBet(state, player, bet, "Don't come pushes on 12.");
        if ([7, 11].includes(total)) return loseResolvedBet(state, player, bet, `Don't come loses on ${total}.`);
        if (POINT_NUMBERS.includes(total as PointNumber)) {
          bet.phase = 'moved';
          bet.target = total as PointNumber;
          detail.push(`Don't come travels to ${total}.`);
          return {
            bet,
            resolution: createResolution(player, bet, 'travel', 0, 0, `Don't come traveled to ${total}.`)
          };
        }
      }
      return keepBet(player, bet, `${bet.type === 'come' ? 'Come' : "Don't come"} stays in the active area.`);
    }
    if (bet.type === 'come' && total === bet.target) return winBet(state, player, bet, 1, `Come wins on ${bet.target}.`);
    if (bet.type === 'come' && total === 7) return loseResolvedBet(state, player, bet, 'Come loses on seven-out.');
    if (bet.type === 'dontCome' && total === 7) return winBet(state, player, bet, 1, "Don't come wins on seven-out.");
    if (bet.type === 'dontCome' && total === bet.target) return loseResolvedBet(state, player, bet, `Don't come loses on ${bet.target}.`);
    return keepBet(player, bet, `${bet.type === 'come' ? 'Come' : "Don't come"} remains on ${bet.target}.`);
  }

  if (bet.type === 'odds') {
    const base = findBaseBet(player, bet);
    if (!base) return pushResolvedBet(state, player, bet, 'Odds returned because the base bet no longer exists.');
    const target = (base.target ?? point) as PointNumber;
    const dark = base.type === 'dontPass' || base.type === 'dontCome';
    if (!dark && total === target) return winBet(state, player, bet, PAYOUTS.passOdds[target], `Odds win on ${target}.`);
    if (!dark && total === 7) return loseResolvedBet(state, player, bet, 'Odds lose on seven-out.');
    if (dark && total === 7) return winBet(state, player, bet, PAYOUTS.dontOdds[target], 'Dark-side odds win on seven-out.');
    if (dark && total === target) return loseResolvedBet(state, player, bet, `Dark-side odds lose on ${target}.`);
    return keepBet(player, bet, 'Odds remain attached.');
  }

  if (bet.type === 'place') {
    if (total === bet.target) return winBet(state, player, bet, PAYOUTS.place[bet.target as PointNumber], `Place ${bet.target} wins.`, true);
    if (total === 7) return loseResolvedBet(state, player, bet, `Place ${bet.target} loses on seven-out.`);
    return keepBet(player, bet, `Place ${bet.target} stays up.`);
  }

  if (bet.type === 'buy') {
    if (total === bet.target) return winBet(state, player, bet, PAYOUTS.buy[bet.target as 4 | 10], `Buy ${bet.target} wins.`, true);
    if (total === 7) return loseResolvedBet(state, player, bet, `Buy ${bet.target} loses on seven-out.`);
    return keepBet(player, bet, `Buy ${bet.target} stays up.`);
  }

  if (bet.type === 'lay') {
    if (total === 7) return winBet(state, player, bet, PAYOUTS.lay[bet.target as PointNumber], `Lay ${bet.target} wins on seven-out.`, true);
    if (total === bet.target) return loseResolvedBet(state, player, bet, `Lay ${bet.target} loses.`);
    return keepBet(player, bet, `Lay ${bet.target} stays up.`);
  }

  if (bet.type === 'big') {
    if (total === bet.target) return winBet(state, player, bet, PAYOUTS.big, `Big ${bet.target} wins.`, true);
    if (total === 7) return loseResolvedBet(state, player, bet, `Big ${bet.target} loses on seven-out.`);
    return keepBet(player, bet, `Big ${bet.target} stays up.`);
  }

  if (bet.type === 'hard') {
    if (total === bet.target && roll.hard) {
      return winBet(state, player, bet, PAYOUTS.hard[bet.target as 4 | 6 | 8 | 10], `Hard ${bet.target} wins.`, true);
    }
    if (total === 7 || (total === bet.target && !roll.hard)) {
      return loseResolvedBet(state, player, bet, `Hard ${bet.target} loses.`);
    }
  }

  return keepBet(player, bet, `${bet.type} remains unchanged.`);
}

export function resolveAllBets(state: GameState, roll: RollResult, detail: string[]) {
  const resolutions: BetResolutionRecord[] = [];

  for (const player of state.players) {
    const updatedBets: Bet[] = [];
    for (const bet of player.bets) {
      const result = resolveBet(state, player, bet, roll, detail);
      resolutions.push(result.resolution);
      if (result.bet) updatedBets.push(result.bet);
    }
    player.bets = updatedBets;
  }

  return resolutions;
}
