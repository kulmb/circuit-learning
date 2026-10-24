import { useSyncExternalStore } from 'react';

export const PWA_UPDATE_NOTICE_KEY =
  'circuits-de-zap:pwa-update-complete:v1';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Called just before the service worker activates and reloads the page. The
 * flag survives that reload; the notice is consumed on the next boot only.
 */
export function markPwaUpgradePending(): void {
  try {
    storage()?.setItem(PWA_UPDATE_NOTICE_KEY, '1');
  } catch {
    // A blocked storage area must not block the update.
  }
}

export function consumePwaUpgradeNotice(): boolean {
  const area = storage();

  if (area === null) {
    return false;
  }

  try {
    if (area.getItem(PWA_UPDATE_NOTICE_KEY) !== '1') {
      return false;
    }

    area.removeItem(PWA_UPDATE_NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearPwaUpgradeNotice(): void {
  try {
    storage()?.removeItem(PWA_UPDATE_NOTICE_KEY);
  } catch {
    // Ignore.
  }
}

interface NoticeState {
  visible: boolean;
}

let noticeState: NoticeState = { visible: false };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function showPwaUpgradeNotice(): void {
  if (!noticeState.visible) {
    noticeState = { visible: true };
    emit();
  }
}

export function hidePwaUpgradeNotice(): void {
  if (noticeState.visible) {
    noticeState = { visible: false };
    emit();
  }
}

export function resetPwaUpgradeNotice(): void {
  clearPwaUpgradeNotice();
  noticeState = { visible: false };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): NoticeState {
  return noticeState;
}

/**
 * A successful install is shown on every page. The persisted flag is
 * consumed once at boot, then the notice stays until the user closes it.
 */
export function usePwaUpgradeNotice(): NoticeState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
