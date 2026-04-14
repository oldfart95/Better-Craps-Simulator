import { useRef } from 'react';
import { GameState, SeatPosition } from '../../engine/types';

interface SeatRailProps {
  state: GameState;
  positions: Record<string, SeatPosition>;
  onPositionChange: (seatKey: string, position: SeatPosition) => void;
}

export function SeatRail({ state, positions, onPositionChange }: SeatRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    seatKey: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);

  return (
    <div className="seat-rail" ref={railRef}>
      {state.players.map((player, index) => {
        const shooter = index === state.shooterIndex;
        const totalAtRisk = player.bets.reduce((sum, bet) => sum + bet.amount, 0);
        const seatKey = `${index}`;
        const position = positions[seatKey] ?? { x: 5, y: 5 };
        return (
          <article
            className="seat-card"
            key={player.id}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onPointerDown={(event) => {
              if (window.matchMedia('(max-width: 720px)').matches) return;
              const rect = event.currentTarget.getBoundingClientRect();
              dragRef.current = {
                seatKey,
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                height: rect.height
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const active = dragRef.current;
              const rail = railRef.current;
              if (!active || !rail || active.pointerId !== event.pointerId) return;
              const railRect = rail.getBoundingClientRect();
              const nextX = ((event.clientX - railRect.left - active.offsetX) / Math.max(1, railRect.width - active.width)) * 100;
              const nextY = ((event.clientY - railRect.top - active.offsetY) / Math.max(1, railRect.height - active.height)) * 100;
              onPositionChange(active.seatKey, {
                x: Math.max(0, Math.min(100, Number(nextX.toFixed(2)))),
                y: Math.max(0, Math.min(100, Number(nextY.toFixed(2))))
              });
            }}
            onPointerUp={(event) => {
              if (dragRef.current?.pointerId === event.pointerId) {
                dragRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
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
            <div className="seat-card__hint">Drag to reposition</div>
          </article>
        );
      })}
    </div>
  );
}
