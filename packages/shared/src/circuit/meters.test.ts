import { describe, expect, it } from 'vitest';

import { createComponent } from './components';
import { readCircuitMeters } from './meters';
import { simulateCircuit } from './simulate';
import type { Circuit, TerminalRef } from './types';

function ref(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}

function metersFor(circuit: Circuit) {
  return readCircuitMeters(circuit, simulateCircuit(circuit));
}

function singleBulb(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery-1' }),
      createComponent('bulb', { id: 'bulb-1' }),
    ],
    wires: [
      { id: 'w1', from: ref('battery-1', 'positive'), to: ref('bulb-1', 'a') },
      { id: 'w2', from: ref('bulb-1', 'b'), to: ref('battery-1', 'negative') },
    ],
  };
}

function seriesBulbs(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery-1' }),
      createComponent('bulb', { id: 'bulb-1' }),
      createComponent('bulb', { id: 'bulb-2' }),
    ],
    wires: [
      { id: 'w1', from: ref('battery-1', 'positive'), to: ref('bulb-1', 'a') },
      { id: 'w2', from: ref('bulb-1', 'b'), to: ref('bulb-2', 'a') },
      { id: 'w3', from: ref('bulb-2', 'b'), to: ref('battery-1', 'negative') },
    ],
  };
}

function parallelBulbs(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery-1' }),
      createComponent('bulb', { id: 'bulb-1' }),
      createComponent('bulb', { id: 'bulb-2' }),
    ],
    wires: [
      { id: 'w1', from: ref('battery-1', 'positive'), to: ref('bulb-1', 'a') },
      { id: 'w2', from: ref('battery-1', 'positive'), to: ref('bulb-2', 'a') },
      { id: 'w3', from: ref('bulb-1', 'b'), to: ref('battery-1', 'negative') },
      { id: 'w4', from: ref('bulb-2', 'b'), to: ref('battery-1', 'negative') },
    ],
  };
}

describe('qualitative circuit meters', () => {
  it('reads medium values for a single nominal bulb', () => {
    const meters = metersFor(singleBulb());

    expect(meters.tension.status).toBe('medium');
    expect(meters.courant.status).toBe('medium');
    expect(meters.resistance.status).toBe('medium');
    expect(meters.puissance.status).toBe('medium');
    expect(meters.courant.value).toBeCloseTo(0.4286, 3);
    expect(meters.resistance.value).toBeCloseTo(10.5, 3);
    expect(meters.puissance.value).toBeCloseTo(1.9286, 3);
  });

  it('shows a weak current and a strong resistance in series', () => {
    const meters = metersFor(seriesBulbs());

    expect(meters.courant.status).toBe('low');
    expect(meters.resistance.status).toBe('high');
    expect(meters.puissance.status).toBe('low');
  });

  it('shows a strong current and a weak resistance in parallel', () => {
    const meters = metersFor(parallelBulbs());

    expect(meters.courant.status).toBe('high');
    expect(meters.resistance.status).toBe('low');
    expect(meters.puissance.status).toBe('medium');
  });

  it('raises tension and power with a second battery', () => {
    const circuit = singleBulb();
    circuit.components.push(createComponent('battery', { id: 'battery-2' }));
    circuit.wires = [
      { id: 'w1', from: ref('battery-1', 'positive'), to: ref('battery-2', 'negative') },
      { id: 'w2', from: ref('battery-2', 'positive'), to: ref('bulb-1', 'a') },
      { id: 'w3', from: ref('bulb-1', 'b'), to: ref('battery-1', 'negative') },
    ];

    const meters = metersFor(circuit);

    expect(meters.tension.status).toBe('high');
    expect(meters.courant.status).toBe('high');
    expect(meters.puissance.status).toBe('high');
    expect(meters.resistance.status).toBe('medium');
  });

  it('keeps the voltage but turns the other meters off when the circuit is open', () => {
    const circuit = singleBulb();
    circuit.wires = circuit.wires.slice(0, 1);

    const meters = metersFor(circuit);

    expect(meters.tension.status).toBe('medium');
    expect(meters.courant.status).toBe('off');
    expect(meters.resistance.status).toBe('off');
    expect(meters.puissance.status).toBe('off');
  });

  it('turns every meter off without a battery', () => {
    const meters = readCircuitMeters(
      { components: [], wires: [] },
      simulateCircuit({ components: [], wires: [] }),
    );

    expect(meters.tension.status).toBe('off');
    expect(meters.courant.status).toBe('off');
    expect(meters.resistance.status).toBe('off');
    expect(meters.puissance.status).toBe('off');
  });

  it('alerts every meter on a short circuit', () => {
    const circuit = singleBulb();
    circuit.wires.push({
      id: 'short',
      from: ref('battery-1', 'positive'),
      to: ref('battery-1', 'negative'),
    });

    const meters = metersFor(circuit);

    expect(meters.tension.status).toBe('alert');
    expect(meters.courant.status).toBe('alert');
    expect(meters.resistance.status).toBe('alert');
    expect(meters.puissance.status).toBe('alert');
  });
});
