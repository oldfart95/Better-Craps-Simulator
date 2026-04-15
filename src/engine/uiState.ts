import { BET_ZONES } from './constants';
import { BetPlacementInput, GameState } from './types';
import { describePhase } from './shooterFlow';
import { getLegalActionSet } from './legalBets';

export function buildUiExplanation(state: GameState, playerId: string, chipDenom: number, zoneId: string) {
  const zone = BET_ZONES.find((candidate) => candidate.id === zoneId) ?? BET_ZONES[0];
  const input: BetPlacementInput = { type: zone.type, amount: chipDenom, target: zone.target };
  const legal = getLegalActionSet(state, playerId, input);
  return {
    zone,
    phase: describePhase(state),
    legal,
    reason: legal.ok ? `${zone.label} can be placed now.` : legal.reason
  };
}
