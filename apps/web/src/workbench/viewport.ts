import { TERMINAL_HIT_RADIUS } from './constants';
import { clamp, type Point } from './pointer';

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}

/**
 * The board view is expressed in logical board units: `zoom` is relative to
 * the "whole level fits" scale, and `center` is the board point shown in the
 * middle of the SVG element.
 */
export interface BoardView {
  zoom: number;
  center: Point;
}

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 2.5;
export const WHEEL_ZOOM_RATE = 0.002;

/** Below this screen size a terminal is too small for a reliable tap. */
export const MIN_TERMINAL_HIT_PX = 44;
export const TERMINAL_HIT_DIAMETER = TERMINAL_HIT_RADIUS * 2;

export function defaultView(board: Size): BoardView {
  return {
    zoom: 1,
    center: { x: board.width / 2, y: board.height / 2 },
  };
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1;
  }

  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/**
 * Centers the view and keeps the visible window inside the board. When the
 * board is zoomed out below 1, it is simply centered with margins.
 */
export function clampView(view: BoardView, board: Size): BoardView {
  const zoom = clampZoom(view.zoom);
  const visibleWidth = board.width / zoom;
  const visibleHeight = board.height / zoom;
  const centerX =
    visibleWidth >= board.width
      ? board.width / 2
      : clamp(view.center.x, visibleWidth / 2, board.width - visibleWidth / 2);
  const centerY =
    visibleHeight >= board.height
      ? board.height / 2
      : clamp(
          view.center.y,
          visibleHeight / 2,
          board.height - visibleHeight / 2,
        );

  return { zoom, center: { x: centerX, y: centerY } };
}

/** The viewBox rectangle that renders a view. */
export function viewBoxFor(view: BoardView, board: Size): Rect {
  const clamped = clampView(view, board);
  const width = board.width / clamped.zoom;
  const height = board.height / clamped.zoom;

  return {
    left: clamped.center.x - width / 2,
    top: clamped.center.y - height / 2,
    width,
    height,
  };
}

export function fitScale(element: Size, board: Size): number {
  if (element.width <= 0 || element.height <= 0) {
    return 1;
  }

  return Math.min(element.width / board.width, element.height / board.height);
}

/** CSS pixels per logical board unit at the current zoom. */
export function boardScale(
  element: Size,
  view: BoardView,
  board: Size,
): number {
  return fitScale(element, board) * clampZoom(view.zoom);
}

export function terminalHitPx(scale: number): number {
  return TERMINAL_HIT_DIAMETER * scale;
}

export function isTerminalTooSmall(scale: number): boolean {
  return terminalHitPx(scale) < MIN_TERMINAL_HIT_PX;
}

/**
 * Converts a screen (client) coordinate into board units. The SVG uses
 * `preserveAspectRatio="xMidYMid meet"`, so the board is letterboxed inside
 * the element and the same scale applies on both axes.
 */
export function screenToBoard(
  client: Point,
  element: Rect,
  view: BoardView,
  board: Size,
): Point {
  const box = viewBoxFor(view, board);
  const scale = fitScale(element, box);

  if (!(scale > 0) || !Number.isFinite(scale)) {
    return { x: client.x, y: client.y };
  }

  const offsetX = element.left + (element.width - box.width * scale) / 2;
  const offsetY = element.top + (element.height - box.height * scale) / 2;

  return {
    x: box.left + (client.x - offsetX) / scale,
    y: box.top + (client.y - offsetY) / scale,
  };
}

/** Inverse of {@link screenToBoard}; used by tests and gesture feedback. */
export function boardToScreen(
  point: Point,
  element: Rect,
  view: BoardView,
  board: Size,
): Point {
  const box = viewBoxFor(view, board);
  const scale = fitScale(element, box);
  const offsetX = element.left + (element.width - box.width * scale) / 2;
  const offsetY = element.top + (element.height - box.height * scale) / 2;

  return {
    x: offsetX + (point.x - box.left) * scale,
    y: offsetY + (point.y - box.top) * scale,
  };
}

/**
 * Zooms around a fixed board point. The point under the finger (or the mouse)
 * stays at the same screen position.
 */
export function zoomAt(
  view: BoardView,
  zoom: number,
  anchor: Point,
  board: Size,
): BoardView {
  const current = clampZoom(view.zoom);
  const target = clampZoom(zoom);
  const ratio = current / target;

  return clampView(
    {
      zoom: target,
      center: {
        x: anchor.x + (view.center.x - anchor.x) * ratio,
        y: anchor.y + (view.center.y - anchor.y) * ratio,
      },
    },
    board,
  );
}

/**
 * Builds the view that keeps `anchorBoard` under `anchorClient` at a given
 * zoom. Used by one-finger pan (fixed zoom) and by pinch (moving midpoint).
 */
export function viewForAnchor(
  anchorBoard: Point,
  anchorClient: Point,
  zoom: number,
  element: Rect,
  board: Size,
): BoardView {
  const target = clampZoom(zoom);
  const scale = fitScale(element, board) * target;
  const centerX = element.left + element.width / 2;
  const centerY = element.top + element.height / 2;

  return clampView(
    {
      zoom: target,
      center: {
        x: anchorBoard.x - (anchorClient.x - centerX) / scale,
        y: anchorBoard.y - (anchorClient.y - centerY) / scale,
      },
    },
    board,
  );
}

export function isDefaultView(view: BoardView, board: Size): boolean {
  const base = defaultView(board);

  return (
    Math.abs(view.zoom - 1) < 0.001 &&
    Math.abs(view.center.x - base.center.x) < 0.25 &&
    Math.abs(view.center.y - base.center.y) < 0.25
  );
}

/** Normalizes a wheel delta (pixels, lines or pages) into a zoom factor. */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
  const normalized =
    deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 100 : deltaY;

  return clamp(Math.exp(-normalized * WHEEL_ZOOM_RATE), 0.5, 2);
}

/** Measures an element, with a usable 1:1 fallback before layout (tests). */
export function measureElementRect(element: Element, board: Size): Rect {
  const rect = element.getBoundingClientRect();

  if (rect.width > 0 && rect.height > 0) {
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  return { left: 0, top: 0, width: board.width, height: board.height };
}

export function formatViewBox(box: Rect): string {
  return [box.left, box.top, box.width, box.height]
    .map((value) => Number(value.toFixed(2)))
    .join(' ');
}
