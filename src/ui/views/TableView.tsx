import { CHIP_DENOMS, POINT_NUMBERS } from '../../engine/constants';
import { BetZone, GameState, PersistedPreferences } from '../../engine/types';
import { formatDice } from '../../engine/diceEngine';

type AdvancedStats = {
  rolls: number;
  shooters: number;
  sevenOutRate: number;
  pointConversion: number;
  peak: number;
  low: number;
  drawdown: number;
  byBetType: Record<string, number | undefined>;
  distribution: Array<{ total: number; count: number }>;
};

interface TableViewProps {
  state: GameState;
  zones: BetZone[];
  selectedZoneId: string;
  preferences: PersistedPreferences;
  compactStats: Array<{ label: string; value: string; hint: string }>;
  coachPrompts: string[];
  uiExplanation: { zone: BetZone; phase: string; legal: { ok: boolean; reason: string }; reason: string };
  autoRolling: boolean;
  helpOpen: boolean;
  quickStatsOpen: boolean;
  advancedStatsOpen: boolean;
  advancedStats: AdvancedStats;
  oddsTargets: Array<{ baseId: string; label: string; target: number | null }>;
  onTapZone: (zoneId: string) => void;
  onSelectZone: (zoneId: string) => void;
  onRemoveSelected: () => void;
  onRoll: () => void;
  onNewSession: () => void;
  onPickChip: (amount: number) => void;
  onToggleAuto: () => void;
  onSetAutoRollMs: (value: number) => void;
  onToggleHighlights: () => void;
  onToggleBeginner: () => void;
  onToggleFreePractice: () => void;
  onSetHelpOpen: (open: boolean) => void;
  onSetQuickStatsOpen: (open: boolean) => void;
  onSetAdvancedStatsOpen: (open: boolean) => void;
  onAddOdds: (baseId: string) => void;
  onSeatPositionChange: (seatKey: string, position: { x: number; y: number }) => void;
  onResetSeatPositions: () => void;
}

const helpTopics = [
  ['Pass line', 'Wins 7/11 on come-out, loses 2/3/12, then wants the point before 7.'],
  ["Don't pass", 'Wins 2/3, pushes 12, loses 7/11 on come-out, then wants 7 before the point.'],
  ['Come / Don\'t come', 'A new line-style bet after a point is on. It travels to the next box number.'],
  ['Odds', 'A no-house-edge backing bet attached to pass, come, don\'t pass, or don\'t come.'],
  ['Field', 'One-roll bet on 2, 3, 4, 9, 10, 11, or 12. Other totals lose.'],
  ['Place bets', 'Number bets on 4/5/6/8/9/10. They win if the number repeats before 7.'],
  ['Point cycle', 'Come-out sets the point. After that, point wins for right-side bets; 7 ends the hand.']
];

export function TableView({
  state,
  zones,
  selectedZoneId,
  preferences,
  compactStats,
  coachPrompts,
  uiExplanation,
  autoRolling,
  helpOpen,
  quickStatsOpen,
  advancedStatsOpen,
  advancedStats,
  oddsTargets,
  onTapZone,
  onSelectZone,
  onRemoveSelected,
  onRoll,
  onNewSession,
  onPickChip,
  onToggleAuto,
  onSetAutoRollMs,
  onToggleHighlights,
  onToggleBeginner,
  onToggleFreePractice,
  onSetHelpOpen,
  onSetQuickStatsOpen,
  onSetAdvancedStatsOpen,
  onAddOdds,
  onSeatPositionChange,
  onResetSeatPositions
}: TableViewProps) {
  const hero = state.players[0];
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const selectedBets = hero.bets.filter((bet) => bet.type === selectedZone.type && bet.target === selectedZone.target);
  const totalSelected = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
  const maxDistribution = Math.max(1, ...advancedStats.distribution.map((entry) => entry.count));

  return (
    <>
      <header className="trainer-top">
        <div>
          <p className="eyebrow">Better Craps Simulator</p>
          <h1>Craps Felt Trainer</h1>
          <p className="tagline">Tap a chip, tap the felt, and learn the point cycle without real wagering.</p>
        </div>
        <div className="trainer-top__actions">
          <button className="icon-button" title="Help" onClick={() => onSetHelpOpen(true)}>?</button>
          <button className="neutral" onClick={() => onSetQuickStatsOpen(true)}>Stats</button>
          <button className="ghost" onClick={onNewSession}>New</button>
          <button className="accent" onClick={onRoll}>Roll</button>
        </div>
      </header>

      <main className="trainer-layout">
        <section className="felt-stage">
          <div className="felt-status">
            <article>
              <span>Phase</span>
              <strong>{state.point === null ? 'Come-Out' : `Point ${state.point}`}</strong>
            </article>
            <article>
              <span>Puck</span>
              <strong>{state.point ?? 'OFF'}</strong>
            </article>
            <article className="dice-readout">
              <span>Dice</span>
              <strong>{formatDice(state.dice)}</strong>
            </article>
            <article>
              <span>Bankroll</span>
              <strong>{preferences.freePractice ? 'Practice' : `$${hero.bankroll.toFixed(0)}`}</strong>
            </article>
          </div>

          <div className="felt-table" aria-label="Interactive craps felt">
            <div className="rail-wood" />
            <div className="puck-row">
              {POINT_NUMBERS.map((point) => (
                <span className={`puck ${state.point === point ? 'active' : ''}`} key={point}>{point}</span>
              ))}
            </div>

            {preferences.trainingHighlights && (
              <div className="training-ribbon">
                <strong>{uiExplanation.legal.ok ? 'Legal area' : 'Unavailable'}</strong>
                <span>{uiExplanation.reason}</span>
              </div>
            )}

            <div className="odds-lane">
              {oddsTargets.length > 0 ? oddsTargets.map((item) => (
                <button className="odds-chip" key={item.baseId} onClick={() => onAddOdds(item.baseId)}>
                  Odds {item.label}
                </button>
              )) : <span>Odds buttons appear after a line or moved come bet has a number.</span>}
            </div>

            <div className="zone-grid">
              {zones.map((zone) => {
                const zoneBets = hero.bets.filter((bet) => bet.type === zone.type && bet.target === zone.target);
                const amount = zoneBets.reduce((sum, bet) => sum + bet.amount, 0);
                const selected = zone.id === selectedZoneId;
                const isLegalSelected = selected && uiExplanation.legal.ok;
                return (
                  <button
                    className={`zone zone--${zone.layout} ${amount ? 'active' : ''} ${selected ? 'selected' : ''} ${preferences.trainingHighlights && isLegalSelected ? 'legal-glow' : ''}`}
                    key={zone.id}
                    onClick={() => onTapZone(zone.id)}
                    onMouseEnter={() => onSelectZone(zone.id)}
                    aria-label={`Place ${preferences.chipDenom} on ${zone.label}`}
                  >
                    <span className="zone__label">{zone.label}</span>
                    <span className="zone__payout">{zone.payout}</span>
                    {amount > 0 && <span className="chip-stack">${amount}</span>}
                  </button>
                );
              })}
            </div>

            <div className="seat-rail" aria-label="Player rail">
              {state.players.map((player, index) => {
                const shooter = index === state.shooterIndex;
                const totalAtRisk = player.bets.reduce((sum, bet) => sum + bet.amount, 0);
                return (
                  <article className={`seat-card ${shooter ? 'seat-card--shooter' : ''}`} key={player.id}>
                    <div className="seat-card__head">
                      <strong>{index === 0 ? 'You' : `Seat ${index + 1}`}</strong>
                      <span>{shooter ? 'Shooter' : 'Waiting'}</span>
                    </div>
                    <div className="seat-card__stack">${player.bankroll.toFixed(0)}</div>
                    <div className="seat-card__meta">
                      <span>{player.bets.length} bets</span>
                      <span>{totalAtRisk ? `$${totalAtRisk}` : 'Flat'}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="trainer-panel">
          <section className="chip-tray">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Selected Chip</p>
                <h2>${preferences.chipDenom}</h2>
              </div>
              <button className="ghost" onClick={onRemoveSelected} disabled={!totalSelected}>
                Remove {totalSelected ? `$${totalSelected}` : ''}
              </button>
            </div>
            <div className="chip-row">
              {CHIP_DENOMS.map((denom) => (
                <button className={`chip chip-${denom} ${preferences.chipDenom === denom ? 'active' : ''}`} key={denom} onClick={() => onPickChip(denom)}>
                  ${denom}
                </button>
              ))}
            </div>
            <p className="tap-instruction">Tap any felt area to place the selected chip. Hover or tap once to preview the trainer explanation.</p>
          </section>

          <section className={`recap-card recap-card--${state.recap.tone}`}>
            <p className="eyebrow">Current Read</p>
            <h3>{state.recap.title}</h3>
            <p>{state.recap.detail}</p>
          </section>

          <section className="panel trainer-explain">
            <p className="eyebrow">Trainer</p>
            <h3>{selectedZone.label}</h3>
            <p>{uiExplanation.phase}</p>
            <p className={uiExplanation.legal.ok ? 'good-text' : 'warn-text'}>{uiExplanation.reason}</p>
            {preferences.beginnerMode && (
              <ul>
                {coachPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
              </ul>
            )}
          </section>

          <section className="mode-panel">
            <button className={preferences.trainingHighlights ? 'active' : ''} onClick={onToggleHighlights}>Legal overlay</button>
            <button className={preferences.beginnerMode ? 'active' : ''} onClick={onToggleBeginner}>Beginner</button>
            <button className={preferences.freePractice ? 'active' : ''} onClick={onToggleFreePractice}>Free practice</button>
          </section>

          <section className="panel quick-strip">
            {compactStats.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            ))}
          </section>

          <section className="roll-controls">
            <button className="accent roll-button" onClick={onRoll}>Roll Dice</button>
            <button className="neutral" onClick={onToggleAuto}>{autoRolling ? 'Stop' : 'Auto'}</button>
            <label>
              Speed
              <input type="range" min="300" max="1800" step="100" value={preferences.autoRollMs} onChange={(event) => onSetAutoRollMs(Number(event.target.value))} />
            </label>
            <button className="ghost" onClick={() => onSetAdvancedStatsOpen(true)}>Advanced</button>
          </section>
        </aside>
      </main>

      <footer className="site-disclaimer">
        <strong>Educational disclaimer:</strong> no real money, no wagering, no gambling service. This trainer is for practice, rules learning, and math exploration only.
      </footer>

      {helpOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal">
            <div className="modal-head">
              <h2>Practical Craps Help</h2>
              <button className="icon-button" onClick={() => onSetHelpOpen(false)}>x</button>
            </div>
            <div className="help-grid">
              {helpTopics.map(([title, detail]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {quickStatsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal modal--small">
            <div className="modal-head">
              <h2>Quick Stats</h2>
              <button className="icon-button" onClick={() => onSetQuickStatsOpen(false)}>x</button>
            </div>
            <div className="quick-strip">
              {compactStats.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.hint}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {advancedStatsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal">
            <div className="modal-head">
              <h2>Advanced Stats</h2>
              <button className="icon-button" onClick={() => onSetAdvancedStatsOpen(false)}>x</button>
            </div>
            <div className="advanced-grid">
              <article><span>Rolls</span><strong>{advancedStats.rolls}</strong></article>
              <article><span>Shooters</span><strong>{advancedStats.shooters}</strong></article>
              <article><span>Seven-out rate</span><strong>{advancedStats.sevenOutRate.toFixed(3)}</strong></article>
              <article><span>Point conversion</span><strong>{advancedStats.pointConversion.toFixed(3)}</strong></article>
              <article><span>Peak bankroll</span><strong>${advancedStats.peak.toFixed(0)}</strong></article>
              <article><span>Max spread</span><strong>${advancedStats.drawdown.toFixed(0)}</strong></article>
            </div>
            <h3>Per-bet performance</h3>
            <div className="bet-performance">
              {Object.entries(advancedStats.byBetType).map(([type, value]) => (
                <article key={type}>
                  <span>{type}</span>
                  <strong>{(value ?? 0) >= 0 ? '+' : ''}{(value ?? 0).toFixed(2)}</strong>
                </article>
              ))}
            </div>
            <h3>Roll distribution</h3>
            <div className="histogram">
              {advancedStats.distribution.map((entry) => (
                <div className="histogram__bar" key={entry.total}>
                  <div style={{ height: `${Math.max(8, (entry.count / maxDistribution) * 120)}px` }} />
                  <strong>{entry.total}</strong>
                  <span>{entry.count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
