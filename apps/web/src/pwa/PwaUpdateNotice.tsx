import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';

import { getText } from '../narration/fr';
import {
  consumePwaUpgradeNotice,
  hidePwaUpgradeNotice,
  showPwaUpgradeNotice,
  usePwaUpgradeNotice,
} from './update';
import './PwaUpdateNotice.css';

/**
 * Lives outside the screens, so the confirmation appears on the home, map,
 * level, sandbox, adult and parent pages alike.
 */
export function PwaUpdateNotice() {
  const notice = usePwaUpgradeNotice();

  useEffect(() => {
    if (consumePwaUpgradeNotice()) {
      showPwaUpgradeNotice();
    }
  }, []);

  if (!notice.visible) {
    return null;
  }

  return (
    <div
      className="pwa-update-notice"
      role="status"
      aria-live="polite"
    >
      <span className="pwa-update-notice__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M5 12.5 9.5 17 19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="pwa-update-notice__text">
        <strong>{getText('pwa.updateDone')}</strong>
        <span>{getText('pwa.updateDoneDetail')}</span>
      </span>

      <button
        type="button"
        className="pwa-update-notice__close"
        aria-label={getText('pwa.updateDoneClose')}
        onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
          event.preventDefault();
          hidePwaUpgradeNotice();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
