import { describe, expect, it } from 'vitest';

import {
  applyTouchOffset,
  buildStraightWirePath,
  buildWireMidpoint,
  buildWirePath,
  clampGridPosition,
  decidePaletteGesture,
  findNearestTerminal,
  gridToSvg,
  isDragGesture,
  isPointInsideBoard,
  paletteScrollAxis,
  snapToGrid,
  svgToGrid,
  type TerminalCandidate,
} from './pointer';

const terminal = (componentId: string, terminalId: string, x: number, y: number): TerminalCandidate => ({
  ref: { componentId, terminalId },
  point: { x, y },
});

describe('pointer gestures', () => {
  it('treats a small movement as a tap', () => {
    expect(isDragGesture({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
  });

  it('treats a movement longer than 8px as a drag', () => {
    expect(isDragGesture({ x: 0, y: 0 }, { x: 6, y: 6 })).toBe(true);
  });
});

describe('palette gestures', () => {
  it('finds the axis the palette can scroll on', () => {
    expect(
      paletteScrollAxis({
        scrollWidth: 1000,
        clientWidth: 800,
        scrollHeight: 300,
        clientHeight: 300,
      }),
    ).toBe('x');
    expect(
      paletteScrollAxis({
        scrollWidth: 200,
        clientWidth: 200,
        scrollHeight: 600,
        clientHeight: 300,
      }),
    ).toBe('y');
    expect(
      paletteScrollAxis({
        scrollWidth: 200,
        clientWidth: 200,
        scrollHeight: 300,
        clientHeight: 300,
      }),
    ).toBeNull();
    expect(paletteScrollAxis(null)).toBeNull();
  });

  it('waits for a clear movement before choosing', () => {
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: 3, y: 4 }, 'x'),
    ).toBe('pending');
  });

  it('browses a horizontal tray when the swipe follows it', () => {
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: -60, y: 8 }, 'x'),
    ).toBe('scroll');
  });

  it('pulls a component out when the touch leaves the scroll axis', () => {
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: 10, y: -60 }, 'x'),
    ).toBe('drag');
  });

  it('scrolls a vertical sidebar but drags horizontally', () => {
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: 5, y: 50 }, 'y'),
    ).toBe('scroll');
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: 50, y: 5 }, 'y'),
    ).toBe('drag');
  });

  it('always drags when the palette needs no scrolling', () => {
    expect(
      decidePaletteGesture({ x: 0, y: 0 }, { x: 60, y: 8 }, null),
    ).toBe('drag');
  });
});

describe('grid snapping', () => {
  it('rounds a position to the nearest cell', () => {
    expect(snapToGrid({ x: 2.4, y: 3.6 })).toEqual({ x: 2, y: 4 });
  });

  it('keeps a component inside the board', () => {
    expect(clampGridPosition({ x: -4, y: 99 }, 12, 8)).toEqual({ x: 1, y: 7 });
  });

  it('converts between grid and SVG coordinates', () => {
    expect(gridToSvg({ x: 2, y: 3 }, 64)).toEqual({ x: 128, y: 192 });
    expect(svgToGrid({ x: 128, y: 192 }, 64)).toEqual({ x: 2, y: 3 });
  });
});

describe('touch offset', () => {
  it('lifts a touch drag above the finger', () => {
    expect(applyTouchOffset({ x: 100, y: 120 }, 'touch', 40)).toEqual({ x: 100, y: 80 });
  });

  it('does not move a mouse drag', () => {
    expect(applyTouchOffset({ x: 100, y: 120 }, 'mouse', 40)).toEqual({ x: 100, y: 120 });
  });
});

describe('terminal snapping', () => {
  const terminals = [
    terminal('battery', 'positive', 100, 100),
    terminal('bulb', 'a', 200, 100),
    terminal('bulb', 'b', 260, 100),
  ];

  it('finds the closest terminal inside the snap radius', () => {
    expect(findNearestTerminal({ x: 112, y: 104 }, terminals, 30)?.ref).toEqual({
      componentId: 'battery',
      terminalId: 'positive',
    });
  });

  it('returns null when no terminal is close enough', () => {
    expect(findNearestTerminal({ x: 150, y: 100 }, terminals, 30)).toBeNull();
  });
});

describe('wire path', () => {
  it('starts and ends at the terminals', () => {
    const path = buildWirePath({ x: 0, y: 0 }, { x: 100, y: 0 });

    expect(path).toBe('M 0 0 Q 50 25 100 0');
  });

  it('bows a short loop far enough to clear the component body', () => {
    const path = buildWirePath({ x: 0, y: 0 }, { x: 80, y: 0 }, 96, 0.75);

    expect(path).toBe('M 0 0 Q 40 60 80 0');
  });

  it('places the delete button on the curved midpoint', () => {
    expect(buildWireMidpoint({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({
      x: 50,
      y: 12.5,
    });
  });

  it('draws the dashed preview as a straight segment', () => {
    expect(buildStraightWirePath({ x: 0, y: 0 }, { x: 100, y: 40 })).toBe(
      'M 0 0 L 100 40',
    );
  });
});

describe('board bounds', () => {
  it('accepts points inside the board and rejects points outside', () => {
    expect(isPointInsideBoard({ x: 0, y: 0 }, 768, 512)).toBe(true);
    expect(isPointInsideBoard({ x: 768, y: 512 }, 768, 512)).toBe(true);
    expect(isPointInsideBoard({ x: -1, y: 10 }, 768, 512)).toBe(false);
    expect(isPointInsideBoard({ x: 10, y: 513 }, 768, 512)).toBe(false);
  });
});
