import { createComponent } from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import {
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
  createBoardDimensions,
} from './constants';
import {
  componentScreenBox,
  componentOverlaps,
} from './trashTarget';
import { defaultView } from './viewport';

const board = createBoardDimensions(12, 8);
const element = { left: 0, top: 0, width: 768, height: 512 };
const view = defaultView(board);
const bulb = createComponent('bulb', {
  id: 'bulb-1',
  position: { x: 8, y: 4 },
});
const position = { x: 8, y: 4 };

describe('component trash target', () => {
  it('uses the visible component body, not the pointer position', () => {
    const box = componentScreenBox(bulb, position, element, view, board);

    expect(box).toEqual({
      left: 512 - COMPONENT_WIDTH / 2,
      top: 256 - COMPONENT_HEIGHT / 2,
      right: 512 + COMPONENT_WIDTH / 2,
      bottom: 256 + COMPONENT_HEIGHT / 2,
    });

    expect(
      componentOverlaps(bulb, position, element, view, board, {
        left: 450,
        top: 220,
        right: 480,
        bottom: 240,
      }),
    ).toBe(true);
    expect(
      componentOverlaps(bulb, position, element, view, board, {
        left: 600,
        top: 300,
        right: 660,
        bottom: 360,
      }),
    ).toBe(false);
  });

  it('swaps the body dimensions when the component is turned', () => {
    const turned = { ...bulb, rotation: 90 as const };
    const box = componentScreenBox(turned, position, element, view, board);

    expect(box.right - box.left).toBeCloseTo(COMPONENT_HEIGHT, 5);
    expect(box.bottom - box.top).toBeCloseTo(COMPONENT_WIDTH, 5);
  });

  it('accepts a small contact margin around the trash', () => {
    const target = {
      left: 512 + COMPONENT_WIDTH / 2 + 2,
      top: 256,
      right: 650,
      bottom: 300,
    };

    expect(
      componentOverlaps(bulb, position, element, view, board, target, 4),
    ).toBe(true);
    expect(
      componentOverlaps(bulb, position, element, view, board, target, 0),
    ).toBe(false);
  });
});
