import { describe, expect, it } from 'vitest';

import {
  CircuitError,
  createComponent,
  createTerminalRef,
  createWire,
  deserializeCircuit,
  serializeCircuit,
  type Circuit,
  type CircuitDocument,
  type TerminalRef,
} from './index';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function completeCircuit(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('bulb', { id: 'bulb', position: { x: 1, y: 2 }, rotation: 90 }),
      createComponent('switch', { id: 'switch', closed: true }),
      createComponent('wire', { id: 'wire-component' }),
      createComponent('motor', { id: 'motor' }),
      createComponent('buzzer', { id: 'buzzer' }),
      createComponent('led', { id: 'led', forwardVoltage: 0.7 }),
      createComponent('resistor', { id: 'resistor', resistance: 22 }),
      createComponent('rheostat', {
        id: 'rheostat',
        minResistance: 3,
        maxResistance: 30,
        wiperPosition: 0.4,
      }),
      createComponent('material', { id: 'material', conductive: true }),
      createComponent('diode', { id: 'diode', forwardVoltage: 0.7 }),
      createComponent('electromagnet', { id: 'electromagnet', turns: 120 }),
      createComponent('reed', { id: 'reed', magnetNear: true }),
      createComponent('relay', { id: 'relay', normallyClosed: true }),
      createComponent('ldr', { id: 'ldr', lightLevel: 0.4 }),
      createComponent('solar', { id: 'solar', lightLevel: 0.8 }),
      createComponent('capacitor', {
        id: 'capacitor',
        capacitance: 0.5,
        initialVoltage: 1.2,
      }),
    ],
    wires: [
      createWire('w1', ref('battery', 'positive'), ref('bulb', 'a'), [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ]),
      createWire('w2', ref('bulb', 'b'), ref('switch', 'a')),
      createWire('w3', ref('switch', 'b'), ref('wire-component', 'a')),
      createWire('w4', ref('wire-component', 'b'), ref('motor', 'a')),
      createWire('w5', ref('motor', 'b'), ref('buzzer', 'a')),
      createWire('w6', ref('buzzer', 'b'), ref('led', 'anode')),
      createWire('w7', ref('led', 'cathode'), ref('resistor', 'a')),
      createWire('w8', ref('resistor', 'b'), ref('material', 'a')),
      createWire('w9', ref('material', 'b'), ref('battery', 'negative')),
    ],
  };
}

describe('circuit serialization', () => {
  it('round-trips every component type through JSON', () => {
    const circuit = completeCircuit();
    const document = serializeCircuit(circuit);

    expect(document.version).toBe(1);
    expect(document.components).toHaveLength(circuit.components.length);
    expect(document.wires).toHaveLength(circuit.wires.length);

    const restored = deserializeCircuit(JSON.parse(JSON.stringify(document)));

    expect(restored).toEqual(circuit);
    expect(deserializeCircuit(JSON.stringify(document))).toEqual(circuit);
  });

  it('returns an independent copy when serializing', () => {
    const circuit = completeCircuit();
    const document = serializeCircuit(circuit);
    const firstComponent = document.components[0];

    expect(firstComponent).toBeDefined();
    if (!firstComponent) {
      throw new Error('Missing serialized component');
    }

    firstComponent.position.x = 99;

    expect(circuit.components[0]?.position.x).toBe(0);
  });

  it('rejects an unsupported format version', () => {
    expect(() =>
      deserializeCircuit({ version: 2, components: [], wires: [] }),
    ).toThrow(CircuitError);
  });

  it('rejects a wire that references an unknown terminal', () => {
    const document = JSON.parse(JSON.stringify(serializeCircuit(completeCircuit()))) as CircuitDocument;
    const firstWire = document.wires[0];

    expect(firstWire).toBeDefined();
    if (!firstWire) {
      throw new Error('Missing serialized wire');
    }

    firstWire.from.terminalId = 'missing';

    expect(() => deserializeCircuit(document)).toThrow(CircuitError);
  });

  it('rejects an invalid rheostat wiper position', () => {
    const document = JSON.parse(
      JSON.stringify(serializeCircuit(completeCircuit())),
    ) as CircuitDocument;
    const rheostat = document.components.find(
      (component) => component.type === 'rheostat',
    );

    expect(rheostat).toBeDefined();
    if (rheostat?.type !== 'rheostat') {
      throw new Error('Missing serialized rheostat');
    }

    rheostat.wiperPosition = 1.2;

    expect(() => deserializeCircuit(document)).toThrow(CircuitError);
  });

  it('rejects a rheostat whose maximum resistance is not above its minimum', () => {
    const document = JSON.parse(
      JSON.stringify(serializeCircuit(completeCircuit())),
    ) as CircuitDocument;
    const rheostat = document.components.find(
      (component) => component.type === 'rheostat',
    );

    expect(rheostat).toBeDefined();
    if (rheostat?.type !== 'rheostat') {
      throw new Error('Missing serialized rheostat');
    }

    rheostat.maxResistance = rheostat.minResistance;

    expect(() => deserializeCircuit(document)).toThrow(CircuitError);
  });

  it('rejects invalid JSON input', () => {
    expect(() => deserializeCircuit('{')).toThrow(CircuitError);
  });
});
