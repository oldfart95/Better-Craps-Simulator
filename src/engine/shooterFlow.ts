import { POINT_NUMBERS } from './constants';
import { GameState, PointNumber, RollResult } from './types';

export function isComeOut(state: GameState) {
  return state.point === null;
}

export function describePhase(state: GameState) {
  if (state.point === null) {
    return 'Come-out roll: line bets are starting, and a 4/5/6/8/9/10 establishes the point.';
  }
  return `Point ${state.point} is on: pass/come-side bets want the point before 7; dark-side bets want 7 first.`;
}

export function rotateShooter(state: GameState) {
  state.stats.longestShooter = Math.max(state.stats.longestShooter, state.stats.currentShooterLength);
  state.stats.currentShooterLength = 0;
  state.shooterIndex = (state.shooterIndex + 1) % state.players.length;
  state.stats.totalShooters += 1;
  state.point = null;
}

export function applyPointState(state: GameState, roll: RollResult, detail: string[]) {
  if (state.point === null && POINT_NUMBERS.includes(roll.total as PointNumber)) {
    const nextPoint = roll.total as PointNumber;
    state.point = nextPoint;
    state.stats.pointEstablished[nextPoint] += 1;
    detail.push(`Point is set to ${nextPoint}.`);
    return;
  }

  if (state.point !== null && roll.total === state.point) {
    state.stats.pointMade[state.point] += 1;
    detail.push(`Point ${state.point} made. Back to the come-out.`);
    state.point = null;
    return;
  }

  if (state.point !== null && roll.total === 7) {
    state.stats.sevenOuts += 1;
    detail.push('Seven-out. Shooter changes and the puck turns off.');
    rotateShooter(state);
  }
}
