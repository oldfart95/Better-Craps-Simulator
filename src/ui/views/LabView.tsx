import { DEFAULT_RULES } from '../../engine/constants';

interface LabViewProps {
  seed: string;
  setSeed: (value: string) => void;
  tableMin: number;
  setTableMin: (value: number) => void;
  tableMax: number;
  setTableMax: (value: number) => void;
  bankroll: number;
  setBankroll: (value: number) => void;
  placeWorkOnComeout: boolean;
  setPlaceWorkOnComeout: (value: boolean) => void;
  onApply: () => void;
}

export function LabView(props: LabViewProps) {
  return (
    <div className="single-view">
      <section className="panel panel--hero">
        <p className="eyebrow">Strategy Lab</p>
        <h2>Session and table tuning</h2>
        <p className="subtle">Keep the board clean during play. Use this room to reshape the training assumptions.</p>
      </section>

      <div className="lab-grid">
        <section className="panel">
          <h3>Core setup</h3>
          <label>
            Seed
            <input value={props.seed} onChange={(event) => props.setSeed(event.target.value)} placeholder="Optional deterministic seed" />
          </label>
          <label>
            Starting bankroll
            <input type="number" value={props.bankroll} onChange={(event) => props.setBankroll(Number(event.target.value))} />
          </label>
          <label>
            Table minimum
            <input type="number" value={props.tableMin} onChange={(event) => props.setTableMin(Number(event.target.value))} />
          </label>
          <label>
            Table maximum
            <input type="number" value={props.tableMax} onChange={(event) => props.setTableMax(Number(event.target.value))} />
          </label>
        </section>

        <section className="panel">
          <h3>Rule posture</h3>
          <label className="checkbox-row">
            <input
              checked={props.placeWorkOnComeout}
              onChange={(event) => props.setPlaceWorkOnComeout(event.target.checked)}
              type="checkbox"
            />
            Place, buy, lay, hardways, and big bets work on the come-out.
          </label>
          <div className="rule-note">
            <strong>Default floor:</strong> min ${DEFAULT_RULES.tableMin}, max ${DEFAULT_RULES.tableMax}, 3x/4x/5x odds.
          </div>
          <button className="accent" onClick={props.onApply}>Apply and restart session</button>
        </section>
      </div>
    </div>
  );
}
