import { describe, expect, it } from 'vitest';

import {
  boardScale,
  boardToScreen,
  clampView,
  defaultView,
  fitScale,
  formatViewBox,
  isDefaultView,
  isTerminalTooSmall,
  MAX_ZOOM,
  measureElementRect,
  MIN_ZOOM,
  screenToBoard,
  terminalHitPx,
  viewBoxFor,
  viewForAnchor,
  wheelZoomFactor,
  zoomAt,
  type BoardView,
  type Rect,
} from './viewport';

const BOARD = { width: 768, height: 512 };
const ELEMENT: Rect = { left: 40, top: 20, width: 1000, height: 400 };
const VIEW: BoardView = { zoom: 1, center: { x: 384, y: 256 } };

function expectPoint(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
): void {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
}

describe('board view', () => {
  it('starts with the whole board and centers it', () => {
    expect(defaultView(BOARD)).toEqual({
      zoom: 1,
      center: { x: 384, y: 256 },
    });
    expect(viewBoxFor(VIEW, BOARD)).toEqual({
      left: 0,
      top: 0,
      width: 768,
      height: 512,
    });
  });

  it('clamps zoom between 0.75 and 2.5', () => {
    expect(clampView({ ...VIEW, zoom: 0.1 }, BOARD).zoom).toBe(MIN_ZOOM);
    expect(clampView({ ...VIEW, zoom: 9 }, BOARD).zoom).toBe(MAX_ZOOM);
    expect(clampView({ ...VIEW, zoom: Number.NaN }, BOARD).zoom).toBe(1);
  });

  it('keeps the visible window inside the board when zoomed in', () => {
    const clamped = clampView(
      { zoom: 2, center: { x: -200, y: 9999 } },
      BOARD,
    );

    expect(clamped.center).toEqual({ x: 192, y: 384 });
  });

  it('centers a zoomed-out board with margins', () => {
    const clamped = clampView(
      { zoom: 0.75, center: { x: 10, y: 10 } },
      BOARD,
    );

    expect(clamped.center).toEqual({ x: 384, y: 256 });
  });

  it('detects the default view after clamping', () => {
    expect(isDefaultView(VIEW, BOARD)).toBe(true);
    expect(isDefaultView(zoomAt(VIEW, 2, { x: 384, y: 256 }, BOARD), BOARD)).toBe(
      false,
    );
  });
});

describe('fit scale', () => {
  it('letterboxes a wide element', () => {
    expect(fitScale(ELEMENT, BOARD)).toBeCloseTo(400 / 512, 5);
  });

  it('letterboxes a tall element', () => {
    expect(fitScale({ width: 400, height: 1000 }, BOARD)).toBeCloseTo(
      400 / 768,
      5,
    );
  });

  it('falls back to 1 before layout is measured', () => {
    expect(fitScale({ width: 0, height: 0 }, BOARD)).toBe(1);
  });

  it('multiplies the fit scale by the zoom', () => {
    expect(boardScale(ELEMENT, { ...VIEW, zoom: 2 }, BOARD)).toBeCloseTo(
      (400 / 512) * 2,
      5,
    );
  });
});

describe('screen to board conversion', () => {
  it('round-trips through the letterbox', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 768, y: 512 },
      { x: 384, y: 256 },
      { x: 123.5, y: 456.25 },
    ];

    for (const point of points) {
      const screen = boardToScreen(point, ELEMENT, VIEW, BOARD);
      expectPoint(screenToBoard(screen, ELEMENT, VIEW, BOARD), point);
    }
  });

  it('round-trips while zoomed and panned', () => {
    const view: BoardView = { zoom: 2.5, center: { x: 300, y: 400 } };
    const point = { x: 260, y: 350 };
    const screen = boardToScreen(point, ELEMENT, view, BOARD);

    expectPoint(screenToBoard(screen, ELEMENT, view, BOARD), point);
  });

  it('maps the element center to the view center', () => {
    const screen = {
      x: ELEMENT.left + ELEMENT.width / 2,
      y: ELEMENT.top + ELEMENT.height / 2,
    };

    expectPoint(screenToBoard(screen, ELEMENT, VIEW, BOARD), VIEW.center);
  });

  it('keeps the same viewBox when the screen rotates, only remapping it', () => {
    const portrait: Rect = { left: 0, top: 0, width: 480, height: 900 };
    const before = viewBoxFor(VIEW, BOARD);
    const after = viewBoxFor(VIEW, BOARD);

    expect(after).toEqual(before);

    const boardCenter = boardToScreen(VIEW.center, ELEMENT, VIEW, BOARD);
    expectPoint(boardCenter, {
      x: ELEMENT.left + ELEMENT.width / 2,
      y: ELEMENT.top + ELEMENT.height / 2,
    });

    const rotatedCenter = boardToScreen(VIEW.center, portrait, VIEW, BOARD);
    expectPoint(rotatedCenter, {
      x: portrait.width / 2,
      y: portrait.height / 2,
    });
  });
});

describe('zoom and pan', () => {
  it('keeps the anchored board point under the pointer', () => {
    const client = { x: 400, y: 300 };
    const anchor = screenToBoard(client, ELEMENT, VIEW, BOARD);
    const zoomed = zoomAt(VIEW, 2, anchor, BOARD);

    expect(zoomed.zoom).toBe(2);
    expectPoint(boardToScreen(anchor, ELEMENT, zoomed, BOARD), client);
  });

  it('builds a view for an anchor after a pinch', () => {
    const client = { x: 610, y: 230 };
    const anchor = { x: 500, y: 300 };
    const view = viewForAnchor(anchor, client, 2, ELEMENT, BOARD);

    expect(view.zoom).toBe(2);
    expectPoint(boardToScreen(anchor, ELEMENT, view, BOARD), client);
  });

  it('clamps the anchor view at the board edge', () => {
    const view = viewForAnchor(
      { x: 0, y: 0 },
      { x: 1080, y: 700 },
      2,
      ELEMENT,
      BOARD,
    );

    expect(view.center).toEqual({ x: 192, y: 128 });
  });

  it('normalizes wheel deltas into bounded zoom factors', () => {
    expect(wheelZoomFactor(0)).toBe(1);
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(-100000)).toBe(2);
    expect(wheelZoomFactor(100000)).toBe(0.5);
    expect(wheelZoomFactor(-3, 1)).toBeGreaterThan(wheelZoomFactor(-3, 0));
  });
});

describe('terminal hit area', () => {
  it('switches to pan mode when terminals are smaller than 44 px', () => {
    expect(terminalHitPx(0.687)).toBeCloseTo(43.968, 3);
    expect(isTerminalTooSmall(0.687)).toBe(true);
    expect(isTerminalTooSmall(0.688)).toBe(false);
  });
});

describe('measurement fallback', () => {
  it('uses the board size when the element has no layout yet', () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      }),
    } as unknown as Element;

    expect(measureElementRect(element, BOARD)).toEqual({
      left: 0,
      top: 0,
      width: 768,
      height: 512,
    });
  });

  it('keeps a measured rectangle', () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 400,
        height: 300,
      }),
    } as unknown as Element;

    expect(measureElementRect(element, BOARD)).toEqual({
      left: 10,
      top: 20,
      width: 400,
      height: 300,
    });
  });

  it('formats a stable viewBox string', () => {
    expect(
      formatViewBox({ left: 0, top: 0, width: 768, height: 512 }),
    ).toBe('0 0 768 512');
    expect(
      formatViewBox({ left: 1.23456, top: -0.5, width: 100, height: 50 }),
    ).toBe('1.23 -0.5 100 50');
  });
});
