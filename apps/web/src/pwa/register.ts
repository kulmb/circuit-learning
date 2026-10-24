import { registerSW } from 'virtual:pwa-register';

import { markPwaUpdateReady } from './update';

/**
 * Registers the Workbox service worker. The update is never applied
 * automatically: the map page offers a large "Mettre à jour" button.
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
        markPwaUpdateReady(() => {
          if (updateServiceWorker === null) {
            window.location.reload();
            return;
          }

          void updateServiceWorker(true).catch(() => {
            window.location.reload();
          });
        });
      },
      onRegisteredSW(_serviceWorkerUrl, registration) {
        if (registration === undefined) {
          return;
        }

        window.setInterval(() => {
          if (!document.hidden) {
            void registration.update().catch(() => undefined);
          }
        }, 60 * 60 * 1000);
      },
    });
  } catch {
    // A browser without service worker support simply stays online-only.
  }
}
