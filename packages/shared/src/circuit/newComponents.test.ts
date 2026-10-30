import { describe, expect, it } from 'vitest';

import {
  createComponent,
  createTerminalRef,
  createTransientSimulator,
  createWire,
  readCircuitMeters,
  serializeCircuit,
  deserializeCircuit,
  simulateCircuit,
  type Circuit,
  type CircuitComponent,
  type CircuitSimulation,
  type TerminalRef,
} from './index';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function stateOf(
  simulation: CircuitSimulation,
  componentId: string,
): CircuitSimulation['states'][string] {
  const state = simulation.states[componentId];
  if (!state) {
    throw new Error(`Missing state for ${componentId}`);
  }
  return state;
}

function twoTerminalLoop(
  source: CircuitComponent,
  load: CircuitComponent,
  extra: CircuitComponent[] = [],
): Circuit {
  return {
    components: [source, ...extra, load],
    wires: [
      createWire('w1', ref(source.id, source.terminals[0]!.id), ref(load.id, 'a')),
      createWire('w2', ref(load.id, 'b'), ref(source.id, source.terminals[1]!.id)),
    ],
  };
}

function diodeCircuit(reversed: boolean): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('diode', { id: 'diode' }),
      createComponent('bulb', { id: 'bulb' }),
    ],
    wires: [
      createWire(
        'w1',
        ref('battery', 'positive'),
        ref('diode', reversed ? 'cathode' : 'anode'),
      ),
      createWire(
        'w2',
        ref('diode', reversed ? 'anode' : 'cathode'),
        ref('bulb', 'a'),
      ),
      createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
    ],
  };
}

function relayCircuit(normallyClosed: boolean, coilEnergized: boolean): Circuit {
  return {
    components: [
      createComponent('battery', {
        id: 'coil-battery',
        voltage: coilEnergized ? 4.5 : 0.01,
      }),
      createComponent('switch', { id: 'switch', closed: true }),
      createComponent('battery', { id: 'lamp-battery' }),
      createComponent('relay', {
        id: 'relay',
        normallyClosed,
      }),
      createComponent('bulb', { id: 'bulb' }),
    ],
    wires: [
      createWire('w1', ref('coil-battery', 'positive'), ref('switch', 'a')),
      createWire('w2', ref('switch', 'b'), ref('relay', 'coilA')),
      createWire('w3', ref('relay', 'coilB'), ref('coil-battery', 'negative')),
      createWire('w4', ref('lamp-battery', 'positive'), ref('relay', 'contactA')),
      createWire('w5', ref('relay', 'contactB'), ref('bulb', 'a')),
      createWire('w6', ref('bulb', 'b'), ref('lamp-battery', 'negative')),
    ],
  };
}

describe('diode', () => {
  it('conducts in the forward direction', () => {
    const simulation = simulateCircuit(diodeCircuit(false));

    expect(simulation.ok).toBe(true);
    expect(stateOf(simulation, 'bulb').on).toBe(true);
    expect(simulation.diodeReversed).toBe(false);
  });

  it('blocks the reverse direction and reports it', () => {
    const simulation = simulateCircuit(diodeCircuit(true));

    expect(stateOf(simulation, 'bulb').on).toBe(false);
    expect(simulation.diodeReversed).toBe(true);
    expect(
      simulation.diagnostics.some(
        (diagnostic) => diagnostic.code === 'diode_reversed',
      ),
    ).toBe(true);
  });
});

describe('electromagnet', () => {
  it('creates a stronger magnet with more turns', () => {
    const shortCoil = simulateCircuit(
      twoTerminalLoop(
        createComponent('battery', { id: 'battery' }),
        createComponent('electromagnet', { id: 'coil', turns: 40 }),
      ),
    );
    const longCoil = simulateCircuit(
      twoTerminalLoop(
        createComponent('battery', { id: 'battery' }),
        createComponent('electromagnet', { id: 'coil', turns: 120 }),
      ),
    );

    const shortStrength = stateOf(shortCoil, 'coil').magneticStrength ?? 0;
    const longStrength = stateOf(longCoil, 'coil').magneticStrength ?? 0;

    expect(shortStrength).toBeGreaterThan(0);
    expect(longStrength).toBeGreaterThan(shortStrength);
  });
});

describe('reed switch', () => {
  it('closes when a magnet is near', () => {
    const circuit = (magnetNear: boolean): Circuit => ({
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('reed', { id: 'reed', magnetNear }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('reed', 'a')),
        createWire('w2', ref('reed', 'b'), ref('bulb', 'a')),
        createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    });

    expect(stateOf(simulateCircuit(circuit(false)), 'bulb').on).toBe(false);
    expect(stateOf(simulateCircuit(circuit(true)), 'bulb').on).toBe(true);
  });
});

describe('relay', () => {
  it('closes a normally open contact when the coil is energized', () => {
    const simulation = simulateCircuit(relayCircuit(false, true));

    expect(stateOf(simulation, 'relay').relayClosed).toBe(true);
    expect(stateOf(simulation, 'bulb').on).toBe(true);
  });

  it('keeps the contact open when the coil is not energized', () => {
    const simulation = simulateCircuit(relayCircuit(false, false));

    expect(stateOf(simulation, 'relay').relayClosed).toBe(false);
    expect(stateOf(simulation, 'bulb').on).toBe(false);
  });

  it('opens a normally closed contact when the coil is energized', () => {
    const simulation = simulateCircuit(relayCircuit(true, true));

    expect(stateOf(simulation, 'relay').relayClosed).toBe(false);
    expect(stateOf(simulation, 'bulb').on).toBe(false);
  });

  it('closes a normally closed contact when the coil is off', () => {
    const simulation = simulateCircuit(relayCircuit(true, false));

    expect(stateOf(simulation, 'relay').relayClosed).toBe(true);
    expect(stateOf(simulation, 'bulb').on).toBe(true);
  });
});

describe('light sensor and solar panel', () => {
  it('changes the bulb brightness with the light level', () => {
    const circuit = (lightLevel: number): Circuit => ({
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('ldr', { id: 'ldr', lightLevel }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('ldr', 'a')),
        createWire('w2', ref('ldr', 'b'), ref('bulb', 'a')),
        createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    });

    const bright = stateOf(simulateCircuit(circuit(1)), 'bulb');
    const dark = stateOf(simulateCircuit(circuit(0)), 'bulb');

    expect(bright.intensity).toBeGreaterThan(dark.intensity);
  });

  it('powers a motor without a battery in the light', () => {
    const circuit = (lightLevel: number): Circuit => ({
      components: [
        createComponent('solar', { id: 'solar', lightLevel }),
        createComponent('motor', { id: 'motor' }),
      ],
      wires: [
        createWire('w1', ref('solar', 'positive'), ref('motor', 'a')),
        createWire('w2', ref('motor', 'b'), ref('solar', 'negative')),
      ],
    });

    const light = simulateCircuit(circuit(1));
    const dark = simulateCircuit(circuit(0));

    expect(light.missingBattery).toBe(false);
    expect(light.missingSource).toBe(false);
    expect(stateOf(light, 'motor').on).toBe(true);
    expect(stateOf(dark, 'motor').on).toBe(false);
    expect(dark.missingSource).toBe(false);
  });
});

describe('capacitor transient', () => {
  function capacitorCircuit(switchClosed: boolean): Circuit {
    return {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('switch', { id: 'switch', closed: switchClosed }),
        createComponent('capacitor', { id: 'capacitor', capacitance: 0.2 }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('switch', 'a')),
        createWire('w2', ref('switch', 'b'), ref('capacitor', 'a')),
        createWire('w3', ref('switch', 'b'), ref('bulb', 'a')),
        createWire('w4', ref('capacitor', 'b'), ref('battery', 'negative')),
        createWire('w5', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    };
  }

  it('charges through the source and discharges through the bulb', () => {
    const simulator = createTransientSimulator(capacitorCircuit(true), {
      stepMs: 16,
    });

    let frame = simulator.snapshot();
    const initialVoltage = frame.capacitorVoltages['capacitor'] ?? 0;

    for (let index = 0; index < 40; index += 1) {
      frame = simulator.step();
    }

    const chargedVoltage = frame.capacitorVoltages['capacitor'] ?? 0;
    expect(chargedVoltage).toBeGreaterThan(initialVoltage);
    expect(chargedVoltage).toBeGreaterThan(1);

    simulator.setCircuit(capacitorCircuit(false));

    const beforeDischarge = simulator.step();
    const dischargeStart = beforeDischarge.capacitorVoltages['capacitor'] ?? 0;

    for (let index = 0; index < 20; index += 1) {
      frame = simulator.step();
    }

    const dischargedVoltage = frame.capacitorVoltages['capacitor'] ?? 0;
    expect(dischargeStart).toBeGreaterThan(0);
    expect(dischargedVoltage).toBeLessThan(dischargeStart);
  });

  it('fills and empties the charge meter without NaN', () => {
    const circuit = capacitorCircuit(true);
    const simulator = createTransientSimulator(circuit, { stepMs: 16 });
    let frame = simulator.snapshot();

    for (let index = 0; index < 200; index += 1) {
      frame = simulator.step();
    }

    const meters = readCircuitMeters(circuit, frame.simulation);
    expect(meters.charge.status).not.toBe('off');
    expect(Number.isFinite(frame.simulation.states['capacitor']?.voltage ?? NaN)).toBe(
      true,
    );
  });
});

describe('serialization', () => {
  const components = [
    createComponent('diode', { id: 'diode' }),
    createComponent('electromagnet', { id: 'electromagnet' }),
    createComponent('reed', { id: 'reed' }),
    createComponent('relay', { id: 'relay', normallyClosed: true }),
    createComponent('ldr', { id: 'ldr' }),
    createComponent('solar', { id: 'solar' }),
    createComponent('capacitor', { id: 'capacitor', initialVoltage: 2 }),
  ];

  it('round-trips every new component type', () => {
    const document = serializeCircuit({ components, wires: [] });
    const restored = deserializeCircuit(document);

    expect(restored.components).toHaveLength(components.length);
    expect(restored.components.map((component) => component.type)).toEqual(
      components.map((component) => component.type),
    );
  });
});
