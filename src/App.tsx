import { useEffect, useMemo, useRef, useState } from 'react';
import { advanceRoll, createInitialState, getBoardZones, getHumanBetForZone, getHumanPlayer, getOddsTargetsForPlayer, placeBet, removeBet } from './engine/gameEngine';
import { createAdvancedStats } from './engine/stats';
import { buildUiExplanation } from './engine/uiState';
import { GameState, PersistedPreferences } from './engine/types';
import { RNG } from './engine/rng';
import { buildCoachPrompts, buildCompactStats } from './training/coach';
import { defaultPreferences, loadPreferences, savePreferences } from './utils/storage';
import { TableView } from './ui/views/TableView';

const zones = getBoardZones();

export default function App() {
  const rngRef = useRef(new RNG(''));
  const [preferences, setPreferences] = useState<PersistedPreferences>(() => loadPreferences());
  const [autoRolling, setAutoRolling] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('pass-line');
  const [helpOpen, setHelpOpen] = useState(false);
  const [quickStatsOpen, setQuickStatsOpen] = useState(false);
  const [advancedStatsOpen, setAdvancedStatsOpen] = useState(false);
  const [state, setState] = useState<GameState>(() =>
    createInitialState({
      seed: '',
      aiCount: 4,
      rules: {
        startingBankroll: 1000,
        tableMin: 5,
        tableMax: 500,
        beginnerMode: preferences.beginnerMode,
        freePractice: preferences.freePractice
      }
    })
  );

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      rules: {
        ...current.rules,
        beginnerMode: preferences.beginnerMode,
        freePractice: preferences.freePractice
      }
    }));
  }, [preferences.beginnerMode, preferences.freePractice]);

  useEffect(() => {
    if (!autoRolling) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = structuredClone(current);
        advanceRoll(next, rngRef.current);
        return next;
      });
    }, preferences.autoRollMs);
    return () => window.clearInterval(timer);
  }, [autoRolling, preferences.autoRollMs]);

  const human = getHumanPlayer(state);
  const uiExplanation = useMemo(
    () => buildUiExplanation(state, human.id, preferences.chipDenom, selectedZoneId),
    [state, human.id, preferences.chipDenom, selectedZoneId]
  );
  const compactStats = useMemo(() => buildCompactStats(state), [state]);
  const coachPrompts = useMemo(() => buildCoachPrompts(state), [state]);
  const advancedStats = useMemo(() => createAdvancedStats(state), [state]);
  const oddsTargets = useMemo(() => getOddsTargetsForPlayer(state, human.id), [state, human.id]);

  const mutateState = (mutator: (draft: GameState) => void) => {
    setState((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const handleTapZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const zone = zones.find((candidate) => candidate.id === zoneId);
    if (!zone) return;
    mutateState((draft) => {
      const result = placeBet(draft, draft.players[0].id, {
        type: zone.type,
        amount: preferences.chipDenom,
        target: zone.target
      });
      draft.recap = result.ok
        ? { title: 'Bet placed', detail: `$${preferences.chipDenom} on ${zone.label}.`, bankrollDelta: 0, tone: 'good' }
        : { title: 'Bet unavailable', detail: 'reason' in result ? result.reason : 'That bet is unavailable now.', bankrollDelta: 0, tone: 'warn' };
    });
  };

  const handleRemoveSelected = () => {
    const bet = getHumanBetForZone(state, selectedZoneId)[0];
    if (!bet) return;
    mutateState((draft) => {
      const removed = removeBet(draft, draft.players[0].id, bet.id);
      draft.recap = removed
        ? { title: 'Bet removed', detail: 'The selected wager and attached odds were returned.', bankrollDelta: 0, tone: 'neutral' }
        : { title: 'Nothing changed', detail: 'There is no matching wager on that area.', bankrollDelta: 0, tone: 'neutral' };
    });
  };

  const handleAddOdds = (baseId: string) => {
    mutateState((draft) => {
      const player = draft.players[0];
      const base = player.bets.find((bet) => bet.id === baseId);
      const target = (base?.target ?? draft.point) ?? null;
      if (!base || typeof target !== 'number') return;
      const result = placeBet(draft, player.id, {
        type: 'odds',
        amount: preferences.chipDenom,
        baseId,
        target
      });
      draft.recap = result.ok
        ? { title: 'Odds added', detail: `$${preferences.chipDenom} odds now back that flat bet.`, bankrollDelta: 0, tone: 'good' }
        : { title: 'Odds unavailable', detail: 'reason' in result ? result.reason : 'Odds are unavailable now.', bankrollDelta: 0, tone: 'warn' };
    });
  };

  const newSession = () => {
    rngRef.current = new RNG('');
    setAutoRolling(false);
    setState(
      createInitialState({
        aiCount: 4,
        rules: {
          beginnerMode: preferences.beginnerMode,
          freePractice: preferences.freePractice
        }
      })
    );
  };

  return (
    <div className="app-shell">
      <TableView
        state={state}
        zones={zones}
        selectedZoneId={selectedZoneId}
        preferences={preferences}
        compactStats={compactStats}
        coachPrompts={coachPrompts}
        uiExplanation={uiExplanation}
        autoRolling={autoRolling}
        helpOpen={helpOpen}
        quickStatsOpen={quickStatsOpen}
        advancedStatsOpen={advancedStatsOpen}
        advancedStats={advancedStats}
        oddsTargets={oddsTargets}
        onTapZone={handleTapZone}
        onSelectZone={setSelectedZoneId}
        onRemoveSelected={handleRemoveSelected}
        onRoll={() => mutateState((draft) => advanceRoll(draft, rngRef.current))}
        onNewSession={newSession}
        onPickChip={(chipDenom) => setPreferences((current) => ({ ...current, chipDenom }))}
        onToggleAuto={() => setAutoRolling((current) => !current)}
        onSetAutoRollMs={(autoRollMs) => setPreferences((current) => ({ ...current, autoRollMs }))}
        onToggleHighlights={() => setPreferences((current) => ({ ...current, trainingHighlights: !current.trainingHighlights }))}
        onToggleBeginner={() => setPreferences((current) => ({ ...current, beginnerMode: !current.beginnerMode }))}
        onToggleFreePractice={() => setPreferences((current) => ({ ...current, freePractice: !current.freePractice }))}
        onSetHelpOpen={setHelpOpen}
        onSetQuickStatsOpen={setQuickStatsOpen}
        onSetAdvancedStatsOpen={setAdvancedStatsOpen}
        onAddOdds={handleAddOdds}
        onSeatPositionChange={(seatKey, position) =>
          setPreferences((current) => ({
            ...current,
            seatPositions: {
              ...current.seatPositions,
              [seatKey]: position
            }
          }))
        }
        onResetSeatPositions={() => setPreferences((current) => ({ ...current, seatPositions: defaultPreferences.seatPositions }))}
      />
    </div>
  );
}
