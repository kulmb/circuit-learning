import {
  setNarrationMuted,
  setNarrationRate,
} from '../narration/narrationService';
import { setAudioMuted } from '../workbench/audio';

export type SpeechRate = 'slow' | 'normal' | 'fast';

export interface Preferences {
  sound: boolean;
  speechRate: SpeechRate;
  vibration: boolean;
  lowPerformance: boolean;
}

export const SPEECH_RATE_VALUES: Record<SpeechRate, number> = {
  slow: 0.75,
  normal: 0.9,
  fast: 1.05,
};

export const PREFERENCES_STORAGE_KEY = 'circuits-de-zap:preferences:v1';

const DEFAULT_PREFERENCES: Preferences = {
  sound: true,
  speechRate: 'normal',
  vibration: true,
  lowPerformance: false,
};

const SPEECH_RATES = new Set<SpeechRate>(['slow', 'normal', 'fast']);

export function readPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw === null) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_PREFERENCES };
    }

    const record = parsed as Partial<Preferences>;
    return {
      sound:
        typeof record.sound === 'boolean'
          ? record.sound
          : DEFAULT_PREFERENCES.sound,
      speechRate:
        typeof record.speechRate === 'string' &&
        SPEECH_RATES.has(record.speechRate as SpeechRate)
          ? (record.speechRate as SpeechRate)
          : DEFAULT_PREFERENCES.speechRate,
      vibration:
        typeof record.vibration === 'boolean'
          ? record.vibration
          : DEFAULT_PREFERENCES.vibration,
      lowPerformance:
        typeof record.lowPerformance === 'boolean'
          ? record.lowPerformance
          : DEFAULT_PREFERENCES.lowPerformance,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function updatePreferences(
  patch: Partial<Preferences>,
): Preferences {
  const next = { ...readPreferences(), ...patch };

  try {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // The setting still applies for this session when storage is unavailable.
  }

  applyPreferences(next);
  return next;
}

export function setSoundEnabled(enabled: boolean): void {
  updatePreferences({ sound: enabled });
}

export function setSpeechRate(rate: SpeechRate): void {
  updatePreferences({ speechRate: rate });
}

export function setVibrationEnabled(enabled: boolean): void {
  updatePreferences({ vibration: enabled });
}

export function setLowPerformancePreference(enabled: boolean): void {
  updatePreferences({ lowPerformance: enabled });
}

export function applyPreferences(
  preferences: Preferences = readPreferences(),
): void {
  setNarrationMuted(!preferences.sound);
  setAudioMuted(!preferences.sound);
  setNarrationRate(SPEECH_RATE_VALUES[preferences.speechRate]);
}
