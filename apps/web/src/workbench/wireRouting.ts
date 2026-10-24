import type { CircuitComponent, Rotation } from '@circuits/shared';

import {
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
} from './constants';
import type { Point } from './pointer';

export interface WireObstacle {
  componentId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WireEndpoint {
  componentId: string;
  point: Point;
  /** Outward normal of the component side that carries the terminal. */
  direction: Point;
}

export interface WireRouteOptions {
  boardWidth: number;
  boardHeight: number;
  obstacles: readonly WireObstacle[];
  cellSize?: number;
  clearance?: number;
  bendPenalty?: number;
  /** Grid nodes already used by other wires, to keep parallel runs apart. */
  occupied?: ReadonlySet<string>;
}

export interface WireRoute {
  /** Terminal → escape stub → routed path → escape stub → terminal. */
  points: Point[];
  fallback: boolean;
}

/** A terminal sits 6.4 px inside the component edge; 22 px clears the body. */
export const WIRE_ESCAPE_DISTANCE = 22;
export const WIRE_ROUTE_CELL = 16;
export const WIRE_CLEARANCE = 10;
export const WIRE_BEND_PENALTY = 4;
export const WIRE_OCCUPANCY_PENALTY = 2;
export const WIRE_CORNER_RADIUS = 12;

export function terminalOutwardDirection(
  component: CircuitComponent,
  terminalId: string,
): Point {
  const terminal = component.terminals.find((item) => item.id === terminalId);
  const sign = terminal !== undefined && terminal.offset.x < 0 ? -1 : 1;

  return rotateVector({ x: sign, y: 0 }, component.rotation);
}

export function wireEndpoint(
  component: CircuitComponent,
  terminalId: string,
  point: Point,
): WireEndpoint {
  return {
    componentId: component.id,
    point,
    direction: terminalOutwardDirection(component, terminalId),
  };
}

export function escapePoint(endpoint: WireEndpoint): Point {
  return {
    x: endpoint.point.x + endpoint.direction.x * WIRE_ESCAPE_DISTANCE,
    y: endpoint.point.y + endpoint.direction.y * WIRE_ESCAPE_DISTANCE,
  };
}

export function routeWire(
  from: WireEndpoint,
  to: WireEndpoint,
  options: WireRouteOptions,
): WireRoute {
  const cellSize = options.cellSize ?? WIRE_ROUTE_CELL;
  const clearance = options.clearance ?? WIRE_CLEARANCE;
  const bendPenalty = options.bendPenalty ?? WIRE_BEND_PENALTY;
  const occupied = options.occupied ?? new Set<string>();
  const fromEscape = clampPoint(
    escapePoint(from),
    options.boardWidth,
    options.boardHeight,
  );
  const toEscape = clampPoint(
    escapePoint(to),
    options.boardWidth,
    options.boardHeight,
  );
  const obstacles = options.obstacles.map((obstacle) => ({
    ...obstacle,
    left: obstacle.left - clearance,
    top: obstacle.top - clearance,
    right: obstacle.right + clearance,
    bottom: obstacle.bottom + clearance,
  }));

  const columns = Math.max(0, Math.floor(options.boardWidth / cellSize));
  const rows = Math.max(0, Math.floor(options.boardHeight / cellSize));
  const start = nearestFreeNode(fromEscape, obstacles, columns, rows, cellSize);
  const end = nearestFreeNode(toEscape, obstacles, columns, rows, cellSize);

  if (start === null || end === null) {
    return { points: [from.point, to.point], fallback: true };
  }

  const path = astar(start, end, obstacles, columns, rows, cellSize, {
    bendPenalty,
    occupied,
  });

  if (path === null) {
    return { points: [from.point, to.point], fallback: true };
  }

  const points = dedupe([
    from.point,
    fromEscape,
    ...path,
    toEscape,
    to.point,
  ]);

  return { points: simplify(points), fallback: false };
}

/**
 * Rounded polyline used for the visible wire. Corners become quadratic curves
 * so a routed wire keeps the soft, toy-like look of the original board.
 */
export function roundedPolylinePath(
  points: readonly Point[],
  radius = WIRE_CORNER_RADIUS,
): string {
  if (points.length === 0) {
    return '';
  }

  const first = points[0];
  if (first === undefined) {
    return '';
  }

  const parts = [`M ${format(first.x)} ${format(first.y)}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (previous === undefined || current === undefined || next === undefined) {
      continue;
    }

    const incoming = distance(previous, current);
    const outgoing = distance(current, next);

    if (incoming < 0.001 || outgoing < 0.001) {
      continue;
    }

    const corner = Math.min(radius, incoming / 2, outgoing / 2);
    const before = pointTowards(current, previous, corner);
    const after = pointTowards(current, next, corner);

    parts.push(`L ${format(before.x)} ${format(before.y)}`);
    parts.push(
      `Q ${format(current.x)} ${format(current.y)} ${format(after.x)} ${format(after.y)}`,
    );
  }

  const last = points[points.length - 1];
  if (last !== undefined) {
    parts.push(`L ${format(last.x)} ${format(last.y)}`);
  }

  return parts.join(' ');
}

/** Point at half the polyline length, for the wire delete button. */
export function polylineMidpoint(points: readonly Point[]): Point {
  const first = points[0];
  if (first === undefined) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return { ...first };
  }

  const lengths: number[] = [];
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    const length = distance(previous, current);
    lengths.push(length);
    total += length;
  }

  let remaining = total / 2;

  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index] ?? 0;
    const start = points[index];
    const end = points[index + 1];

    if (start === undefined || end === undefined) {
      continue;
    }

    if (remaining <= length || index === lengths.length - 1) {
      const ratio = length < 0.001 ? 0 : remaining / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    remaining -= length;
  }

  return { ...first };
}

/** Marks the grid nodes used by a route so the next wire avoids them. */
export function markRouteOccupied(
  points: readonly Point[],
  occupied: Set<string>,
  cellSize = WIRE_ROUTE_CELL,
): void {
  for (const point of points) {
    const column = Math.round(point.x / cellSize);
    const row = Math.round(point.y / cellSize);

    if (
      Math.abs(point.x - column * cellSize) < 0.5 &&
      Math.abs(point.y - row * cellSize) < 0.5
    ) {
      occupied.add(nodeKey(column, row));
    }
  }
}

export function buildWireObstacles(
  components: readonly CircuitComponent[],
): WireObstacle[] {
  return components.map((component) => {
    const centerX = component.position.x * CELL_SIZE;
    const centerY = component.position.y * CELL_SIZE;
    const sideways =
      component.rotation === 90 || component.rotation === 270;
    const halfWidth = (sideways ? COMPONENT_HEIGHT : COMPONENT_WIDTH) / 2;
    const halfHeight = (sideways ? COMPONENT_WIDTH : COMPONENT_HEIGHT) / 2;

    return {
      componentId: component.id,
      left: centerX - halfWidth,
      top: centerY - halfHeight,
      right: centerX + halfWidth,
      bottom: centerY + halfHeight,
    };
  });
}

interface Node {
  column: number;
  row: number;
}

interface SearchOptions {
  bendPenalty: number;
  occupied: ReadonlySet<string>;
}

const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function astar(
  start: Node,
  end: Node,
  obstacles: readonly WireObstacle[],
  columns: number,
  rows: number,
  cellSize: number,
  options: SearchOptions,
): Point[] | null {
  const startKey = stateKey(start.column, start.row, -1);
  const heap = new MinHeap();
  const cameFrom = new Map<string, string | null>();
  const gScore = new Map<string, number>();
  const nodes = new Map<string, { node: Node; direction: number }>();

  cameFrom.set(startKey, null);
  gScore.set(startKey, 0);
  nodes.set(startKey, { node: start, direction: -1 });
  heap.push(startKey, heuristic(start, end));

  let goal: string | null = null;

  while (heap.size > 0) {
    const entry = heap.pop();

    if (entry === null) {
      break;
    }

    const currentKey = entry.key;
    const current = nodes.get(currentKey);
    const currentCost = gScore.get(currentKey);

    if (current === undefined || currentCost === undefined) {
      continue;
    }

    // A better path to this state was found after this heap entry was queued.
    if (entry.priority > currentCost + heuristic(current.node, end) + 0.001) {
      continue;
    }

    if (current.node.column === end.column && current.node.row === end.row) {
      goal = currentKey;
      break;
    }

    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      const step = DIRECTIONS[direction];
      if (step === undefined) {
        continue;
      }

      const column = current.node.column + step.x;
      const row = current.node.row + step.y;

      if (column < 0 || row < 0 || column > columns || row > rows) {
        continue;
      }

      const point = {
        x: column * cellSize,
        y: row * cellSize,
      };

      if (isInsideObstacle(point, obstacles)) {
        continue;
      }

      const bend =
        current.direction !== -1 && current.direction !== direction
          ? options.bendPenalty
          : 0;
      const occupancy = options.occupied.has(nodeKey(column, row))
        ? WIRE_OCCUPANCY_PENALTY
        : 0;
      const nextKey = stateKey(column, row, direction);
      const tentative = currentCost + 1 + bend + occupancy;

      if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      gScore.set(nextKey, tentative);
      cameFrom.set(nextKey, currentKey);
      nodes.set(nextKey, { node: { column, row }, direction });
      heap.push(nextKey, tentative + heuristic({ column, row }, end));
    }
  }

  if (goal === null) {
    return null;
  }

  const path: Point[] = [];
  let key: string | null = goal;

  while (key !== null) {
    const state = nodes.get(key);
    if (state !== undefined) {
      path.push({
        x: state.node.column * cellSize,
        y: state.node.row * cellSize,
      });
    }
    key = cameFrom.get(key) ?? null;
  }

  return path.reverse();
}

function nearestFreeNode(
  point: Point,
  obstacles: readonly WireObstacle[],
  columns: number,
  rows: number,
  cellSize: number,
): Node | null {
  let best: Node | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let column = 0; column <= columns; column += 1) {
    for (let row = 0; row <= rows; row += 1) {
      const candidate = { x: column * cellSize, y: row * cellSize };

      if (isInsideObstacle(candidate, obstacles)) {
        continue;
      }

      const candidateDistance = distance(point, candidate);
      if (candidateDistance < bestDistance) {
        best = { column, row };
        bestDistance = candidateDistance;
      }
    }
  }

  return best;
}

function isInsideObstacle(
  point: Point,
  obstacles: readonly WireObstacle[],
): boolean {
  return obstacles.some(
    (obstacle) =>
      point.x > obstacle.left &&
      point.x < obstacle.right &&
      point.y > obstacle.top &&
      point.y < obstacle.bottom,
  );
}

interface HeapEntry {
  key: string;
  priority: number;
}

class MinHeap {
  private readonly entries: HeapEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  push(key: string, priority: number): void {
    const entry = { key, priority };
    this.entries.push(entry);
    let index = this.entries.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentEntry = this.entries[parent];

      if (parentEntry === undefined || parentEntry.priority <= priority) {
        break;
      }

      this.entries[index] = parentEntry;
      index = parent;
    }

    this.entries[index] = entry;
  }

  pop(): HeapEntry | null {
    const first = this.entries[0];
    const last = this.entries.pop();

    if (first === undefined) {
      return null;
    }

    if (this.entries.length === 0 || last === undefined) {
      return first;
    }

    let index = 0;

    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      let smallestPriority = last.priority;
      const leftEntry = this.entries[left];
      const rightEntry = this.entries[right];

      if (leftEntry !== undefined && leftEntry.priority < smallestPriority) {
        smallest = left;
        smallestPriority = leftEntry.priority;
      }

      if (rightEntry !== undefined && rightEntry.priority < smallestPriority) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      this.entries[index] = this.entries[smallest] as HeapEntry;
      index = smallest;
    }

    this.entries[index] = last;
    return first;
  }
}

function heuristic(node: Node, end: Node): number {
  return Math.abs(node.column - end.column) + Math.abs(node.row - end.row);
}

function stateKey(column: number, row: number, direction: number): string {
  return `${column},${row},${direction}`;
}

function nodeKey(column: number, row: number): string {
  return `${column},${row}`;
}

function rotateVector(vector: Point, rotation: Rotation): Point {
  let x = vector.x;
  let y = vector.y;

  switch (rotation) {
    case 90:
      x = -vector.y;
      y = vector.x;
      break;
    case 180:
      x = -vector.x;
      y = -vector.y;
      break;
    case 270:
      x = vector.y;
      y = -vector.x;
      break;
    default:
      break;
  }

  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}

function dedupe(points: readonly Point[]): Point[] {
  const result: Point[] = [];

  for (const point of points) {
    const previous = result[result.length - 1];
    if (
      previous === undefined ||
      Math.abs(previous.x - point.x) > 0.001 ||
      Math.abs(previous.y - point.y) > 0.001
    ) {
      result.push({ ...point });
    }
  }

  return result;
}

function simplify(points: readonly Point[]): Point[] {
  if (points.length < 3) {
    return points.map((point) => ({ ...point }));
  }

  const result: Point[] = [points[0] as Point];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = result[result.length - 1];
    const current = points[index];
    const next = points[index + 1];

    if (previous === undefined || current === undefined || next === undefined) {
      continue;
    }

    const sameX =
      Math.abs(previous.x - current.x) < 0.001 &&
      Math.abs(current.x - next.x) < 0.001;
    const sameY =
      Math.abs(previous.y - current.y) < 0.001 &&
      Math.abs(current.y - next.y) < 0.001;

    if (!sameX && !sameY) {
      result.push(current);
    }
  }

  const last = points[points.length - 1];
  if (last !== undefined) {
    result.push(last);
  }

  return result;
}

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height),
  };
}

function pointTowards(from: Point, to: Point, amount: number): Point {
  const length = distance(from, to);
  if (length < 0.001) {
    return { ...from };
  }

  return {
    x: from.x + ((to.x - from.x) / length) * amount,
    y: from.y + ((to.y - from.y) / length) * amount,
  };
}

function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function format(value: number): number {
  return Number(value.toFixed(2));
}
