import { RNG } from './rng';
import { RollResult } from './types';

export function rollDice(rng: RNG): RollResult {
  return rng.rollDice();
}

export function formatDice(roll: RollResult | null) {
  return roll ? `${roll.d1} + ${roll.d2}` : '-';
}
