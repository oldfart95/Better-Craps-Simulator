import { useEffect, useMemo, useRef, useState } from 'react';
import { createBatchResult, createInitialState, getBoardZones, getHumanBetForZone, getHumanPlayer, getLegalActionSet, getOddsTargetsForPlayer, placeBet, removeBet, advanceRoll } from './engine/gameEngine';
import { GameState, PersistedPreferences, SeatPosition, ViewKey } from './engine/types';
import { RNG } from './engine/rng';
import { createAnalyticsCards, createSessionExportFiles, createSessionTextureMetrics, createStrategyComparisonRows, exportBatchCsv, histogramFromRolls } from './presentation/analytics';
import { buildCoachPrompts, buildCompactStats } from './training/coach';
import { defaultPreferences, loadPreferences, savePreferences } from './utils/storage';
import { AnalyticsView } from './ui/views/AnalyticsView';
import { BookletView } from './ui/views/BookletView';
import { LabView } from './ui/views/LabView';
import { TableView } from './ui/views/TableView';
import { strategyProfileList } from './training/strategies';

const zones = getBoardZones();

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const rngRef = useRef(new RNG(''));
  const [view, setView] = useState<ViewKey>('table');
  const [preferences, setPreferences] = useState<PersistedPreferences>(() => loadPreferences());
  const [autoRolling, setAutoRolling] = useState(false);
  const [seed, setSeed] = useState('');
  const [tableMin, setTableMin] = useState(5);
  const [tableMax, setTableMax] = useState(500);
  const [bankroll, setBankroll] = useState(1000);
  const [placeWorkOnComeout, setPlaceWorkOnComeout] = useState(false);
  const [state, setState] = useState<GameState>(() =>
    createInitialState({
      seed: '',
      rules: { tableMin: 5, tableMax: 500, startingBankroll: 1000, placeWorkOnComeout: false }
    })
  );
  const [selectedZoneId, setSelectedZoneId] = useState('pass-line');
  const [batch, setBatch] = useState<ReturnType<typeof createBatchResult> | null>(null);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!autoRolling || view !== 'table') {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = structuredClone(current);
        advanceRoll(next, rngRef.current);
        return next;
      });
    }, preferences.autoRollMs);
    return () => window.clearInterval(timer);
  }, [autoRolling, preferences.autoRollMs, view]);

  const human = getHumanPlayer(state);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const legalReason = getLegalActionSet(state, human.id, {
    type: selectedZone.type,
    amount: preferences.chipDenom,
    target: selectedZone.target
  }).reason;

  const coachPrompts = useMemo(() => buildCoachPrompts(state), [state]);
  const compactStats = useMemo(() => buildCompactStats(state), [state]);
  const analyticsCards = useMemo(() => createAnalyticsCards(state), [state]);
  const histogram = useMemo(() => histogramFromRolls(state.rollHistory), [state.rollHistory]);
  const oddsTargets = useMemo(() => getOddsTargetsForPlayer(state, human.id), [state, human.id]);
  const sessionTexture = useMemo(() => createSessionTextureMetrics(state), [state]);
  const comparisonRows = useMemo(() => createStrategyComparisonRows(state), [state]);

  const rebuildSession = () => {
    rngRef.current = new RNG(seed);
    setState(
      createInitialState({
        seed,
        rules: {
          tableMin,
          tableMax,
          startingBankroll: bankroll,
          placeWorkOnComeout
        }
      })
    );
    setBatch(null);
    setAutoRolling(false);
  };

  const mutateState = (mutator: (draft: GameState) => void) => {
    setState((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const handlePlaceSelected = () => {
    mutateState((draft) => {
      const result = placeBet(draft, draft.players[0].id, {
        type: selectedZone.type,
        amount: preferences.chipDenom,
        target: selectedZone.target
      });
      if (!result.ok && 'reason' in result) {
        draft.recap = { title: 'Bet rejected', detail: result.reason, bankrollDelta: 0, tone: 'warn' };
      } else {
        draft.recap = { title: 'Bet placed', detail: `${selectedZone.label} is working for $${preferences.chipDenom}.`, bankrollDelta: 0, tone: 'good' };
      }
    });
  };

  const handleRemoveSelected = () => {
    const bet = getHumanBetForZone(state, selectedZone.id)[0];
    if (!bet) return;
    mutateState((draft) => {
      const removed = removeBet(draft, draft.players[0].id, bet.id);
      draft.recap = removed
        ? { title: 'Layout cleaned', detail: `${selectedZone.label} was removed and refunded.`, bankrollDelta: 0, tone: 'neutral' }
        : { title: 'Nothing changed', detail: 'No matching wager to remove.', bankrollDelta: 0, tone: 'neutral' };
    });
  };

  const handleRoll = () => {
    mutateState((draft) => {
      advanceRoll(draft, rngRef.current);
    });
  };

  const handleAddOdds = (baseId: string) => {
    mutateState((draft) => {
      const player = draft.players[0];
      const base = player.bets.find((bet) => bet.id === baseId);
      if (!base) return;
      const target = (base.target ?? draft.point) ?? null;
      if (typeof target !== 'number') return;
      const result = placeBet(draft, player.id, {
        type: 'odds',
        amount: Math.min(preferences.chipDenom, draft.rules.maxOddsMultiplier[target] * base.amount),
        baseId,
        target
      });
      if (!result.ok && 'reason' in result) {
        draft.recap = { title: 'Odds unavailable', detail: result.reason, bankrollDelta: 0, tone: 'warn' };
      }
    });
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Better Craps Simulator</p>
          <h1>Strategy Trainer</h1>
          <p className="tagline">Polished board-first practice with hidden-depth study tools.</p>
        </div>
        <nav className="top-bar__nav">
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Live Table</button>
          <button className={view === 'lab' ? 'active' : ''} onClick={() => setView('lab')}>Strategy Lab</button>
          <button className={view === 'booklet' ? 'active' : ''} onClick={() => setView('booklet')}>Booklet</button>
          <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}>Analytics</button>
        </nav>
      </header>

      {view === 'table' && (
        <TableView
          state={state}
          zones={zones}
          selectedZoneId={selectedZoneId}
          preferences={preferences}
          coachPrompts={coachPrompts}
          compactStats={compactStats}
          legalReason={legalReason}
          autoRolling={autoRolling}
          onSelectZone={setSelectedZoneId}
          onPlaceSelected={handlePlaceSelected}
          onRemoveSelected={handleRemoveSelected}
          onRoll={handleRoll}
          onReset={rebuildSession}
          onPickChip={(chipDenom) => setPreferences((current) => ({ ...current, chipDenom }))}
          onToggleAuto={() => setAutoRolling((current) => !current)}
          onSetAutoRollMs={(autoRollMs) => setPreferences((current) => ({ ...current, autoRollMs }))}
          onSetCompactStatsExpanded={(compactStatsExpanded) => setPreferences((current) => ({ ...current, compactStatsExpanded }))}
          onAddOdds={handleAddOdds}
          onSeatPositionChange={(seatKey, position: SeatPosition) =>
            setPreferences((current) => ({
              ...current,
              seatPositions: {
                ...current.seatPositions,
                [seatKey]: position
              }
            }))
          }
          onResetSeatPositions={() =>
            setPreferences((current) => ({
              ...current,
              seatPositions: defaultPreferences.seatPositions
            }))
          }
          oddsTargets={oddsTargets}
        />
      )}

      {view === 'lab' && (
        <LabView
          seed={seed}
          setSeed={setSeed}
          tableMin={tableMin}
          setTableMin={setTableMin}
          tableMax={tableMax}
          setTableMax={setTableMax}
          bankroll={bankroll}
          setBankroll={setBankroll}
          placeWorkOnComeout={placeWorkOnComeout}
          setPlaceWorkOnComeout={setPlaceWorkOnComeout}
          onApply={rebuildSession}
        />
      )}

      {view === 'booklet' && <BookletView />}

      {view === 'analytics' && (
        <AnalyticsView
          state={state}
          cards={analyticsCards}
          histogram={histogram}
          batch={batch}
          texture={sessionTexture}
          comparisonRows={comparisonRows}
          strategyProfiles={strategyProfileList}
          onRunBatch={() =>
            setBatch(
              createBatchResult({
                seed,
                rules: {
                  tableMin,
                  tableMax,
                  startingBankroll: bankroll,
                  placeWorkOnComeout
                }
              })
            )
          }
          onExportJson={() => batch && downloadText('craps-batch.json', JSON.stringify(batch, null, 2), 'application/json')}
          onExportCsv={() => batch && downloadText('craps-batch.csv', exportBatchCsv(batch), 'text/csv')}
          onExportSessionCsv={() => {
            for (const file of createSessionExportFiles(state)) {
              downloadText(file.filename, file.content, 'text/csv');
            }
          }}
        />
      )}

      <footer className="site-disclaimer">
        <strong>Disclaimer:</strong> This simulator is provided for entertainment and educational use only. It does not
        provide financial, gambling, or risk-management advice, makes no guarantee of outcomes, and use of the tool is
        entirely at your own discretion and responsibility.
      </footer>
    </div>
  );
}
