import { unlockNarration } from '../narration/narrationService';
import { unlockAudio } from '../workbench/audio';

let installed = false;

/**
 * Mobile browsers only allow audio after a real gesture, and the first
 * gesture may happen on any screen. Both services are idempotent, so every
 * pointer down can safely ask them to unlock.
 */
export function installAudioUnlock(): void {
  if (installed || typeof document === 'undefined') {
    return;
  }

  installed = true;

  const unlock = (): void => {
    unlockNarration();
    unlockAudio();
  };

  document.addEventListener('pointerdown', unlock, {
    capture: true,
    passive: true,
  });
  document.addEventListener('click', unlock, {
    capture: true,
    passive: true,
  });
}
