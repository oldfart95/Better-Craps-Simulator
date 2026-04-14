import { PersistedPreferences } from '../engine/types';

const KEY = 'better-craps-sim:prefs';

export const defaultPreferences: PersistedPreferences = {
  chipDenom: 25,
  autoRollMs: 900,
  trainingHighlights: true,
  guidedPrompts: true,
  compactStatsExpanded: false
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
