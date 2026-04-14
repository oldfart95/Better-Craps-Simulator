import { GameState } from '../../engine/types';

const seatClass = ['top', 'top-right', 'bottom-right', 'bottom', 'bottom-left', 'top-left'];

export function SeatRail({ state }: { state: GameState }) {
  return (
    <div className="seat-rail">
      {state.players.map((player, index) => {
        const shooter = index === state.shooterIndex;
        const totalAtRisk = player.bets.reduce((sum, bet) => sum + bet.amount, 0);
        return (
          <article className={`seat-card ${seatClass[index] ?? 'top'}`} key={player.id}>
            <div className="seat-card__head">
              <strong>{player.name}</strong>
              <span>{player.kind === 'human' ? 'Hero' : player.archetype.replace(/_/g, ' ')}</span>
            </div>
            <div className="seat-card__stack">${player.bankroll.toFixed(0)}</div>
            <div className="seat-card__meta">
              <span className={shooter ? 'is-shooter' : ''}>{shooter ? 'Shooter' : 'Waiting'}</span>
              <span>{player.bets.length} bets</span>
              <span>{totalAtRisk ? `$${totalAtRisk}` : 'Flat'}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
