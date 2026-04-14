import { CHIP_DENOMS, POINT_NUMBERS } from '../../engine/constants';
import { BetZone, GameState, PersistedPreferences } from '../../engine/types';
import { SeatRail } from '../components/SeatRail';

interface TableViewProps {
  state: GameState;
  zones: BetZone[];
  selectedZoneId: string;
  preferences: PersistedPreferences;
  coachPrompts: string[];
  compactStats: Array<{ label: string; value: string; hint: string }>;
  legalReason: string;
  autoRolling: boolean;
  onSelectZone: (zoneId: string) => void;
  onPlaceSelected: () => void;
  onRemoveSelected: () => void;
  onRoll: () => void;
  onReset: () => void;
  onPickChip: (amount: number) => void;
  onToggleAuto: () => void;
  onSetAutoRollMs: (value: number) => void;
  onSetCompactStatsExpanded: (expanded: boolean) => void;
  onAddOdds: (baseId: string) => void;
  onSeatPositionChange: (seatKey: string, position: { x: number; y: number }) => void;
  onResetSeatPositions: () => void;
  oddsTargets: Array<{ baseId: string; label: string; target: number | null }>;
}

export function TableView({
  state,
  zones,
  selectedZoneId,
  preferences,
  coachPrompts,
  compactStats,
  legalReason,
  autoRolling,
  onSelectZone,
  onPlaceSelected,
  onRemoveSelected,
  onRoll,
  onReset,
  onPickChip,
  onToggleAuto,
  onSetAutoRollMs,
  onSetCompactStatsExpanded,
  onAddOdds,
  onSeatPositionChange,
  onResetSeatPositions,
  oddsTargets
}: TableViewProps) {
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const hero = state.players[0];
  const selectedBets = hero.bets.filter((bet) => bet.type === selectedZone.type && bet.target === selectedZone.target);
  const totalSelected = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <div className="layout">
      <section className="table-shell">
        <header className="table-shell__header">
          <div>
            <p className="eyebrow">Live Table</p>
            <h2>Casino Felt Trainer</h2>
            <p className="subtle">Authentic board first, coaching second. Keep the layout clean and legal.</p>
          </div>
          <div className="header-actions">
            <button className="ghost" onClick={onResetSeatPositions}>Reset Seats</button>
            <button className="neutral" onClick={onReset}>New Session</button>
            <button className="accent" onClick={onRoll}>Roll Dice</button>
          </div>
        </header>

        <div className={`felt-shell point-${state.point ?? 'off'}`}>
          <div className="table-status">
            <div>
              <span className="status-label">Phase</span>
              <strong>{state.point === null ? 'Come-Out' : 'Point Cycle'}</strong>
            </div>
            <div>
              <span className="status-label">Point</span>
              <strong>{state.point ?? 'OFF'}</strong>
            </div>
            <div>
              <span className="status-label">Dice</span>
              <strong>{state.dice ? `${state.dice.d1} + ${state.dice.d2}` : '-'}</strong>
            </div>
            <div>
              <span className="status-label">Hero Bankroll</span>
              <strong>${hero.bankroll.toFixed(0)}</strong>
            </div>
          </div>

          <div className="puck-strip">
            {POINT_NUMBERS.map((point) => (
              <span className={`puck ${state.point === point ? 'active' : ''}`} key={point}>{point}</span>
            ))}
          </div>

          <div className="felt-board">
            <div className="odds-lane">
              {oddsTargets.length > 0 ? oddsTargets.map((item) => (
                <button className="odds-chip" key={item.baseId} onClick={() => onAddOdds(item.baseId)}>
                  Add odds: {item.label}
                </button>
              )) : <span className="ghost-note">Odds options appear here when a line or moved come bet qualifies.</span>}
            </div>

            <div className="zone-grid">
              {zones.map((zone) => {
                const zoneBets = hero.bets.filter((bet) => bet.type === zone.type && bet.target === zone.target);
                const active = zoneBets.length > 0;
                const count = zoneBets.reduce((sum, bet) => sum + bet.amount, 0);
                const selected = zone.id === selectedZoneId;
                return (
                  <button
                    className={`zone zone--${zone.layout} ${active ? 'active' : ''} ${selected ? 'selected' : ''} ${preferences.trainingHighlights ? 'training-highlight' : ''}`}
                    key={zone.id}
                    onClick={() => onSelectZone(zone.id)}
                  >
                    <span className="zone__label">{zone.label}</span>
                    <span className="zone__payout">{zone.payout}</span>
                    {active && <span className="zone__chips">${count}</span>}
                    {hero.bets.some((bet) => bet.type === 'odds' && (bet.target === zone.target || (zone.id === 'pass-line' && bet.target === state.point))) && (
                      <span className="zone__marker">Odds working</span>
                    )}
                  </button>
                );
              })}
            </div>

            <SeatRail state={state} positions={preferences.seatPositions} onPositionChange={onSeatPositionChange} />
          </div>
        </div>

        <div className="control-dock">
          <div className="chip-row">
            {CHIP_DENOMS.map((denom) => (
              <button
                className={preferences.chipDenom === denom ? 'active' : ''}
                key={denom}
                onClick={() => onPickChip(denom)}
              >
                ${denom}
              </button>
            ))}
          </div>
          <div className="control-dock__actions">
            <button className="accent" onClick={onPlaceSelected}>Place ${preferences.chipDenom}</button>
            <button className="neutral" disabled={selectedBets.length === 0} onClick={onRemoveSelected}>
              Remove {totalSelected ? `$${totalSelected}` : 'bet'}
            </button>
            <button className="neutral" onClick={onToggleAuto}>{autoRolling ? 'Stop Auto' : 'Auto Roll'}</button>
            <label className="speed-input">
              Speed
              <input
                type="range"
                min="300"
                max="1800"
                step="100"
                value={preferences.autoRollMs}
                onChange={(event) => onSetAutoRollMs(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="zone-brief">
            <h3>{selectedZone.label}</h3>
            <p>{selectedZone.hint}</p>
            <p className="zone-brief__status">{legalReason}</p>
          </div>
        </div>
      </section>

      <aside className="study-panel">
        <section className={`recap-card recap-card--${state.recap.tone}`}>
          <p className="eyebrow">Session Recap</p>
          <h3>{state.recap.title}</h3>
          <p>{state.recap.detail}</p>
          <strong>{state.recap.bankrollDelta >= 0 ? '+' : ''}{state.recap.bankrollDelta.toFixed(2)}</strong>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h3>Compact Study Stats</h3>
            <button className="ghost" onClick={() => onSetCompactStatsExpanded(!preferences.compactStatsExpanded)}>
              {preferences.compactStatsExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <div className="compact-stats">
            {compactStats.map((item) => (
              <article className="compact-stats__card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            ))}
          </div>
          {preferences.compactStatsExpanded && (
            <div className="expanded-stats">
              <div>Rolls: {state.stats.totalRolls}</div>
              <div>Shooters: {state.stats.totalShooters}</div>
              <div>Seven-outs: {state.stats.sevenOuts}</div>
              <div>Recent totals: {state.rollHistory.join(' · ') || '-'}</div>
            </div>
          )}
        </section>

        <section className="panel">
          <h3>Trainer Prompts</h3>
          <ul className="coach-list">
            {coachPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </section>

        <section className="panel">
          <h3>Latest Rolls</h3>
          <div className="log-list">
            {state.logs.slice(0, 6).map((log) => (
              <article className="log-card" key={log.id}>
                <strong>Roll {log.rollNumber}: {log.total}</strong>
                <div>{log.dice}</div>
                <small>{log.detail.join(' ') || log.summary}</small>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
