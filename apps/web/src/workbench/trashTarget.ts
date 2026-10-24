import type { CircuitComponent } from '@circuits/shared';

import {
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
  type BoardDimensions,
} from './constants';
import type { Point } from './pointer';
import {
  boardScale,
  boardToScreen,
  type BoardView,
  type Rect,
} from './viewport';

export interface ScreenBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Visible body of a component, in client coordinates. */
export function componentScreenBox(
  component: CircuitComponent,
  position: Point,
  element: Rect,
  view: BoardView,
  board: BoardDimensions,
): ScreenBox {
  const center = boardToScreen(
    { x: position.x * CELL_SIZE, y: position.y * CELL_SIZE },
    element,
    view,
    board,
  );
  const scale = boardScale(element, view, board);
  const turned = component.rotation === 90 || component.rotation === 270;
  const width = (turned ? COMPONENT_HEIGHT : COMPONENT_WIDTH) * scale;
  const height = (turned ? COMPONENT_WIDTH : COMPONENT_HEIGHT) * scale;

  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    right: center.x + width / 2,
    bottom: center.y + height / 2,
  };
}

/**
 * The trash receives a dragged component when their visible boxes touch, not
 * when the finger or pointer enters the trash. This matters on touch screens,
 * where the component is drawn 40 px above the finger.
 */
export function componentOverlaps(
  component: CircuitComponent,
  position: Point,
  element: Rect,
  view: BoardView,
  board: BoardDimensions,
  target: Pick<ScreenBox, 'left' | 'top' | 'right' | 'bottom'>,
  margin = 4,
): boolean {
  const box = componentScreenBox(component, position, element, view, board);

  return (
    box.left <= target.right + margin &&
    box.right >= target.left - margin &&
    box.top <= target.bottom + margin &&
    box.bottom >= target.top - margin
  );
}
