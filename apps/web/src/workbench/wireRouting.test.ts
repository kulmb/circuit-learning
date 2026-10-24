import { createComponent } from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import { COMPONENT_HEIGHT, COMPONENT_WIDTH } from './constants';
import {
  buildWireObstacles,
  escapePoint,
  markRouteOccupied,
  polylineMidpoint,
  roundedPolylinePath,
  routeWire,
  terminalOutwardDirection,
  type WireEndpoint,
  type WireObstacle,
} from './wireRouting';

const endpoint = (
  componentId: string,
  x: number,
  y: number,
  direction: { x: number; y: number },
): WireEndpoint => ({
  componentId,
  point: { x, y },
  direction,
});

const board = { boardWidth: 768, boardHeight: 512 };

function inside(point: { x: number; y: number }, obstacle: WireObstacle) {
  return (
    point.x > obstacle.left &&
    point.x < obstacle.right &&
    point.y > obstacle.top &&
    point.y < obstacle.bottom
  );
}

describe('terminal directions', () => {
  it('points away from the component on each rotation', () => {
    const base = createComponent('battery', {
      id: 'battery-1',
      position: { x: 3, y: 3 },
    });

    expect(terminalOutwardDirection(base, 'positive')).toEqual({ x: -1, y: 0 });
    expect(terminalOutwardDirection(base, 'negative')).toEqual({ x: 1, y: 0 });
    expect(
      terminalOutwardDirection({ ...base, rotation: 90 }, 'positive'),
    ).toEqual({ x: 0, y: -1 });
    expect(
      terminalOutwardDirection({ ...base, rotation: 180 }, 'positive'),
    ).toEqual({ x: 1, y: 0 });
    expect(
      terminalOutwardDirection({ ...base, rotation: 270 }, 'positive'),
    ).toEqual({ x: 0, y: 1 });
  });

  it('starts the escape stub outside the component body', () => {
    const start = endpoint('a', 100, 200, { x: 1, y: 0 });
    expect(escapePoint(start)).toEqual({ x: 122, y: 200 });
  });
});

describe('wire obstacles', () => {
  it('swaps width and height for a rotated component', () => {
    const base = createComponent('bulb', {
      id: 'bulb-1',
      position: { x: 5, y: 4 },
    });
    const [horizontal] = buildWireObstacles([base]);
    const [vertical] = buildWireObstacles([{ ...base, rotation: 90 }]);

    if (horizontal === undefined || vertical === undefined) {
      throw new Error('Obstacle missing');
    }

    expect(horizontal.right - horizontal.left).toBeCloseTo(COMPONENT_WIDTH);
    expect(vertical.right - vertical.left).toBeCloseTo(COMPONENT_HEIGHT);
    expect(vertical.bottom - vertical.top).toBeCloseTo(COMPONENT_WIDTH);
  });
});

describe('wire routing', () => {
  const obstacle: WireObstacle = {
    componentId: 'bulb',
    left: 250,
    top: 150,
    right: 350,
    bottom: 250,
  };

  it('routes around a component instead of through it', () => {
    const route = routeWire(
      endpoint('battery', 100, 200, { x: 1, y: 0 }),
      endpoint('motor', 500, 200, { x: -1, y: 0 }),
      { ...board, obstacles: [obstacle] },
    );

    expect(route.fallback).toBe(false);
    expect(
      route.points.some(
        (point) => point.y < obstacle.top || point.y > obstacle.bottom,
      ),
    ).toBe(true);
    expect(route.points.some((point) => inside(point, obstacle))).toBe(false);
  });

  it('routes a same-component loop around the body', () => {
    const body: WireObstacle = {
      componentId: 'battery',
      left: 55,
      top: 70,
      right: 145,
      bottom: 130,
    };
    const route = routeWire(
      // The two terminals live on opposite sides of the body.
      endpoint('battery', 61.6, 100, { x: -1, y: 0 }),
      endpoint('battery', 138.4, 100, { x: 1, y: 0 }),
      { ...board, obstacles: [body] },
    );

    expect(route.fallback).toBe(false);
    expect(
      route.points.some(
        (point) => point.y < body.top || point.y > body.bottom,
      ),
    ).toBe(true);
    expect(
      route.points
        .slice(1, -1)
        .some((point) => inside(point, body)),
    ).toBe(false);
  });

  it('keeps the routed path within the board', () => {
    const route = routeWire(
      endpoint('battery', 10, 10, { x: -1, y: 0 }),
      endpoint('motor', 758, 502, { x: 1, y: 0 }),
      { ...board, obstacles: [obstacle] },
    );

    for (const point of route.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(board.boardWidth);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(board.boardHeight);
    }
  });

  it('keeps parallel wires on different lanes', () => {
    const occupied = new Set<string>();
    const first = routeWire(
      endpoint('battery', 100, 200, { x: 1, y: 0 }),
      endpoint('bulb', 600, 200, { x: -1, y: 0 }),
      { ...board, obstacles: [], occupied },
    );
    markRouteOccupied(first.points, occupied);
    const second = routeWire(
      endpoint('battery', 100, 210, { x: 1, y: 0 }),
      endpoint('bulb', 600, 210, { x: -1, y: 0 }),
      { ...board, obstacles: [], occupied },
    );

    const lane = (points: { x: number; y: number }[]) =>
      points.find(
        (point) =>
          point.x % 16 === 0 &&
          point.y % 16 === 0 &&
          point.x > 122 &&
          point.x < 578,
      )?.y;

    expect(lane(first.points)).toBeDefined();
    expect(lane(first.points)).not.toBe(lane(second.points));
  });
});

describe('wire path helpers', () => {
  it('rounds corners with quadratic curves', () => {
    const path = roundedPolylinePath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);

    expect(path).toMatch(/^M 0 0 /);
    expect(path).toContain('Q 100 0');
    expect(path).toMatch(/100 100$/);
  });

  it('finds the midpoint by arc length, not by endpoints', () => {
    expect(
      polylineMidpoint([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]),
    ).toEqual({ x: 100, y: 0 });
  });

  it('marks only grid-aligned nodes as occupied', () => {
    const occupied = new Set<string>();
    markRouteOccupied(
      [
        { x: 0, y: 0 },
        { x: 16, y: 16 },
        { x: 25.6, y: 40 },
      ],
      occupied,
    );

    expect([...occupied]).toEqual(['0,0', '1,1']);
  });
});
