import { describe, expect, it } from 'vitest';

import {
  cloneComponent,
  createTerminalRef,
  createTransientSimulator,
  createWire,
  simulateCircuit,
  type Circuit,
  type TerminalRef,
} from '../circuit';
import { getLevelById } from './registry';
import { createLevelRuntime, updateLevelRuntime } from './runtime';
import { evaluateLevelSuccess } from './success';

function ref(componentId: string, terminalId: string): TerminalRef {
  return createTerminalRef(componentId, terminalId);
}

function wire(id: string, from: TerminalRef, to: TerminalRef) {
  return createWire(id, from, to);
}

function circuitFor(levelId: string): Circuit {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  return {
    components: level.preplacedComponents.map((entry) =>
      cloneComponent(entry.component),
    ),
    wires: [],
  };
}

function closeSwitch(circuit: Circuit, componentId: string): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.id === componentId && component.type === 'switch'
        ? { ...component, closed: true }
        : component,
    ),
  };
}

function setReed(circuit: Circuit, componentId: string): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.id === componentId && component.type === 'reed'
        ? { ...component, magnetNear: true }
        : component,
    ),
  };
}

function setLight(circuit: Circuit, lightLevel: number): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.type === 'ldr' || component.type === 'solar'
        ? { ...component, lightLevel }
        : component,
    ),
  };
}

function evaluate(levelId: string, circuit: Circuit): boolean {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  return evaluateLevelSuccess(level, circuit, simulateCircuit(circuit));
}

function expectSuccess(levelId: string, circuit: Circuit): void {
  expect(evaluate(levelId, circuit)).toBe(true);
}

function transientRun(
  levelId: string,
  closed: Circuit,
  open: Circuit | null,
  stepsClosed: number,
  stepsOpen: number,
): boolean {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  const runtime = createLevelRuntime();
  const simulator = createTransientSimulator(closed, { stepMs: 16 });

  for (let index = 0; index < stepsClosed; index += 1) {
    const frame = simulator.step();
    updateLevelRuntime(runtime, closed, frame.simulation, 16);
  }

  let current = closed;
  if (open !== null) {
    current = open;
    simulator.setCircuit(open);
  }

  for (let index = 0; index < stepsOpen; index += 1) {
    const frame = simulator.step();
    updateLevelRuntime(runtime, current, frame.simulation, 16);
  }

  return evaluateLevelSuccess(
    level,
    current,
    simulator.snapshot().simulation,
    runtime,
  );
}

describe('new level reference solutions', () => {
  it('sound-01..03', () => {
    let sound1 = circuitFor('sound-01');
    sound1.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('buzzer-1', 'a')),
      wire('w3', ref('buzzer-1', 'b'), ref('battery-1', 'negative')),
    ];
    sound1 = closeSwitch(sound1, 'switch-1');
    expectSuccess('sound-01', sound1);

    let sound2 = circuitFor('sound-02');
    sound2.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('switch-2', 'a')),
      wire('w3', ref('switch-2', 'b'), ref('buzzer-1', 'a')),
      wire('w4', ref('buzzer-1', 'b'), ref('battery-1', 'negative')),
    ];
    sound2 = closeSwitch(closeSwitch(sound2, 'switch-1'), 'switch-2');
    expectSuccess('sound-02', sound2);

    let sound3 = circuitFor('sound-03');
    sound3.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('motor-1', 'a')),
      wire('w3', ref('switch-1', 'b'), ref('buzzer-1', 'a')),
      wire('w4', ref('motor-1', 'b'), ref('battery-1', 'negative')),
      wire('w5', ref('buzzer-1', 'b'), ref('battery-1', 'negative')),
    ];
    sound3 = closeSwitch(sound3, 'switch-1');
    expectSuccess('sound-03', sound3);
  });

  it('diode-01..03', () => {
    let diode1 = circuitFor('diode-01');
    diode1.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('diode-1', 'anode')),
      wire('w3', ref('diode-1', 'cathode'), ref('bulb-1', 'a')),
      wire('w4', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    ];
    diode1 = closeSwitch(diode1, 'switch-1');
    expectSuccess('diode-01', diode1);

    let diode2 = circuitFor('diode-02');
    diode2.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('diode-1', 'anode')),
      wire('w3', ref('diode-1', 'cathode'), ref('buzzer-1', 'a')),
      wire('w4', ref('buzzer-1', 'b'), ref('battery-1', 'negative')),
    ];
    diode2 = closeSwitch(diode2, 'switch-1');
    expectSuccess('diode-02', diode2);

    const diode3 = circuitFor('diode-03');
    diode3.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('diode-1', 'anode')),
      wire('w2', ref('diode-1', 'cathode'), ref('bulb-1', 'a')),
      wire('w3', ref('battery-1', 'negative'), ref('bulb-1', 'b')),
      wire('w4', ref('battery-2', 'positive'), ref('diode-2', 'anode')),
      wire('w5', ref('diode-2', 'cathode'), ref('bulb-1', 'a')),
      wire('w6', ref('battery-2', 'negative'), ref('bulb-1', 'b')),
    ];
    expectSuccess('diode-03', diode3);
  });

  it('mag-01..05', () => {
    let mag1 = circuitFor('mag-01');
    mag1.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('coil-1', 'a')),
      wire('w3', ref('coil-1', 'b'), ref('battery-1', 'negative')),
    ];
    mag1 = closeSwitch(mag1, 'switch-1');
    expectSuccess('mag-01', mag1);

    let mag2 = circuitFor('mag-02');
    mag2.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('coil-long', 'a')),
      wire('w3', ref('coil-long', 'b'), ref('battery-1', 'negative')),
    ];
    mag2 = closeSwitch(mag2, 'switch-1');
    expectSuccess('mag-02', mag2);

    let mag3 = circuitFor('mag-03');
    mag3.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('reed-1', 'a')),
      wire('w2', ref('reed-1', 'b'), ref('bulb-1', 'a')),
      wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    ];
    mag3 = setReed(mag3, 'reed-1');
    expectSuccess('mag-03', mag3);

    let mag4 = circuitFor('mag-04');
    mag4.wires = [
      wire('w1', ref('coil-battery', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('relay-1', 'coilA')),
      wire('w3', ref('relay-1', 'coilB'), ref('coil-battery', 'negative')),
      wire('w4', ref('lamp-battery', 'positive'), ref('relay-1', 'contactA')),
      wire('w5', ref('relay-1', 'contactB'), ref('bulb-1', 'a')),
      wire('w6', ref('bulb-1', 'b'), ref('lamp-battery', 'negative')),
    ];
    mag4 = closeSwitch(mag4, 'switch-1');
    expectSuccess('mag-04', mag4);

    let mag5 = circuitFor('mag-05');
    mag5.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('reed-1', 'a')),
      wire('w2', ref('reed-1', 'b'), ref('buzzer-1', 'a')),
      wire('w3', ref('buzzer-1', 'b'), ref('battery-1', 'negative')),
    ];
    mag5 = setReed(mag5, 'reed-1');
    expectSuccess('mag-05', mag5);
  });

  it('sensor-01..03', () => {
    let sensor1 = circuitFor('sensor-01');
    sensor1.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('ldr-1', 'a')),
      wire('w2', ref('ldr-1', 'b'), ref('bulb-1', 'a')),
      wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    ];
    expectSuccess('sensor-01', sensor1);

    let sensor2 = circuitFor('sensor-02');
    sensor2.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('ldr-1', 'a')),
      wire('w2', ref('ldr-1', 'b'), ref('relay-1', 'coilA')),
      wire('w3', ref('relay-1', 'coilB'), ref('battery-1', 'negative')),
      wire('w4', ref('battery-1', 'positive'), ref('relay-1', 'contactA')),
      wire('w5', ref('relay-1', 'contactB'), ref('bulb-1', 'a')),
      wire('w6', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    ];
    sensor2 = setLight(sensor2, 0);
    expectSuccess('sensor-02', sensor2);

    const sensor3 = circuitFor('sensor-03');
    sensor3.wires = [
      wire('w1', ref('solar-1', 'positive'), ref('motor-1', 'a')),
      wire('w2', ref('motor-1', 'b'), ref('solar-1', 'negative')),
    ];
    expectSuccess('sensor-03', sensor3);
  });

  it('cap-01..06', () => {
    const capClosed = (levelId: string, capId: string, bulbId: string): Circuit => {
      const circuit = circuitFor(levelId);
      circuit.wires = [
        wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
        wire('w2', ref('switch-1', 'b'), ref(capId, 'a')),
        wire('w3', ref('switch-1', 'b'), ref(bulbId, 'a')),
        wire('w4', ref(capId, 'b'), ref('battery-1', 'negative')),
        wire('w5', ref(bulbId, 'b'), ref('battery-1', 'negative')),
      ];
      return closeSwitch(circuit, 'switch-1');
    };

    const open = (circuit: Circuit): Circuit => ({
      ...circuit,
      components: circuit.components.map((component) =>
        component.type === 'switch' ? { ...component, closed: false } : component,
      ),
    });

    const cap1 = capClosed('cap-01', 'capacitor-1', 'bulb-1');
    expect(transientRun('cap-01', cap1, open(cap1), 120, 30)).toBe(true);

    const cap2 = capClosed('cap-02', 'capacitor-1', 'bulb-1');
    expect(transientRun('cap-02', cap2, null, 160, 0)).toBe(true);

    let cap3 = circuitFor('cap-03');
    cap3.wires = [
      wire('w1', ref('capacitor-1', 'a'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('bulb-1', 'a')),
      wire('w3', ref('bulb-1', 'b'), ref('capacitor-1', 'b')),
    ];
    cap3 = closeSwitch(cap3, 'switch-1');
    expect(transientRun('cap-03', cap3, null, 160, 0)).toBe(true);

    const cap4 = capClosed('cap-04', 'capacitor-1', 'bulb-1');
    expect(transientRun('cap-04', cap4, open(cap4), 220, 140)).toBe(true);

    const cap5 = capClosed('cap-05', 'capacitor-large', 'bulb-1');
    expect(transientRun('cap-05', cap5, open(cap5), 260, 210)).toBe(true);

    const charge = circuitFor('cap-06');
    charge.wires = [
      wire('w1', ref('battery-1', 'positive'), ref('switch-charge', 'a')),
      wire('w2', ref('switch-charge', 'b'), ref('resistor-1', 'a')),
      wire('w3', ref('resistor-1', 'b'), ref('capacitor-1', 'a')),
      wire('w4', ref('capacitor-1', 'b'), ref('battery-1', 'negative')),
      wire('w5', ref('capacitor-1', 'a'), ref('switch-flash', 'a')),
      wire('w6', ref('switch-flash', 'b'), ref('led-1', 'anode')),
      wire('w7', ref('led-1', 'cathode'), ref('capacitor-1', 'b')),
    ];
    const charged = closeSwitch(charge, 'switch-charge');
    const flash: Circuit = {
      ...charged,
      components: charged.components.map((component) => {
        if (component.id === 'switch-charge' && component.type === 'switch') {
          return { ...component, closed: false };
        }
        if (component.id === 'switch-flash' && component.type === 'switch') {
          return { ...component, closed: true };
        }
        return component;
      }),
    };

    expect(transientRun('cap-06', charged, flash, 40, 40)).toBe(true);
  });
});
