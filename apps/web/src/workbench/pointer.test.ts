import { describe, expect, it } from 'vitest';

import {
  applyTouchOffset,
  buildWirePath,
  clampGridPosition,
  findNearestTerminal,
  gridToSvg,
  isDragGesture,
  isPointInsideBoard,
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
});

describe('board bounds', () => {
  it('accepts points inside the board and rejects points outside', () => {
    expect(isPointInsideBoard({ x: 0, y: 0 }, 768, 512)).toBe(true);
    expect(isPointInsideBoard({ x: 768, y: 512 }, 768, 512)).toBe(true);
    expect(isPointInsideBoard({ x: -1, y: 10 }, 768, 512)).toBe(false);
    expect(isPointInsideBoard({ x: 10, y: 513 }, 768, 512)).toBe(false);
  });
});
