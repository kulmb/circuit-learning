import { describe, expect, it } from 'vitest';

import {
  framesToFps,
  HIGH_WINDOWS_TO_RECOVER,
  INITIAL_FPS_STATE,
  LOW_WINDOWS_TO_ACTIVATE,
  updateFpsMonitor,
} from './fps';

describe('FPS monitor', () => {
  it('computes frames per second from a window', () => {
    expect(framesToFps(60, 1000)).toBe(60);
    expect(framesToFps(90, 1500)).toBe(60);
    expect(framesToFps(10, 0)).toBe(0);
  });

  it('activates the low mode after two slow windows', () => {
    let state = INITIAL_FPS_STATE;

    for (let index = 0; index < LOW_WINDOWS_TO_ACTIVATE - 1; index += 1) {
      state = updateFpsMonitor(state, 32);
      expect(state.autoLow).toBe(false);
    }

    state = updateFpsMonitor(state, 32);
    expect(state.autoLow).toBe(true);
  });

  it('keeps the low mode through a middling window', () => {
    let state = { ...INITIAL_FPS_STATE, autoLow: true };

    state = updateFpsMonitor(state, 45);
    expect(state.autoLow).toBe(true);
  });

  it('recovers after three comfortable windows', () => {
    let state = { ...INITIAL_FPS_STATE, autoLow: true };

    for (let index = 0; index < HIGH_WINDOWS_TO_RECOVER - 1; index += 1) {
      state = updateFpsMonitor(state, 58);
      expect(state.autoLow).toBe(true);
    }

    state = updateFpsMonitor(state, 58);
    expect(state.autoLow).toBe(false);
  });
});
