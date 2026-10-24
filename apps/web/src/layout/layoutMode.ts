export type LayoutSize = 'compact' | 'medium' | 'large';
export type LayoutOrientation = 'portrait' | 'landscape';

export interface LayoutMode {
  size: LayoutSize;
  orientation: LayoutOrientation;
  width: number;
  height: number;
}

/** Phone-sized: narrower than 700 px or shorter than 500 px. */
export const COMPACT_MAX_WIDTH = 700;
export const COMPACT_MAX_HEIGHT = 500;

/** Roomier desktops. Everything in between is a tablet-like medium layout. */
export const LARGE_MIN_WIDTH = 1100;
export const LARGE_MIN_HEIGHT = 700;

/**
 * Pick a layout from the real container size, never from the user agent.
 * Boundaries follow CLAUDE.md: compact is width < 700 OR height < 500.
 */
export function getLayoutMode(width: number, height: number): LayoutMode {
  const safeWidth = Number.isFinite(width) ? width : 0;
  const safeHeight = Number.isFinite(height) ? height : 0;

  let size: LayoutSize;
  if (safeWidth < COMPACT_MAX_WIDTH || safeHeight < COMPACT_MAX_HEIGHT) {
    size = 'compact';
  } else if (
    safeWidth >= LARGE_MIN_WIDTH &&
    safeHeight >= LARGE_MIN_HEIGHT
  ) {
    size = 'large';
  } else {
    size = 'medium';
  }

  return {
    size,
    orientation: safeHeight > safeWidth ? 'portrait' : 'landscape',
    width: safeWidth,
    height: safeHeight,
  };
}
