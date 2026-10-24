import { readPreferences } from '../settings/preferences';

const SUCCESS_PATTERN = 25;
const SHORT_CIRCUIT_PATTERN = [45, 60, 45];

export function supportsVibration(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function vibrateSuccess(): void {
  vibrate(SUCCESS_PATTERN);
}

export function vibrateShortCircuit(): void {
  vibrate(SHORT_CIRCUIT_PATTERN);
}

function vibrate(pattern: number | number[]): void {
  if (!supportsVibration() || !readPreferences().vibration) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is a bonus; never interrupt the game.
  }
}
