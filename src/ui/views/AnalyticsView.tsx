import { useState } from 'react';
import { BatchResult, GameState, SessionTextureMetrics, StrategyComparisonRow, StrategyProfile } from '../../engine/types';
import { formatNetAmount } from '../../presentation/analytics';

interface AnalyticsViewProps {
  state: GameState;
  cards: Array<{ title: string; value: string; hint: string }>;
  histogram: Array<{ total: number; count: number }>;
  batch: BatchResult | null;
  texture: SessionTextureMetrics;
  comparisonRows: StrategyComparisonRow[];
  strategyProfiles: StrategyProfile[];
  onRunBatch: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportSessionCsv: () => void;
}

export function AnalyticsView({
  state,
  cards,
  histogram,
  batch,
  texture,
  comparisonRows,
  strategyProfiles,
  onRunBatch,
  onExportJson,
  onExportCsv,
  onExportSessionCsv
}: AnalyticsViewProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showTexture, setShowTexture] = useState(false);
  const [showStrategyHelp, setShowStrategyHelp] = useState(false);

  return (
    <div className="single-view">
      <section className="panel panel--hero">
        <p className="eyebrow">Analytics</p>
        <h2>Review flow without turning the main table into a dashboard</h2>
        <p className="subtle">This room keeps the advanced diagnostics, strategy study, and export tools out of the primary felt view.</p>
      </section>

      <div className="analytics-grid">
        {cards.map((card) => (
          <section className="panel stat-panel" key={card.title}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </section>
        ))}
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h3>Session study tools</h3>
            <p className="subtle">Open deeper comparison, context, and educational layers only when you want them.</p>
          </div>
          <div className="header-actions">
            <button className="neutral" onClick={() => setShowBreakdown((value) => !value)}>
              {showBreakdown ? 'Hide Strategy Breakdown' : 'Open Strategy Breakdown'}
            </button>
            <button className="neutral" onClick={() => setShowTexture((value) => !value)}>
              {showTexture ? 'Hide Session Texture' : 'Open Session Texture'}
            </button>
            <button className="ghost" onClick={() => setShowStrategyHelp((value) => !value)}>
              {showStrategyHelp ? 'Hide AI Strategy Help' : 'Learn AI Strategies'}
            </button>
          </div>
        </div>

        {(showBreakdown || showTexture || showStrategyHelp) && (
          <div className="analytics-drawer">
            {showBreakdown && (
              <section className="analytics-drawer__section">
                <div className="panel__head">
                  <h3>Current session strategy comparison</h3>
                  <span className="subtle">{state.players.length} tracked seats</span>
                </div>
                <div className="comparison-list">
                  {comparisonRows.map((row) => (
                    <article className="comparison-card" key={row.playerId}>
                      <div className="comparison-card__top">
                        <div>
                          <strong>#{row.rank} {row.playerName}</strong>
                          <span>{row.archetype}</span>
                        </div>
                        <div className={`comparison-net ${row.net >= 0 ? 'positive' : 'negative'}`}>{formatNetAmount(row.net)}</div>
                      </div>
                      <div className="comparison-card__grid">
                        <span>Start: ${row.startingBankroll.toFixed(0)}</span>
                        <span>End: ${row.endingBankroll.toFixed(0)}</span>
                        <span>Peak: ${row.peakBankroll.toFixed(0)}</span>
                        <span>Max drawdown: ${row.maxDrawdown.toFixed(0)}</span>
                        <span>Volatility: {row.volatilityTag}</span>
                      </div>
                      <p>{row.interpretation}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {showTexture && (
              <section className="analytics-drawer__section">
                <div className="panel__head">
                  <h3>Session texture</h3>
                  <span className="subtle">Context matters before we judge any one strategy.</span>
                </div>
                <div className="texture-grid">
                  <article><strong>{texture.totalRolls}</strong><span>Total rolls</span></article>
                  <article><strong>{texture.totalShooters}</strong><span>Total shooters</span></article>
                  <article><strong>{texture.averageRollsPerShooter}</strong><span>Average rolls per shooter</span></article>
                  <article><strong>{texture.longestHeater}</strong><span>Longest heater</span></article>
                  <article><strong>{texture.sevenOutRate}</strong><span>Seven-out rate</span></article>
                  <article><strong>{texture.pointConversionRate}</strong><span>Point conversion rate</span></article>
                  <article><strong>{texture.shooterRhythm}</strong><span>Shooter rhythm</span></article>
                  <article><strong>{texture.tablePressure}</strong><span>Table pressure</span></article>
                </div>
                <p className="rule-note">{texture.varianceNote}</p>
              </section>
            )}

            {showStrategyHelp && (
              <section className="analytics-drawer__section">
                <div className="panel__head">
                  <h3>AI archetype quick guide</h3>
                  <span className="subtle">Plain-English notes for the seats you are comparing.</span>
                </div>
                <div className="strategy-profile-grid">
                  {strategyProfiles.map((profile) => (
                    <article className="strategy-profile-card" key={profile.key}>
                      <div className="strategy-profile-card__head">
                        <div>
                          <strong>{profile.name}</strong>
                          <span>{profile.summary}</span>
                        </div>
                        <div className="strategy-badges">
                          <span>{profile.style}</span>
                          <span>{profile.tablePreference} tables</span>
                          <span>{profile.volatility} volatility</span>
                        </div>
                      </div>
                      <p>{profile.howItPlays}</p>
                      <p><strong>Trying to accomplish:</strong> {profile.goal}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      <div className="analytics-layout">
        <section className="panel">
          <div className="panel__head">
            <h3>Recent total distribution</h3>
            <button className="accent" onClick={onRunBatch}>Run batch study</button>
          </div>
          <div className="histogram">
            {histogram.map((bar) => (
              <div className="histogram__bar" key={bar.total}>
                <span>{bar.total}</span>
                <div style={{ height: `${Math.max(8, bar.count * 14)}px` }} />
                <strong>{bar.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h3>Point tracking</h3>
            <button className="neutral" onClick={onExportSessionCsv}>Export live session CSV set</button>
          </div>
          <div className="point-grid">
            {Object.entries(state.stats.pointMade).map(([point, made]) => (
              <article key={point}>
                <strong>{point}</strong>
                <span>Made: {made}</span>
                <span>Set: {state.stats.pointEstablished[Number(point) as 4 | 5 | 6 | 8 | 9 | 10]}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h3>Batch study export</h3>
            <p className="subtle">Separate from the current live session. Use this for multi-session baselines and distribution studies.</p>
          </div>
          <div className="header-actions">
            <button className="neutral" disabled={!batch} onClick={onExportJson}>Export batch JSON</button>
            <button className="neutral" disabled={!batch} onClick={onExportCsv}>Export batch CSV</button>
          </div>
        </div>
        {batch ? (
          <>
            <div className="batch-summary">
              <div>Sessions: {batch.summary.sessions}</div>
              <div>Average rolls: {batch.summary.averageRolls}</div>
              <div>Average shooter length: {batch.summary.averageShooterLength}</div>
              <div>Longest shooter: {batch.summary.longestShooter}</div>
              <div>Seven-out rate: {batch.summary.sevenOutRate}</div>
            </div>
            <div className="batch-table">
              {batch.rows.slice(0, 12).map((row) => (
                <article key={row.session}>
                  <strong>Session {row.session}</strong>
                  <span>{row.totalRolls} rolls</span>
                  <span>{row.avgShooterLength} avg shooter</span>
                  <span>{row.sevenOuts} seven-outs</span>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="subtle">Run a batch study to generate exportable multi-session summaries and distribution baselines.</p>
        )}
      </section>
    </div>
  );
}
