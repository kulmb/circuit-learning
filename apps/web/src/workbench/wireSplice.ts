import type { Rotation } from '@circuits/shared';

import type { Point } from './pointer';
import type { RenderedWire } from './wireLayout';

export interface WireSpliceTarget {
  wireId: string;
  /** Direction of the original wire from its `from` side to its `to` side. */
  tangent: Point;
  distance: number;
}

interface NearestPoint {
  point: Point;
  tangent: Point;
  distance: number;
}

/**
 * Finds the settled wire under a dropped component. The threshold is in
 * board units, so the caller converts the screen radius with the viewport
 * scale.
 */
export function findWireSpliceTarget(
  routes: readonly RenderedWire[],
  point: Point,
  maxDistance: number,
): WireSpliceTarget | null {
  let best: WireSpliceTarget | null = null;

  for (const route of routes) {
    const nearest = nearestPointOnPolyline(route.points, point);
    if (nearest === null || nearest.distance > maxDistance) {
      continue;
    }

    if (best === null || nearest.distance < best.distance) {
      best = {
        wireId: route.wire.id,
        tangent: nearest.tangent,
        distance: nearest.distance,
      };
    }
  }

  return best;
}

export function nearestPointOnPolyline(
  points: readonly Point[],
  point: Point,
): NearestPoint | null {
  const first = points[0];
  if (first === undefined) {
    return null;
  }

  if (points.length === 1) {
    return {
      point: { ...first },
      tangent: { x: 0, y: 0 },
      distance: Math.hypot(point.x - first.x, point.y - first.y),
    };
  }

  let best: NearestPoint | null = null;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (start === undefined || end === undefined) {
      continue;
    }

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const ratio =
      lengthSquared < 0.001
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((point.x - start.x) * deltaX +
                (point.y - start.y) * deltaY) /
                lengthSquared,
            ),
          );
    const nearest = {
      x: start.x + deltaX * ratio,
      y: start.y + deltaY * ratio,
    };
    const distance = Math.hypot(point.x - nearest.x, point.y - nearest.y);
    const length = Math.sqrt(lengthSquared);

    if (best === null || distance < best.distance) {
      best = {
        point: nearest,
        tangent:
          length < 0.001
            ? { x: 0, y: 0 }
            : { x: deltaX / length, y: deltaY / length },
        distance,
      };
    }
  }

  return best;
}

/**
 * Rotation that puts terminal `a` on the wire's `from` side and terminal `b`
 * on its `to` side (all components have their two terminals on this axis).
 */
export function rotationForTangent(tangent: Point): Rotation {
  if (Math.abs(tangent.x) >= Math.abs(tangent.y)) {
    return tangent.x >= 0 ? 0 : 180;
  }

  return tangent.y >= 0 ? 90 : 270;
}
