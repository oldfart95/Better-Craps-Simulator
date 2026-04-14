import { CompactStat, GameState } from '../engine/types';

export function buildCoachPrompts(state: GameState) {
  const human = state.players[0];
  const hasPass = human.bets.some((bet) => bet.type === 'pass');
  const hasOdds = human.bets.some((bet) => bet.type === 'odds');
  const hasSixEight = [6, 8].every((target) => human.bets.some((bet) => bet.type === 'place' && bet.target === target));
  const point = state.point;

  if (point === null && !hasPass) {
    return ['Start with a pass line bet or set your dark-side posture before the come-out.'];
  }
  if (point !== null && hasPass && !hasOdds) {
    return [`Point ${point} is live. Consider backing your line bet with odds.`];
  }
  if (point !== null && !hasSixEight) {
    return ['The 6 and 8 are the cleanest place-bet anchors for a balanced right-side layout.'];
  }
  return ['Your board is legal. Roll or add selective pressure rather than cluttering the prop box.'];
}

export function buildCompactStats(state: GameState): CompactStat[] {
  const human = state.players[0];
  const averageShooter = state.stats.totalRolls / Math.max(1, state.stats.totalShooters);
  const recentSevens = state.rollHistory.filter((roll) => roll === 7).length;
  return [
    {
      label: 'Bankroll',
      value: `$${human.bankroll.toFixed(0)}`,
      hint: `${human.stats.net >= 0 ? '+' : ''}${human.stats.net.toFixed(2)} on session`
    },
    {
      label: 'Shooter rhythm',
      value: averageShooter.toFixed(2),
      hint: 'Average rolls per shooter'
    },
    {
      label: 'Table pressure',
      value: `${recentSevens}/${Math.max(1, state.rollHistory.length)}`,
      hint: 'Recent sevens in visible history'
    },
    {
      label: 'Longest heater',
      value: `${Math.max(state.stats.longestShooter, state.stats.currentShooterLength)}`,
      hint: 'Best shooter stretch'
    }
  ];
}
