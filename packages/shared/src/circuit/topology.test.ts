import { describe, expect, it } from 'vitest';

import { createComponent } from './components';
import { areInParallel, areInSeries } from './topology';
import type { Circuit, TerminalRef } from './types';

function ref(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}

function seriesBulbs(closedSwitch = false): Circuit {
  const wires: Circuit['wires'] = [
    { id: 'w1', from: ref('battery-1', 'positive'), to: ref('bulb-1', 'a') },
    { id: 'w3', from: ref('bulb-2', 'b'), to: ref('battery-1', 'negative') },
  ];

  if (closedSwitch) {
    wires.push({
      id: 'w2',
      from: ref('bulb-1', 'b'),
      to: ref('switch-1', 'a'),
    });
    wires.push({
      id: 'w4',
      from: ref('switch-1', 'b'),
      to: ref('bulb-2', 'a'),
    });
  } else {
    wires.push({
      id: 'w2',
      from: ref('bulb-1', 'b'),
      to: ref('bulb-2', 'a'),
    });
  }

  return {
    components: [
      createComponent('battery', { id: 'battery-1' }),
      createComponent('bulb', { id: 'bulb-1' }),
      createComponent('bulb', { id: 'bulb-2' }),
      ...(closedSwitch
        ? [createComponent('switch', { id: 'switch-1', closed: true })]
        : []),
    ],
    wires,
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

function combination(): Circuit {
  return {
    components: [
      createComponent('battery', { id: 'battery-1' }),
      createComponent('bulb', { id: 'bulb-1', resistance: 3 }),
      createComponent('bulb', { id: 'bulb-2', resistance: 20 }),
      createComponent('bulb', { id: 'bulb-3', resistance: 20 }),
    ],
    wires: [
      { id: 'w1', from: ref('battery-1', 'positive'), to: ref('bulb-1', 'a') },
      { id: 'w2', from: ref('bulb-1', 'b'), to: ref('bulb-2', 'a') },
      { id: 'w3', from: ref('bulb-1', 'b'), to: ref('bulb-3', 'a') },
      { id: 'w4', from: ref('bulb-2', 'b'), to: ref('battery-1', 'negative') },
      { id: 'w5', from: ref('bulb-3', 'b'), to: ref('battery-1', 'negative') },
    ],
  };
}

describe('circuit topology', () => {
  it('detects two bulbs in series', () => {
    const circuit = seriesBulbs();

    expect(areInSeries(circuit, 'bulb-1', 'bulb-2')).toBe(true);
    expect(areInParallel(circuit, 'bulb-1', 'bulb-2')).toBe(false);
  });

  it('detects two bulbs in parallel', () => {
    const circuit = parallelBulbs();

    expect(areInParallel(circuit, 'bulb-1', 'bulb-2')).toBe(true);
    expect(areInSeries(circuit, 'bulb-1', 'bulb-2')).toBe(false);
  });

  it('sees through a closed switch between two series bulbs', () => {
    const circuit = seriesBulbs(true);

    expect(areInSeries(circuit, 'bulb-1', 'bulb-2')).toBe(true);
  });

  it('recognises the parallel pair inside a combination circuit', () => {
    const circuit = combination();

    expect(areInParallel(circuit, 'bulb-2', 'bulb-3')).toBe(true);
    expect(areInSeries(circuit, 'bulb-1', 'bulb-2')).toBe(false);
    expect(areInSeries(circuit, 'bulb-1', 'bulb-3')).toBe(false);
  });

  it('returns false for unknown components', () => {
    const circuit = parallelBulbs();

    expect(areInSeries(circuit, 'bulb-1', 'missing')).toBe(false);
    expect(areInParallel(circuit, 'bulb-1', 'missing')).toBe(false);
  });
});
