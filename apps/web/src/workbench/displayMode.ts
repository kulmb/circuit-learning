export type DisplayMode = 'realistic' | 'symbol' | 'overlay';

const NEXT_MODE: Record<DisplayMode, DisplayMode> = {
  realistic: 'symbol',
  symbol: 'overlay',
  overlay: 'realistic',
};

export function nextDisplayMode(mode: DisplayMode): DisplayMode {
  return NEXT_MODE[mode];
}
