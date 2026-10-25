import { describe, expect, it } from 'vitest';

import type { RenderedWire } from './wireLayout';
import {
  findWireSpliceTarget,
  nearestPointOnPolyline,
  rotationForTangent,
} from './wireSplice';

function route(id: string, points: Array<{ x: number; y: number }>): RenderedWire {
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;

  return {
    wire: {
      id,
      from: { componentId: 'a', terminalId: 'a' },
      to: { componentId: 'b', terminalId: 'b' },
    },
    from: first,
    to: last,
    path: '',
    mid: first,
    points,
  };
}

describe('wire splice target', () => {
  it('finds the nearest wire under the drop point', () => {
    const routes = [
      route('top', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      route('bottom', [
        { x: 0, y: 40 },
        { x: 100, y: 40 },
      ]),
    ];

    expect(findWireSpliceTarget(routes, { x: 50, y: 36 }, 10)?.wireId).toBe(
      'bottom',
    );
    expect(findWireSpliceTarget(routes, { x: 50, y: 36 }, 2)).toBeNull();
  });

  it('returns the tangent in the wire from → to direction', () => {
    const horizontal = nearestPointOnPolyline(
      [
        { x: 100, y: 0 },
        { x: 0, y: 0 },
      ],
      { x: 50, y: 8 },
    );
    const vertical = nearestPointOnPolyline(
      [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
      { x: 6, y: 50 },
    );

    expect(horizontal?.tangent).toEqual({ x: -1, y: 0 });
    expect(horizontal?.distance).toBe(8);
    expect(vertical?.tangent).toEqual({ x: 0, y: 1 });
  });

  it('maps a tangent to a rotation where terminal a faces the from side', () => {
    expect(rotationForTangent({ x: 1, y: 0 })).toBe(0);
    expect(rotationForTangent({ x: 0, y: 1 })).toBe(90);
    expect(rotationForTangent({ x: -1, y: 0 })).toBe(180);
    expect(rotationForTangent({ x: 0, y: -1 })).toBe(270);
  });
});
