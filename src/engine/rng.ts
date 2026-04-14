import { RollResult } from './types';

export class RNG {
  private seed: number;

  constructor(seed = '') {
    this.seed = RNG.hashSeed(seed || `${Date.now()}`);
  }

  static hashSeed(input: string) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  rollDice(): RollResult {
    const d1 = this.int(1, 6);
    const d2 = this.int(1, 6);
    return { d1, d2, total: d1 + d2, hard: d1 === d2 };
  }
}
