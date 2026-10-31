import { describe, expect, it } from 'vitest';

import {
  createComponent,
  createTerminalRef,
  createTransientSimulator,
  createWire,
  type Circuit,
  type TerminalRef,
} from './index';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function rcCircuit(options: {
  switchClosed: boolean;
  capacitance?: number;
  initialVoltage?: number;
}): Circuit {
  const capacitance = options.capacitance ?? 0.2;

  return {
    components: [
      createComponent('battery', { id: 'battery' }),
      createComponent('switch', {
        id: 'switch',
        closed: options.switchClosed,
      }),
      createComponent('capacitor', {
        id: 'capacitor',
        capacitance,
        initialVoltage: options.initialVoltage ?? 0,
      }),
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

function voltageOf(frame: {
  capacitorVoltages: Record<string, number>;
}): number {
  return frame.capacitorVoltages['capacitor'] ?? 0;
}

describe('transient simulator', () => {
  it('charges a capacitor through a closed switch', () => {
    const simulator = createTransientSimulator(rcCircuit({ switchClosed: true }), {
      stepMs: 16,
    });
    const initial = voltageOf(simulator.snapshot());

    let frame = simulator.snapshot();
    for (let index = 0; index < 120; index += 1) {
      frame = simulator.step();
    }

    expect(initial).toBe(0);
    expect(voltageOf(frame)).toBeGreaterThan(1);
    expect(voltageOf(frame)).toBeGreaterThan(initial);
    expect(Number.isFinite(voltageOf(frame))).toBe(true);
  });

  it('keeps discharging after the switch opens', () => {
    const closed = rcCircuit({ switchClosed: true });
    const simulator = createTransientSimulator(closed, { stepMs: 16 });

    let frame = simulator.snapshot();
    for (let index = 0; index < 120; index += 1) {
      frame = simulator.step();
    }

    const charged = voltageOf(frame);
    expect(charged).toBeGreaterThan(1);

    const open = rcCircuit({ switchClosed: false });
    simulator.setCircuit(open);
    const firstDischarge = simulator.step();

    expect(firstDischarge.simulation.states['bulb']?.on).toBe(true);
    expect(voltageOf(firstDischarge)).toBeLessThan(charged);

    for (let index = 0; index < 60; index += 1) {
      frame = simulator.step();
    }

    expect(voltageOf(frame)).toBeLessThan(voltageOf(firstDischarge));
    expect(voltageOf(frame)).toBeGreaterThanOrEqual(0);
  });

  it('honours a precharged capacitor and its reset voltage', () => {
    const simulator = createTransientSimulator(
      rcCircuit({ switchClosed: false, initialVoltage: 3 }),
      { stepMs: 16, initialVoltages: { capacitor: 4 } },
    );

    const initial = voltageOf(simulator.snapshot());
    expect(initial).toBe(4);

    simulator.step();
    simulator.setCapacitorVoltage('capacitor', 0);
    expect(voltageOf(simulator.snapshot())).toBe(0);

    simulator.reset();
    expect(voltageOf(simulator.snapshot())).toBe(4);
  });

  it('never produces NaN during a long discharge', () => {
    const simulator = createTransientSimulator(
      rcCircuit({ switchClosed: true, initialVoltage: 4.5, capacitance: 0.5 }),
      { stepMs: 16 },
    );

    let frame = simulator.snapshot();
    for (let index = 0; index < 500; index += 1) {
      frame = simulator.step();
      expect(Number.isFinite(voltageOf(frame))).toBe(true);
      expect(
        Number.isFinite(frame.simulation.states['capacitor']?.voltage ?? NaN),
      ).toBe(true);
    }
  });

  it('resets the elapsed time with the capacitor state', () => {
    const simulator = createTransientSimulator(rcCircuit({ switchClosed: true }), {
      stepMs: 16,
    });

    for (let index = 0; index < 10; index += 1) {
      simulator.step();
    }

    expect(simulator.snapshot().elapsedMs).toBe(160);
    simulator.reset();
    expect(simulator.snapshot().elapsedMs).toBe(0);
  });
});
