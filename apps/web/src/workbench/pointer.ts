import type { TerminalRef } from '@circuits/shared';

export interface Point {
  x: number;
  y: number;
}

export interface TerminalCandidate {
  ref: TerminalRef;
  point: Point;
}

export const DRAG_THRESHOLD_PX = 8;
export const SNAP_RADIUS_PX = 30;
export const COMPACT_SNAP_RADIUS_PX = 40;
export const TOUCH_OFFSET_PX = 40;

export type ScrollAxis = 'x' | 'y';
export type PaletteGesture = 'pending' | 'scroll' | 'drag';

export interface ScrollMetrics {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

export function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function isDragGesture(
  start: Point,
  current: Point,
  threshold = DRAG_THRESHOLD_PX,
): boolean {
  return distance(start, current) > threshold;
}

/**
 * The axis the palette can actually scroll on this layout: the bottom tray
 * scrolls horizontally, the side tray vertically. `null` means every
 * component already fits, so a touch always carries a component.
 */
export function paletteScrollAxis(
  metrics: ScrollMetrics | null,
): ScrollAxis | null {
  if (metrics === null) {
    return null;
  }

  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    return 'x';
  }

  if (metrics.scrollHeight > metrics.clientHeight + 1) {
    return 'y';
  }

  return null;
}

/**
 * A touch that mostly follows the scrollable axis browses the palette; any
 * other movement pulls the component out. Handling this in code, with
 * `touch-action: none` on the items, stops the browser from cancelling the
 * drag halfway through.
 */
export function decidePaletteGesture(
  start: Point,
  current: Point,
  scrollAxis: ScrollAxis | null,
  threshold = DRAG_THRESHOLD_PX,
): PaletteGesture {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;

  if (Math.hypot(deltaX, deltaY) <= threshold) {
    return 'pending';
  }

  if (scrollAxis === 'x' && Math.abs(deltaX) > Math.abs(deltaY)) {
    return 'scroll';
  }

  if (scrollAxis === 'y' && Math.abs(deltaY) > Math.abs(deltaX)) {
    return 'scroll';
  }

  return 'drag';
}

export function snapToGrid(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampGridPosition(
  position: Point,
  columns: number,
  rows: number,
  marginX = 1,
  marginY = 1,
): Point {
  return {
    x: clamp(position.x, marginX, columns - marginX),
    y: clamp(position.y, marginY, rows - marginY),
  };
}

export function applyTouchOffset(
  point: Point,
  pointerType: string,
  offset: number,
): Point {
  return pointerType === 'touch' ? { x: point.x, y: point.y - offset } : point;
}

export function findNearestTerminal(
  point: Point,
  terminals: readonly TerminalCandidate[],
  maxDistance: number,
): TerminalCandidate | null {
  let nearest: TerminalCandidate | null = null;
  let nearestDistance = maxDistance;

  for (const terminal of terminals) {
    const terminalDistance = distance(point, terminal.point);
    if (terminalDistance <= nearestDistance) {
      nearest = terminal;
      nearestDistance = terminalDistance;
    }
  }

  return nearest;
}

/** Straight dashed guide shown while the child pulls a new wire. */
export function buildStraightWirePath(from: Point, to: Point): string {
  return `M ${format(from.x)} ${format(from.y)} L ${format(to.x)} ${format(to.y)}`;
}

export function buildWirePath(
  from: Point,
  to: Point,
  curve = 36,
  maxControlFraction = 0.25,
): string {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length < 0.001) {
    return `M ${format(from.x)} ${format(from.y)}`;
  }

  const control = buildWireControlPoint(
    from,
    to,
    curve,
    maxControlFraction,
  );

  return `M ${format(from.x)} ${format(from.y)} Q ${format(control.x)} ${format(control.y)} ${format(to.x)} ${format(to.y)}`;
}

/** Control point of the fallback curve, shared with the delete button. */
export function buildWireControlPoint(
  from: Point,
  to: Point,
  curve = 36,
  maxControlFraction = 0.25,
): Point {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length < 0.001) {
    return { ...from };
  }

  const controlDistance = Math.min(curve, length * maxControlFraction);
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;

  return {
    x: middleX - (deltaY / length) * controlDistance,
    y: middleY + (deltaX / length) * controlDistance,
  };
}

/** Midpoint of the quadratic fallback curve, not of its chord. */
export function buildWireMidpoint(
  from: Point,
  to: Point,
  curve = 36,
  maxControlFraction = 0.25,
): Point {
  const control = buildWireControlPoint(from, to, curve, maxControlFraction);

  return {
    x: (from.x + 2 * control.x + to.x) / 4,
    y: (from.y + 2 * control.y + to.y) / 4,
  };
}

export function isPointInsideBoard(point: Point, width: number, height: number): boolean {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

export function gridToSvg(point: Point, cellSize: number): Point {
  return { x: point.x * cellSize, y: point.y * cellSize };
}

export function svgToGrid(point: Point, cellSize: number): Point {
  return { x: point.x / cellSize, y: point.y / cellSize };
}

function format(value: number): number {
  return Number(value.toFixed(2));
}
