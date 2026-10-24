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

  const controlDistance = Math.min(curve, length * maxControlFraction);
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;
  const controlX = middleX - (deltaY / length) * controlDistance;
  const controlY = middleY + (deltaX / length) * controlDistance;

  return `M ${format(from.x)} ${format(from.y)} Q ${format(controlX)} ${format(controlY)} ${format(to.x)} ${format(to.y)}`;
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
