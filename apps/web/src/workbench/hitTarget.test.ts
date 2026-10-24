import { createComponent } from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import { CELL_SIZE } from './constants';
import {
  BODY_HIT_HALF_HEIGHT,
  BODY_HIT_HALF_WIDTH,
  isInsideBodyHitZone,
} from './hitTarget';

const switchAt = (rotation: 0 | 90 | 180 | 270) =>
  createComponent('switch', {
    id: 'switch-1',
    position: { x: 5, y: 4 },
    rotation,
    closed: false,
  });

describe('component tap zones', () => {
  const center = { x: 5 * CELL_SIZE, y: 4 * CELL_SIZE };

  it('treats the middle of the component as the body', () => {
    expect(isInsideBodyHitZone(switchAt(0), center)).toBe(true);
    expect(
      isInsideBodyHitZone(switchAt(0), {
        x: center.x + BODY_HIT_HALF_WIDTH - 1,
        y: center.y,
      }),
    ).toBe(true);
  });

  it('treats the terminal ends as terminals, not the body', () => {
    expect(
      isInsideBodyHitZone(switchAt(0), {
        x: center.x - 0.6 * CELL_SIZE,
        y: center.y,
      }),
    ).toBe(false);
    expect(
      isInsideBodyHitZone(switchAt(0), {
        x: center.x + 0.6 * CELL_SIZE,
        y: center.y,
      }),
    ).toBe(false);
  });

  it('rotates the body zone with the component', () => {
    expect(
      isInsideBodyHitZone(switchAt(90), {
        x: center.x,
        y: center.y + BODY_HIT_HALF_WIDTH - 1,
      }),
    ).toBe(true);
    expect(
      isInsideBodyHitZone(switchAt(90), {
        x: center.x + 0.6 * CELL_SIZE,
        y: center.y,
      }),
    ).toBe(false);
  });

  it('extends the body zone vertically to a full grid cell', () => {
    expect(BODY_HIT_HALF_HEIGHT).toBe(CELL_SIZE / 2);
    expect(
      isInsideBodyHitZone(switchAt(0), {
        x: center.x,
        y: center.y + BODY_HIT_HALF_HEIGHT - 1,
      }),
    ).toBe(true);
  });
});
