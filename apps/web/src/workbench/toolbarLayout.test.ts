import { describe, expect, it } from 'vitest';

import {
  TOOLBAR_ICON_SCREEN_PX,
  toolbarButtonSize,
  toolbarIconSize,
} from './toolbarLayout';

describe('selection toolbar sizing', () => {
  it('keeps a 56 CSS px button at every zoom and layout', () => {
    expect(toolbarButtonSize(false, 1)).toBe(56);
    expect(toolbarButtonSize(false, 1.2) * 1.2).toBeCloseTo(56, 0);
    expect(toolbarButtonSize(true, 1)).toBe(56);
    expect(toolbarButtonSize(true, 0.25) * 0.25).toBeCloseTo(56, 0);
  });

  it('keeps the glyph around 26 CSS px, well inside its button', () => {
    const desktopIcon = toolbarIconSize(56, 1.2);
    const compactIcon = toolbarIconSize(224, 0.25);

    expect(desktopIcon * 1.2).toBeCloseTo(TOOLBAR_ICON_SCREEN_PX, 5);
    expect(compactIcon * 0.25).toBeCloseTo(TOOLBAR_ICON_SCREEN_PX, 5);
    expect(desktopIcon).toBeLessThan(56 * 0.5);
    expect(compactIcon).toBeLessThan(224 * 0.5);
  });

  it('never lets a huge scale make the glyph fill the button', () => {
    const icon = toolbarIconSize(56, 2.4);

    expect(icon).toBeLessThanOrEqual(56 * 0.5);
  });
});
