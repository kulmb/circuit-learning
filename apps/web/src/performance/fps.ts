export const LOW_FPS_THRESHOLD = 40;
export const HIGH_FPS_THRESHOLD = 50;
export const LOW_WINDOWS_TO_ACTIVATE = 2;
export const HIGH_WINDOWS_TO_RECOVER = 3;

export interface FpsMonitorState {
  lowWindows: number;
  highWindows: number;
  autoLow: boolean;
}

export const INITIAL_FPS_STATE: FpsMonitorState = {
  lowWindows: 0,
  highWindows: 0,
  autoLow: false,
};

/**
 * Two consecutive slow windows turn the automatic mode on. Recovery needs
 * three comfortable windows, which avoids flapping around the threshold.
 */
export function updateFpsMonitor(
  state: FpsMonitorState,
  fps: number,
): FpsMonitorState {
  if (fps < LOW_FPS_THRESHOLD) {
    const lowWindows = state.lowWindows + 1;
    return {
      lowWindows,
      highWindows: 0,
      autoLow: state.autoLow || lowWindows >= LOW_WINDOWS_TO_ACTIVATE,
    };
  }

  if (fps >= HIGH_FPS_THRESHOLD) {
    const highWindows = state.highWindows + 1;
    return {
      lowWindows: 0,
      highWindows,
      autoLow:
        state.autoLow && highWindows < HIGH_WINDOWS_TO_RECOVER,
    };
  }

  return {
    lowWindows: 0,
    highWindows: 0,
    autoLow: state.autoLow,
  };
}

export function framesToFps(frames: number, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return 0;
  }

  return (frames * 1000) / elapsedMs;
}
