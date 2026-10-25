import {
  type Circuit,
  type CircuitSimulation,
} from '@circuits/shared';

import { ComponentBlock } from './ComponentBlock';
import { CELL_SIZE, type BoardDimensions } from './constants';
import type { DisplayMode } from './displayMode';
import { renderAllWires, terminalPointMap } from './wireLayout';

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
  const points = terminalPointMap(circuit.components);
  const shortWireIds = new Set(simulation.shortCircuitInfo?.wireIds ?? []);
  const wires = renderAllWires(
    circuit.wires,
    circuit.components,
    points,
    board,
  ).map((wire) => ({
    ...wire,
    isShort:
      simulation.shortCircuit &&
      (shortWireIds.size === 0 || shortWireIds.has(wire.wire.id)),
  }));

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
          <g key={wire.wire.id} data-snapshot-wire-id={wire.wire.id}>
            {/* Match the live board: a light casing keeps the cable readable
                over the grid and separates crossing wires. */}
            <path
              d={wire.path}
              fill="none"
              stroke="#f7fbff"
              strokeWidth={15}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={wire.path}
              fill="none"
              stroke={wire.isShort ? '#ef4444' : '#355070'}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
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
