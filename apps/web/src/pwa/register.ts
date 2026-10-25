import { registerSW } from 'virtual:pwa-register';

import { markPwaUpgradePending } from './update';

/** Maximum wait for the new worker to take control before reloading anyway. */
const UPDATE_RELOAD_FALLBACK_MS = 2500;

/**
 * Registers the Workbox service worker during app startup. A new build is
 * checked and activated immediately, before the child reaches the map or a
 * lazy game screen. The persisted flag lets the next page show a short success
 * notice on any screen. There is deliberately no periodic update check, so a
 * running level or sandbox is never reloaded mid-play.
 */
export function registerPwa(): void {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null =
    null;
  let updateRequested = false;
  let reloadRequested = false;

  const reloadPage = (): void => {
    if (reloadRequested) {
      return;
    }

    reloadRequested = true;
    window.location.reload();
  };

  const requestUpdate = (): void => {
    if (updateRequested) {
      return;
    }

    updateRequested = true;
    markPwaUpgradePending();

    if (updateServiceWorker === null) {
      reloadPage();
      return;
    }

    // Safari does not always deliver the `controlling` event after
    // skipWaiting. Reload shortly after asking the worker to activate so the
    // child never has to navigate to another screen to receive the update.
    const fallback = window.setTimeout(
      reloadPage,
      UPDATE_RELOAD_FALLBACK_MS,
    );

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(fallback);
        reloadPage();
      },
      { once: true },
    );

    void updateServiceWorker(true).catch(() => {
      window.clearTimeout(fallback);
      reloadPage();
    });
  };

  try {
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh: requestUpdate,
      onRegisteredSW(_swUrl, registration) {
        if (registration === undefined) {
          return;
        }

        // Check at every app start, not only when a lazy screen is opened.
        void registration.update().catch(() => {
          // Offline or a transient network error: the current build stays.
        });

        // A worker left waiting by a previous session must not require the
        // child to navigate before it activates.
        if (registration.waiting !== null) {
          requestUpdate();
        }
      },
    });
  } catch {
    // A browser without service worker support simply stays online-only.
  }
}
