import { GameState, RollContextKind } from './types';

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

export function applyRollPhaseTransition(state: GameState, classification: RollContextKind, total: number, detail: string[]) {
  if (classification === 'point_established') {
    const nextPoint = total as keyof typeof state.stats.pointEstablished;
    state.point = nextPoint;
    state.stats.pointEstablished[nextPoint] += 1;
    detail.push(`Point is set to ${nextPoint}.`);
    return ['point_established'];
  }

  if (classification === 'point_made' && state.point !== null) {
    state.stats.pointMade[state.point] += 1;
    detail.push(`Point ${state.point} made. Back to the come-out.`);
    state.point = null;
    return ['point_made', 'point_cleared'];
  }

  if (classification === 'seven_out') {
    state.stats.sevenOuts += 1;
    detail.push('Seven-out. Shooter changes and the puck turns off.');
    rotateShooter(state);
    return ['seven_out', 'shooter_rotated', 'point_cleared'];
  }

  return classification === 'natural' || classification === 'craps' ? [classification] : [];
}
