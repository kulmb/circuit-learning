import { describe, expect, it } from 'vitest';

import {
  createComponent,
  createTerminalRef,
  createTransientSimulator,
  createWire,
  simulateCircuit,
  type Circuit,
  type TerminalRef,
} from '../circuit';
import { createLevelRuntime, updateLevelRuntime } from './runtime';
import { evaluateLevelSuccess } from './success';
import { getLevelById } from './registry';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function wire(id: string, from: TerminalRef, to: TerminalRef) {
  return createWire(id, from, to);
}

function success(levelId: string, circuit: Circuit, runtime?: ReturnType<typeof createLevelRuntime>): boolean {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  return evaluateLevelSuccess(level, circuit, simulateCircuit(circuit), runtime);
}

describe('new success conditions', () => {
  it('validates a forward diode in diode-01', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery-1' }),
        createComponent('switch', { id: 'switch-1', closed: true }),
        createComponent('diode', { id: 'diode-1' }),
        createComponent('bulb', { id: 'bulb-1' }),
      ],
      wires: [
        wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
        wire('w2', ref('switch-1', 'b'), ref('diode-1', 'anode')),
        wire('w3', ref('diode-1', 'cathode'), ref('bulb-1', 'a')),
        wire('w4', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      ],
    };

    expect(success('diode-01', circuit)).toBe(true);
  });

  it('validates the electromagnet in mag-01', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery-1' }),
        createComponent('switch', { id: 'switch-1', closed: true }),
        createComponent('electromagnet', { id: 'coil-1', turns: 40 }),
      ],
      wires: [
        wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
        wire('w2', ref('switch-1', 'b'), ref('coil-1', 'a')),
        wire('w3', ref('coil-1', 'b'), ref('battery-1', 'negative')),
      ],
    };

    expect(success('mag-01', circuit)).toBe(true);
  });

  it('validates the reed switch in mag-03', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery-1' }),
        createComponent('reed', { id: 'reed-1', magnetNear: true }),
        createComponent('bulb', { id: 'bulb-1' }),
      ],
      wires: [
        wire('w1', ref('battery-1', 'positive'), ref('reed-1', 'a')),
        wire('w2', ref('reed-1', 'b'), ref('bulb-1', 'a')),
        wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      ],
    };

    expect(success('mag-03', circuit)).toBe(true);
  });

  it('validates the light response in sensor-01', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery-1' }),
        createComponent('ldr', { id: 'ldr-1', lightLevel: 1 }),
        createComponent('bulb', { id: 'bulb-1' }),
      ],
      wires: [
        wire('w1', ref('battery-1', 'positive'), ref('ldr-1', 'a')),
        wire('w2', ref('ldr-1', 'b'), ref('bulb-1', 'a')),
        wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      ],
    };

    expect(success('sensor-01', circuit)).toBe(true);
  });

  it('validates the capacitor and the lamp staying on in cap-01', () => {
    const closed: Circuit = {
      components: [
        createComponent('battery', { id: 'battery-1' }),
        createComponent('switch', { id: 'switch-1', closed: true }),
        createComponent('capacitor', { id: 'capacitor-1', capacitance: 0.2 }),
        createComponent('bulb', { id: 'bulb-1' }),
      ],
      wires: [
        wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
        wire('w2', ref('switch-1', 'b'), ref('capacitor-1', 'a')),
        wire('w3', ref('switch-1', 'b'), ref('bulb-1', 'a')),
        wire('w4', ref('capacitor-1', 'b'), ref('battery-1', 'negative')),
        wire('w5', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      ],
    };
    const open: Circuit = {
      ...closed,
      components: closed.components.map((component) =>
        component.type === 'switch'
          ? { ...component, closed: false }
          : component,
      ),
    };

    const runtime = createLevelRuntime();
    const simulator = createTransientSimulator(closed, { stepMs: 16 });

    for (let index = 0; index < 120; index += 1) {
      const frame = simulator.step();
      updateLevelRuntime(runtime, closed, frame.simulation, 16);
    }

    simulator.setCircuit(open);

    for (let index = 0; index < 30; index += 1) {
      const frame = simulator.step();
      updateLevelRuntime(runtime, open, frame.simulation, 16);
    }

    const level = getLevelById('cap-01');
    if (level === undefined) {
      throw new Error('Missing cap-01');
    }

    expect(
      evaluateLevelSuccess(level, open, simulator.snapshot().simulation, runtime),
    ).toBe(true);
  });
});
