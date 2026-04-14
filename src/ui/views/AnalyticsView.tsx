import { BatchResult, GameState } from '../../engine/types';

interface AnalyticsViewProps {
  state: GameState;
  cards: Array<{ title: string; value: string; hint: string }>;
  histogram: Array<{ total: number; count: number }>;
  batch: BatchResult | null;
  onRunBatch: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

export function AnalyticsView({ state, cards, histogram, batch, onRunBatch, onExportJson, onExportCsv }: AnalyticsViewProps) {
  return (
    <div className="single-view">
      <section className="panel panel--hero">
        <p className="eyebrow">Analytics</p>
        <h2>Review flow without turning the main table into a dashboard</h2>
        <p className="subtle">This room keeps the advanced diagnostics, batch studies, and export tools out of the primary felt view.</p>
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
          <h3>Point tracking</h3>
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
          <h3>Batch summary</h3>
          <div className="header-actions">
            <button className="neutral" disabled={!batch} onClick={onExportJson}>Export JSON</button>
            <button className="neutral" disabled={!batch} onClick={onExportCsv}>Export CSV</button>
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
          <p className="subtle">Run a batch study to generate exportable summaries and distribution baselines.</p>
        )}
      </section>
    </div>
  );
}
