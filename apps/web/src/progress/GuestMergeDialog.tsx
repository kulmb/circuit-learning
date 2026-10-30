import type { PointerEvent as ReactPointerEvent } from 'react';

import { useLanguage } from '../i18n/LanguageContext';
import { getText } from '../narration/fr';
import { useProgress } from './ProgressContext';
import './GuestMergeDialog.css';

export function GuestMergeDialog() {
  useLanguage();
  const { mergePrompt, mergeGuestProgress, keepAccountOnly } = useProgress();

  if (!mergePrompt.open) {
    return null;
  }

  return (
    <div className="guest-merge" role="dialog" aria-modal="true" aria-labelledby="guest-merge-title">
      <div className="guest-merge__card">
        <p className="guest-merge__eyebrow">{getText('progress.mergeAdult')}</p>
        <h2 id="guest-merge-title">{getText('progress.mergeTitle')}</h2>
        <p>{getText('progress.mergeQuestion')}</p>

        {mergePrompt.error ? (
          <p className="guest-merge__error" role="alert">
            {getText('progress.mergeError')}
          </p>
        ) : null}

        <div className="guest-merge__actions">
          <button
            type="button"
            className="guest-merge__button guest-merge__button--primary"
            disabled={mergePrompt.busy}
            onPointerDown={(event) =>
              activate(event, () => {
                void mergeGuestProgress();
              })
            }
          >
            {mergePrompt.busy
              ? getText('progress.mergeBusy')
              : getText('progress.mergeYes')}
          </button>
          <button
            type="button"
            className="guest-merge__button guest-merge__button--secondary"
            disabled={mergePrompt.busy}
            onPointerDown={(event) =>
              activate(event, keepAccountOnly)
            }
          >
            {getText('progress.mergeNo')}
          </button>
        </div>
      </div>
    </div>
  );
}

function activate(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}
