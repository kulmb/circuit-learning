export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.2.0';

export const APP_VERSION_STORAGE_KEY = 'circuits-de-zap:app-version:v1';

export function rememberAppVersion(version = APP_VERSION): void {
  try {
    window.localStorage.setItem(APP_VERSION_STORAGE_KEY, version);
  } catch {
    // A full or blocked storage area must not block the game.
  }
}

export function readStoredAppVersion(): string | null {
  try {
    return window.localStorage.getItem(APP_VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}
