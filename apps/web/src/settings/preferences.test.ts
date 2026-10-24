import { isAudioMuted } from '../workbench/audio';
import { isNarrationMuted } from '../narration/narrationService';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyPreferences,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  setSoundEnabled,
  setSpeechRate,
  setVibrationEnabled,
  SPEECH_RATE_VALUES,
  updatePreferences,
} from './preferences';

describe('parent preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    applyPreferences();
  });

  it('uses sensible defaults', () => {
    expect(readPreferences()).toEqual({
      sound: true,
      speechRate: 'normal',
      vibration: true,
      lowPerformance: false,
    });
    expect(SPEECH_RATE_VALUES.normal).toBe(0.9);
  });

  it('persists each setting', () => {
    updatePreferences({
      speechRate: 'slow',
      vibration: false,
      lowPerformance: true,
    });

    expect(readPreferences()).toMatchObject({
      sound: true,
      speechRate: 'slow',
      vibration: false,
      lowPerformance: true,
    });
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain(
      '"speechRate":"slow"',
    );
  });

  it('falls back on corrupted or unknown values', () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, '{oops');
    expect(readPreferences().speechRate).toBe('normal');

    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ sound: 'yes', speechRate: 'extreme' }),
    );
    expect(readPreferences()).toEqual({
      sound: true,
      speechRate: 'normal',
      vibration: true,
      lowPerformance: false,
    });
  });

  it('turns narration and effects off together', () => {
    setSoundEnabled(false);
    expect(isNarrationMuted()).toBe(true);
    expect(isAudioMuted()).toBe(true);

    setSoundEnabled(true);
    expect(isNarrationMuted()).toBe(false);
    expect(isAudioMuted()).toBe(false);
  });

  it('stores the selected speech rate and vibration', () => {
    setSpeechRate('fast');
    setVibrationEnabled(false);

    expect(readPreferences().speechRate).toBe('fast');
    expect(readPreferences().vibration).toBe(false);
  });
});
