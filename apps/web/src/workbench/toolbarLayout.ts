/** Screen size of the vector glyph inside a selection toolbar button. */
export const TOOLBAR_ICON_SCREEN_PX = 26;

/** Screen size of the rotate and delete buttons, in CSS pixels. */
export const TOOLBAR_BUTTON_SCREEN_PX = 56;

/** Screen size of the rheostat slider, in CSS pixels. */
export const TOOLBAR_SLIDER_WIDTH_SCREEN_PX = 144;
export const TOOLBAR_SLIDER_HEIGHT_SCREEN_PX = 56;

/** The glyph never fills more than this share of its button. */
const MAX_ICON_BUTTON_RATIO = 0.5;

export function toolbarButtonSize(
  _compact: boolean,
  viewportScale: number,
): number {
  return Math.ceil(
    TOOLBAR_BUTTON_SCREEN_PX / Math.max(viewportScale, 0.1),
  );
}

/**
 * The button is sized in board units, so its screen size changes with zoom.
 * The glyph is therefore sized from the viewport scale too: it stays about
 * 26 CSS px, even in the compact layout where the button is enlarged.
 */
export function toolbarIconSize(
  buttonSize: number,
  viewportScale: number,
): number {
  return Math.min(
    buttonSize * MAX_ICON_BUTTON_RATIO,
    TOOLBAR_ICON_SCREEN_PX / Math.max(viewportScale, 0.1),
  );
}

export function toolbarSliderWidth(viewportScale: number): number {
  return Math.ceil(
    TOOLBAR_SLIDER_WIDTH_SCREEN_PX / Math.max(viewportScale, 0.1),
  );
}

export function toolbarSliderHeight(viewportScale: number): number {
  return Math.ceil(
    TOOLBAR_SLIDER_HEIGHT_SCREEN_PX / Math.max(viewportScale, 0.1),
  );
}
