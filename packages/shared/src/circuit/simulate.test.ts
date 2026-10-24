import { describe, expect, it } from 'vitest';

import {
  createComponent,
  createTerminalRef,
  createWire,
  describeCircuit,
  simulateCircuit,
  type Circuit,
  type CircuitSimulation,
  type ComponentState,
  type TerminalRef,
} from './index';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function stateOf(simulation: CircuitSimulation, componentId: string): ComponentState {
  const state = simulation.states[componentId];
  if (!state) {
    throw new Error(`Missing state for ${componentId}`);
  }
  return state;
}

function singleBulbCircuit(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('bulb', { id: 'bulb' }),
    ],
    wires: [
      createWire('w1', ref('battery', 'positive'), ref('bulb', 'a')),
      createWire('w2', ref('bulb', 'b'), ref('battery', 'negative')),
    ],
  };
}

function switchCircuit(closed: boolean): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('switch', { id: 'switch', closed }),
      createComponent('bulb', { id: 'bulb' }),
    ],
    wires: [
      createWire('w1', ref('battery', 'positive'), ref('switch', 'a')),
      createWire('w2', ref('switch', 'b'), ref('bulb', 'a')),
      createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
    ],
  };
}

function ledCircuit(reversed: boolean): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('led', { id: 'led' }),
    ],
    wires: [
      createWire(
        'w1',
        ref('battery', 'positive'),
        ref('led', reversed ? 'cathode' : 'anode'),
      ),
      createWire(
        'w2',
        ref('led', reversed ? 'anode' : 'cathode'),
        ref('battery', 'negative'),
      ),
    ],
  };
}

function materialCircuit(conductive: boolean): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('material', { id: 'material', conductive }),
      createComponent('bulb', { id: 'bulb' }),
    ],
    wires: [
      createWire('w1', ref('battery', 'positive'), ref('material', 'a')),
      createWire('w2', ref('material', 'b'), ref('bulb', 'a')),
      createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
    ],
  };
}

describe('circuit simulation', () => {
  it('lights a bulb in a single closed loop', () => {
    const result = simulateCircuit(singleBulbCircuit());
    const bulb = stateOf(result, 'bulb');
    const battery = stateOf(result, 'battery');

    expect(result.closed).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.shortCircuit).toBe(false);
    expect(result.openCircuit).toBe(false);
    expect(result.missingBattery).toBe(false);
    expect(result.bulbOneSide).toBe(false);
    expect(bulb.current).toBeGreaterThan(0);
    expect(bulb.intensity).toBeCloseTo(1.0714, 3);
    expect(bulb.state).toBe('normal');
    expect(battery.current).toBeCloseTo(bulb.current, 3);
  });

  it('detects an open circuit and the bulb terminal that is not connected', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [createWire('w1', ref('battery', 'positive'), ref('bulb', 'a'))],
    };

    const result = simulateCircuit(circuit);

    expect(result.closed).toBe(false);
    expect(result.openCircuit).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.bulbOneSide).toBe(true);
    expect(result.danglingTerminals).toEqual(
      expect.arrayContaining([ref('battery', 'negative'), ref('bulb', 'b')]),
    );
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'bulb_one_side'),
    ).toBe(true);
    expect(stateOf(result, 'bulb').state).toBe('off');
  });

  it('reports an open switch and lights the bulb once it is closed', () => {
    const openResult = simulateCircuit(switchCircuit(false));

    expect(openResult.closed).toBe(false);
    expect(openResult.openCircuit).toBe(true);
    expect(openResult.switchOpen).toBe(true);
    expect(
      openResult.diagnostics.some((diagnostic) => diagnostic.code === 'switch_open'),
    ).toBe(true);
    expect(stateOf(openResult, 'bulb').state).toBe('off');
    expect(stateOf(openResult, 'switch').on).toBe(false);

    const closedResult = simulateCircuit(switchCircuit(true));

    expect(closedResult.closed).toBe(true);
    expect(closedResult.ok).toBe(true);
    expect(closedResult.switchOpen).toBe(false);
    expect(stateOf(closedResult, 'bulb').state).toBe('normal');
    expect(stateOf(closedResult, 'switch').on).toBe(true);
    expect(stateOf(closedResult, 'switch').current).toBeGreaterThan(0);
  });

  it('makes two bulbs in series dimmer than a single bulb', () => {
    const single = stateOf(simulateCircuit(singleBulbCircuit()), 'bulb');
    const series: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb1' }),
        createComponent('bulb', { id: 'bulb2' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('bulb1', 'a')),
        createWire('w2', ref('bulb1', 'b'), ref('bulb2', 'a')),
        createWire('w3', ref('bulb2', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(series);
    const first = stateOf(result, 'bulb1');
    const second = stateOf(result, 'bulb2');

    expect(result.ok).toBe(true);
    expect(single.state).toBe('normal');
    expect(first.state).toBe('dim');
    expect(second.state).toBe('dim');
    expect(first.intensity).toBeLessThan(single.intensity);
    expect(first.current).toBeCloseTo(second.current, 6);
  });

  it('gives two bulbs in parallel the same brightness as a single bulb', () => {
    const single = stateOf(simulateCircuit(singleBulbCircuit()), 'bulb');
    const parallel: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb1' }),
        createComponent('bulb', { id: 'bulb2' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('bulb1', 'a')),
        createWire('w2', ref('battery', 'positive'), ref('bulb2', 'a')),
        createWire('w3', ref('bulb1', 'b'), ref('battery', 'negative')),
        createWire('w4', ref('bulb2', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(parallel);
    const first = stateOf(result, 'bulb1');
    const second = stateOf(result, 'bulb2');

    expect(result.ok).toBe(true);
    expect(result.shortCircuit).toBe(false);
    expect(first.state).toBe('normal');
    expect(second.state).toBe('normal');
    expect(first.intensity).toBeCloseTo(second.intensity, 6);
    expect(Math.abs(first.intensity - single.intensity)).toBeLessThan(0.1);
  });

  it('adds two batteries in series to make the bulb brighter', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery1' }),
        createComponent('battery', { id: 'battery2' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery1', 'positive'), ref('bulb', 'a')),
        createWire('w2', ref('bulb', 'b'), ref('battery2', 'negative')),
        createWire('w3', ref('battery2', 'positive'), ref('battery1', 'negative')),
      ],
    };

    const result = simulateCircuit(circuit);
    const bulb = stateOf(result, 'bulb');

    expect(result.closed).toBe(true);
    expect(result.ok).toBe(true);
    expect(bulb.state).toBe('bright');
    expect(stateOf(result, 'battery1').current).toBeGreaterThan(0);
    expect(stateOf(result, 'battery2').current).toBeGreaterThan(0);
  });

  it('detects a direct short circuit and reports the wire', () => {
    const circuit: Circuit = {
      components: [createComponent('battery', { id: 'battery' })],
      wires: [
        createWire('short', ref('battery', 'positive'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(circuit);

    expect(result.closed).toBe(true);
    expect(result.shortCircuit).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.shortCircuitInfo?.wireIds).toContain('short');
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'short_circuit'),
    ).toBe(true);
  });

  it('detects a short circuit through a closed switch', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('switch', { id: 'switch', closed: true }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('switch', 'a')),
        createWire('w2', ref('switch', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(circuit);

    expect(result.shortCircuit).toBe(true);
    expect(result.shortCircuitInfo?.componentIds).toContain('switch');
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'short_circuit'),
    ).toBe(true);
  });

  it('detects a short circuit through a wire component', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('wire', { id: 'wire-component' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('wire-component', 'a')),
        createWire('w2', ref('wire-component', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(circuit);

    expect(result.shortCircuit).toBe(true);
    expect(result.shortCircuitInfo?.componentIds).toContain('wire-component');
  });

  it('detects a short circuit in a parallel branch', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('bulb', 'a')),
        createWire('w2', ref('bulb', 'b'), ref('battery', 'negative')),
        createWire('bypass', ref('battery', 'positive'), ref('battery', 'negative')),
      ],
    };

    const result = simulateCircuit(circuit);

    expect(result.shortCircuit).toBe(true);
    expect(result.shortCircuitInfo?.wireIds).toContain('bypass');
    expect(stateOf(result, 'bulb').state).toBe('off');
  });

  it('lights a forward LED and blocks a reversed LED', () => {
    const forward = simulateCircuit(ledCircuit(false));
    const forwardLed = stateOf(forward, 'led');

    expect(forward.closed).toBe(true);
    expect(forward.ok).toBe(true);
    expect(forward.ledReversed).toBe(false);
    expect(forwardLed.state).not.toBe('off');
    expect(forwardLed.current).toBeGreaterThan(0);
    expect(
      forward.diagnostics.some((diagnostic) => diagnostic.code === 'led_reversed'),
    ).toBe(false);

    const reversed = simulateCircuit(ledCircuit(true));
    const reversedLed = stateOf(reversed, 'led');

    expect(reversed.closed).toBe(true);
    expect(reversed.openCircuit).toBe(false);
    expect(reversed.ok).toBe(false);
    expect(reversed.ledReversed).toBe(true);
    expect(reversedLed.state).toBe('off');
    expect(reversedLed.current).toBe(0);
    expect(reversedLed.reverseBiased).toBe(true);
    expect(
      reversed.diagnostics.some((diagnostic) => diagnostic.code === 'led_reversed'),
    ).toBe(true);
  });

  it('conducts through a metal material and blocks an insulating material', () => {
    const conductor = simulateCircuit(materialCircuit(true));
    const conductorMaterial = stateOf(conductor, 'material');

    expect(conductor.closed).toBe(true);
    expect(conductor.ok).toBe(true);
    expect(conductorMaterial.on).toBe(true);
    expect(conductorMaterial.current).toBeGreaterThan(0);
    expect(stateOf(conductor, 'bulb').state).toBe('normal');

    const insulator = simulateCircuit(materialCircuit(false));

    expect(insulator.closed).toBe(false);
    expect(insulator.openCircuit).toBe(true);
    expect(insulator.insulatingMaterial).toBe(true);
    expect(stateOf(insulator, 'bulb').state).toBe('off');
    expect(
      insulator.diagnostics.some(
        (diagnostic) => diagnostic.code === 'insulating_material',
      ),
    ).toBe(true);
  });

  it('describes a valid circuit without running the full state extraction', () => {
    const description = describeCircuit(singleBulbCircuit());

    expect(description.ok).toBe(true);
    expect(description.closed).toBe(true);
    expect(description.shortCircuit).toBe(false);
    expect(description.openCircuit).toBe(false);
    expect(description.diagnostics).toEqual([]);
  });

  it('reports a missing battery', () => {
    const circuit: Circuit = {
      components: [createComponent('bulb', { id: 'bulb' })],
      wires: [],
    };

    const result = simulateCircuit(circuit);

    expect(result.missingBattery).toBe(true);
    expect(result.closed).toBe(false);
    expect(result.openCircuit).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'missing_battery'),
    ).toBe(true);
  });
});
