import { POINT_NUMBERS } from './constants';
import { clampAmount } from './bankroll';
import { BetPlacementInput, BetTarget, BetType, GameState, LegalActionSet, PointNumber } from './types';

export function findExistingBet(state: GameState, playerId: string, type: BetType, target: BetTarget, baseId: string | null) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  return player?.bets.find((bet) => bet.type === type && bet.target === target && bet.baseId === baseId);
}

export function explainUnavailable(state: GameState, input: BetPlacementInput) {
  const point = state.point;
  if (input.type === 'pass' || input.type === 'dontPass') return point === null ? '' : 'Line bets start only on the come-out.';
  if (input.type === 'come' || input.type === 'dontCome') return point === null ? 'Come and don\'t come need a point already on.' : '';
  if (input.type === 'odds') return point === null ? 'Odds need a point or a moved come/don\'t come bet.' : '';
  if (input.type === 'place' && !POINT_NUMBERS.includes(input.target as PointNumber)) return 'Place bets must target 4, 5, 6, 8, 9, or 10.';
  if (input.type === 'prop' && !state.rules.propBetsEnabled) return 'Proposition bets are disabled in this setup.';
  return '';
}

export function getLegalActionSet(state: GameState, playerId: string, input: BetPlacementInput): LegalActionSet {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: 'Player not found.' };
  const amount = clampAmount(input.amount, state);

  if (!state.rules.freePractice && player.bankroll < amount) {
    return { ok: false, reason: 'Not enough bankroll for that chip size.' };
  }

  const unavailable = explainUnavailable(state, input);
  if (unavailable) return { ok: false, reason: unavailable };

  switch (input.type) {
    case 'big':
      if (![6, 8].includes(input.target as number)) return { ok: false, reason: 'Big 6/8 only targets 6 or 8.' };
      if (!state.rules.big68Enabled) return { ok: false, reason: 'Big 6/8 is disabled.' };
      break;
    case 'hard':
      if (![4, 6, 8, 10].includes(input.target as number)) return { ok: false, reason: 'Hardways must target 4, 6, 8, or 10.' };
      break;
    case 'buy':
      if (![4, 10].includes(input.target as number)) return { ok: false, reason: 'Buy bets in this trainer focus on 4 and 10.' };
      break;
    case 'lay':
      if (!POINT_NUMBERS.includes(input.target as PointNumber)) return { ok: false, reason: 'Lay bets need a box number target.' };
      break;
    case 'odds': {
      if (!input.baseId) return { ok: false, reason: 'Odds must attach to a line or moved come bet.' };
      const base = player.bets.find((bet) => bet.id === input.baseId);
      if (!base) return { ok: false, reason: 'Base bet not found.' };
      if ((base.type === 'come' || base.type === 'dontCome') && base.phase !== 'moved') {
        return { ok: false, reason: 'Come odds must wait until the bet travels to a number.' };
      }
      const target = (base.target ?? state.point) as PointNumber | null;
      if (!target) return { ok: false, reason: 'Odds require a point or moved come bet.' };
      const maxOdds = state.rules.maxOddsMultiplier[target] * base.amount;
      if (amount > maxOdds) return { ok: false, reason: `Odds max is $${maxOdds}.` };
      break;
    }
    default:
      break;
  }

  const duplicate = findExistingBet(state, playerId, input.type, input.target ?? null, input.baseId ?? null);
  if (duplicate && input.type !== 'field' && input.type !== 'prop') {
    return { ok: false, reason: 'That wager is already working.' };
  }

  return { ok: true, reason: 'Legal now.' };
}
