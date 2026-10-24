import { registerSW } from 'virtual:pwa-register';

import { markPwaUpgradePending } from './update';

/**
 * Registers the Workbox service worker. When a new build is found on load,
 * it is activated immediately; the persisted flag lets the next page show a
 * short success notice on any screen. There is deliberately no periodic
 * update check, so a running level or sandbox is never reloaded mid-play.
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

  try {
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        markPwaUpgradePending();

        if (updateServiceWorker === null) {
          window.location.reload();
          return;
        }

        void updateServiceWorker(true).catch(() => {
          window.location.reload();
        });
      },
    });
  } catch {
    // A browser without service worker support simply stays online-only.
  }
}
