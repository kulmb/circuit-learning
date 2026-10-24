export const ZAP_PANEL_STORAGE_KEY = 'circuits-de-zap:zap-panel:v1';

/**
 * Zap is helpful but would otherwise cover the work area. The child can hide
 * the whole panel and reopen it from a small button; the choice survives
 * levels and reloads.
 */
export function readZapPanelCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(ZAP_PANEL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeZapPanelCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      ZAP_PANEL_STORAGE_KEY,
      collapsed ? 'true' : 'false',
    );
  } catch {
    // The panel still toggles for this session when storage is unavailable.
  }
}
