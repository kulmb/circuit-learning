import {
  createComponent,
  createWire,
  simulateCircuit,
  type Circuit,
} from '@circuits/shared';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SandboxSnapshot } from './SandboxSnapshot';
import { boardForLevel } from './constants';
import { renderAllWires, terminalPointMap } from './wireLayout';

function makeCircuit(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery-1', position: { x: 3, y: 4 } }),
      createComponent('bulb', { id: 'bulb-1', position: { x: 8, y: 4 } }),
    ],
    wires: [
      createWire(
        'wire-1',
        { componentId: 'battery-1', terminalId: 'positive' },
        { componentId: 'bulb-1', terminalId: 'a' },
      ),
    ],
  };
}

describe('sandbox snapshot', () => {
  it('uses the same routed wires and white casing as the live board', () => {
    const circuit = makeCircuit();
    const board = boardForLevel(undefined);
    const expected = renderAllWires(
      circuit.wires,
      circuit.components,
      terminalPointMap(circuit.components),
      board,
    );

    const { container } = render(
      <SandboxSnapshot
        circuit={circuit}
        simulation={simulateCircuit(circuit)}
        displayMode="realistic"
        board={board}
        svgRef={() => undefined}
      />,
    );

    const group = container.querySelector('[data-snapshot-wire-id="wire-1"]');
    const paths = group?.querySelectorAll('path') ?? [];

    expect(expected).toHaveLength(1);
    expect(paths).toHaveLength(2);
    expect(paths[0]?.getAttribute('d')).toBe(expected[0]?.path);
    expect(paths[0]?.getAttribute('stroke-width')).toBe('15');
    expect(paths[1]?.getAttribute('d')).toBe(expected[0]?.path);
    expect(paths[1]?.getAttribute('stroke-width')).toBe('8');
  });
});
