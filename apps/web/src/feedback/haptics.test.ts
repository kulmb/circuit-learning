import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyPreferences, updatePreferences } from '../settings/preferences';
import {
  supportsVibration,
  vibrateShortCircuit,
  vibrateSuccess,
} from './haptics';

const vibrate = vi.fn();

describe('haptics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    applyPreferences();
    vibrate.mockClear();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrate,
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('uses one short pulse for a success and two for a short circuit', () => {
    expect(supportsVibration()).toBe(true);

    vibrateSuccess();
    expect(vibrate).toHaveBeenLastCalledWith(25);

    vibrateShortCircuit();
    expect(vibrate).toHaveBeenLastCalledWith([45, 60, 45]);
  });

  it('stays silent when the parent disabled vibrations', () => {
    updatePreferences({ vibration: false });

    vibrateSuccess();
    vibrateShortCircuit();

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does nothing when the device has no vibration motor', () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(supportsVibration()).toBe(false);
    expect(() => vibrateSuccess()).not.toThrow();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
