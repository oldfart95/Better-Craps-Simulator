import { PersistedPreferences } from '../engine/types';

const KEY = 'better-craps-sim:prefs';

export const defaultPreferences: PersistedPreferences = {
  chipDenom: 25,
  autoRollMs: 900,
  trainingHighlights: true,
  guidedPrompts: true,
  beginnerMode: true,
  freePractice: false,
  compactStatsExpanded: false,
  seatPositions: {
    '0': { x: 39, y: 2 },
    '1': { x: 79, y: 18 },
    '2': { x: 80, y: 67 },
    '3': { x: 39, y: 83 },
    '4': { x: 1, y: 67 },
    '5': { x: 1, y: 18 }
  }
};

export function loadPreferences() {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...(JSON.parse(raw) as Partial<PersistedPreferences>) };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: PersistedPreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(preferences));
}
