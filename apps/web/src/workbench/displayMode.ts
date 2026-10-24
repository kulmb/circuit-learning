import type { DisplayMode } from '@circuits/shared';

export type { DisplayMode } from '@circuits/shared';

const NEXT_MODE: Record<DisplayMode, DisplayMode> = {
  realistic: 'symbol',
  symbol: 'overlay',
  overlay: 'realistic',
};

export function nextDisplayMode(mode: DisplayMode): DisplayMode {
  return NEXT_MODE[mode];
}
