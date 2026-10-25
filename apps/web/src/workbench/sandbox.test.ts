import {
  createComponent,
  createWire,
  simulateCircuit,
} from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import {
  chooseSandboxCuriosity,
  createEmptySandbox,
  nextSandboxName,
  sandboxCuriosityTips,
  sandboxFingerprint,
  sandboxPaletteItems,
  sandboxPhotoFileName,
} from './sandbox';

describe('sandbox palette', () => {
  it('offers every workshop component, on every device', () => {
    expect(sandboxPaletteItems().map((item) => item.key)).toEqual([
      'battery',
      'bulb',
      'switch',
      'motor',
      'led',
      'resistor',
      'rheostat',
      'metal',
      'gum',
    ]);
  });
});

describe('sandbox naming', () => {
  it('finds the first free circuit name', () => {
    expect(nextSandboxName([])).toBe('Mon circuit 1');
    expect(
      nextSandboxName([
        { name: 'Mon circuit 1' },
        { name: 'Mon circuit 3' },
      ]),
    ).toBe('Mon circuit 2');
  });

  it('makes a safe file name from French accents', () => {
    expect(sandboxPhotoFileName('Mon circuit étoilé !')).toBe(
      'circuit-zap-mon-circuit-etoile.png',
    );
    expect(sandboxPhotoFileName('   ')).toBe('circuit-zap-atelier.png');
  });
});

describe('sandbox circuit helpers', () => {
  it('creates a blank board without any component', () => {
    const board = createEmptySandbox();

    expect(board.components).toHaveLength(0);
    expect(board.wires).toHaveLength(0);
    expect(JSON.parse(sandboxFingerprint(board))).toBeDefined();
  });
});

describe('sandbox curiosity', () => {
  const empty = { components: [], wires: [] };

  it('invites the child to place a battery and a bulb on an empty board', () => {
    expect(
      sandboxCuriosityTips(empty, simulateCircuit(empty), new Set()),
    ).toEqual(['sandbox.curiosity.empty']);
  });

  it('only suggests components available in the workshop', () => {
    const circuit = {
      components: [
        createComponent('battery', {
          id: 'battery-1',
          position: { x: 3, y: 4 },
        }),
      ],
      wires: [],
    };

    expect(
      sandboxCuriosityTips(
        circuit,
        simulateCircuit(circuit),
        new Set(['battery', 'bulb']),
      ),
    ).toEqual([
      'sandbox.curiosity.bulb',
      'sandbox.curiosity.secondBattery',
      'sandbox.curiosity.rotate',
    ]);
  });

  it('stays quiet while the battery is shorted', () => {
    const battery = createComponent('battery', {
      id: 'battery-1',
      position: { x: 3, y: 4 },
    });
    const circuit = {
      components: [battery],
      wires: [
        createWire(
          'wire-1',
          { componentId: 'battery-1', terminalId: 'positive' },
          { componentId: 'battery-1', terminalId: 'negative' },
        ),
      ],
    };
    const simulation = simulateCircuit(circuit);

    expect(simulation.shortCircuit).toBe(true);
    expect(
      sandboxCuriosityTips(circuit, simulation, new Set(['battery'])),
    ).toEqual([]);
  });

  it('varies the prompt instead of repeating the previous one', () => {
    expect(
      chooseSandboxCuriosity(['a', 'b'], 'a'),
    ).toBe('b');
    expect(chooseSandboxCuriosity(['a'], 'a')).toBe('a');
    expect(chooseSandboxCuriosity([], 'a')).toBeNull();
  });
});
