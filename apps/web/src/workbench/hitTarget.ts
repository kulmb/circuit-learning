import type { CircuitComponent } from '@circuits/shared';

import { CELL_SIZE } from './constants';
import type { Point } from './pointer';

/**
 * A component is split into two tap zones:
 * - the central body zone selects it (and toggles a switch),
 * - the outer terminal zone starts or ends a wire.
 *
 * The terminal hit circles are deliberately large for touch, so they overlap
 * most of the component. Without this body-first rule, tapping a switch near
 * its centre would start a wire instead of flipping the switch.
 */
export const BODY_HIT_HALF_WIDTH = 0.42 * CELL_SIZE;
export const BODY_HIT_HALF_HEIGHT = 0.5 * CELL_SIZE;

export function isInsideBodyHitZone(
  component: CircuitComponent,
  point: Point,
): boolean {
  const local = toLocalPoint(
    point.x - component.position.x * CELL_SIZE,
    point.y - component.position.y * CELL_SIZE,
    component.rotation,
  );

  return (
    Math.abs(local.x) <= BODY_HIT_HALF_WIDTH &&
    Math.abs(local.y) <= BODY_HIT_HALF_HEIGHT
  );
}

/** Converts a world-space offset into the component's local axes. */
export function toLocalPoint(
  offsetX: number,
  offsetY: number,
  rotation: CircuitComponent['rotation'],
): Point {
  switch (rotation) {
    case 90:
      return { x: offsetY, y: -offsetX };
    case 180:
      return { x: -offsetX, y: -offsetY };
    case 270:
      return { x: -offsetY, y: offsetX };
    default:
      return { x: offsetX, y: offsetY };
  }
}
