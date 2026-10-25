import {
  getTerminalWorldPosition,
  terminalKey,
  type CircuitComponent,
  type Wire,
} from '@circuits/shared';

import { CELL_SIZE, type BoardDimensions } from './constants';
import {
  buildWireMidpoint,
  buildWirePath,
  gridToSvg,
  type Point,
} from './pointer';
import {
  buildWireObstacles,
  markRouteOccupied,
  polylineMidpoint,
  routeWire,
  roundedPolylinePath,
  wireEndpoint,
} from './wireRouting';

export interface RenderedWire {
  wire: Wire;
  from: Point;
  to: Point;
  path: string;
  mid: Point;
  /** Settled route in board coordinates, used for hit-testing. */
  points: Point[];
}

export function terminalPointMap(
  components: readonly CircuitComponent[],
): Map<string, Point> {
  const points = new Map<string, Point>();

  for (const component of components) {
    for (const terminal of component.terminals) {
      const world = getTerminalWorldPosition(component, terminal.id);
      points.set(
        terminalKey({ componentId: component.id, terminalId: terminal.id }),
        gridToSvg(world, CELL_SIZE),
      );
    }
  }

  return points;
}

export function fallbackWireVisual(
  wire: Wire,
  from: Point,
  to: Point,
): Pick<RenderedWire, 'path' | 'mid'> {
  // A wire joining two terminals of the same component (a direct short)
  // would otherwise run straight under the component body and stay
  // invisible and impossible to select. Bow it wide enough to be seen.
  const isLoop = wire.from.componentId === wire.to.componentId;
  const curve = isLoop ? 96 : 36;
  const control = isLoop ? 0.75 : 0.25;

  return {
    path: buildWirePath(from, to, curve, control),
    mid: buildWireMidpoint(from, to, curve, control),
  };
}

/**
 * Routes every wire from the settled component positions. While a component
 * moves, this base result keeps the other wires exactly as they were; only
 * the wires attached to the dragged component are recomputed.
 */
export function renderAllWires(
  wires: ReadonlyArray<Wire>,
  components: readonly CircuitComponent[],
  points: ReadonlyMap<string, Point>,
  board: BoardDimensions,
): RenderedWire[] {
  const rendered: RenderedWire[] = [];
  const componentsById = new Map(
    components.map((component) => [component.id, component]),
  );
  const obstacles = buildWireObstacles(components);
  const occupied = new Set<string>();

  for (const wire of wires) {
    const from = points.get(terminalKey(wire.from));
    const to = points.get(terminalKey(wire.to));

    if (from === undefined || to === undefined) {
      continue;
    }

    const fallback = fallbackWireVisual(wire, from, to);
    const fromComponent = componentsById.get(wire.from.componentId);
    const toComponent = componentsById.get(wire.to.componentId);

    if (fromComponent === undefined || toComponent === undefined) {
      rendered.push({
        wire,
        from,
        to,
        points: [from, to],
        ...fallback,
      });
      continue;
    }

    const route = routeWire(
      wireEndpoint(fromComponent, wire.from.terminalId, from),
      wireEndpoint(toComponent, wire.to.terminalId, to),
      {
        boardWidth: board.width,
        boardHeight: board.height,
        obstacles,
        occupied,
      },
    );

    if (route.fallback) {
      rendered.push({
        wire,
        from,
        to,
        points: [from, to],
        ...fallback,
      });
      continue;
    }

    markRouteOccupied(route.points, occupied);
    rendered.push({
      wire,
      from,
      to,
      points: route.points,
      path: roundedPolylinePath(route.points),
      mid: polylineMidpoint(route.points),
    });
  }

  return rendered;
}
