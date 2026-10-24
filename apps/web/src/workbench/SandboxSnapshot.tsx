import {
  getTerminalWorldPosition,
  terminalKey,
  type Circuit,
  type CircuitSimulation,
} from '@circuits/shared';

import { ComponentBlock } from './ComponentBlock';
import { CELL_SIZE, type BoardDimensions } from './constants';
import type { DisplayMode } from './displayMode';
import { buildWirePath, type Point } from './pointer';

export interface SandboxSnapshotProps {
  circuit: Circuit;
  simulation: CircuitSimulation;
  displayMode: DisplayMode;
  board: BoardDimensions;
  svgRef: (node: SVGSVGElement | null) => void;
}

/**
 * Clean, non-interactive copy of the board used to make a PNG photo.
 * It stays off-screen and is only mounted while the workshop panel is open.
 * All styling is carried by SVG attributes so serialization does not lose it.
 */
export function SandboxSnapshot({
  circuit,
  simulation,
  displayMode,
  board,
  svgRef,
}: SandboxSnapshotProps) {
  const points = new Map<string, Point>();

  for (const component of circuit.components) {
    for (const terminal of component.terminals) {
      const world = getTerminalWorldPosition(component, terminal.id);
      points.set(
        terminalKey({ componentId: component.id, terminalId: terminal.id }),
        { x: world.x * CELL_SIZE, y: world.y * CELL_SIZE },
      );
    }
  }

  const shortWireIds = new Set(simulation.shortCircuitInfo?.wireIds ?? []);
  const wires = circuit.wires.flatMap((wire) => {
    const from = points.get(terminalKey(wire.from));
    const to = points.get(terminalKey(wire.to));

    if (from === undefined || to === undefined) {
      return [];
    }

    const isLoop = wire.from.componentId === wire.to.componentId;
    const isShort =
      simulation.shortCircuit &&
      (shortWireIds.size === 0 || shortWireIds.has(wire.id));

    return [
      {
        id: wire.id,
        path: buildWirePath(
          from,
          to,
          isLoop ? 96 : 36,
          isLoop ? 0.75 : 0.25,
        ),
        isShort,
      },
    ];
  });

  return (
    <div className="sandbox-snapshot" aria-hidden="true">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width={board.width}
        height={board.height}
        viewBox={`0 0 ${board.width} ${board.height}`}
        fontFamily="Nunito, system-ui, sans-serif"
      >
        <defs>
          <pattern
            id="sandbox-snapshot-grid"
            width={CELL_SIZE}
            height={CELL_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
              fill="none"
              stroke="#d7e3ee"
              strokeWidth={1.5}
            />
          </pattern>
        </defs>

        <rect width={board.width} height={board.height} fill="#f7fbff" />
        <rect
          width={board.width}
          height={board.height}
          fill="url(#sandbox-snapshot-grid)"
        />

        {wires.map((wire) => (
          <path
            key={wire.id}
            d={wire.path}
            fill="none"
            stroke={wire.isShort ? '#ef4444' : '#355070'}
            strokeWidth={8}
            strokeLinecap="round"
          />
        ))}

        {circuit.components.map((component) => (
          <ComponentBlock
            key={component.id}
            component={component}
            state={simulation.states[component.id]}
            selected={false}
            displayMode={displayMode}
            short={simulation.shortCircuit}
            hinted={false}
            locked={false}
            showTerminals={false}
          />
        ))}
      </svg>
    </div>
  );
}
