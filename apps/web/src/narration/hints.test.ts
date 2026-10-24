import {
  createComponent,
  createWire,
  simulateCircuit,
  type Circuit,
  type TerminalRef,
} from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import { buildHintPlan, hintExpression } from './hints';

function ref(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}

function plan(circuit: Circuit) {
  return buildHintPlan(simulateCircuit(circuit), circuit);
}

describe('circuit hints', () => {
  it('gives an open-circuit hint with the dangling terminal', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('bulb', 'a')),
        createWire('w2', ref('bulb', 'b'), ref('battery', 'positive')),
      ],
    };

    const result = plan(circuit);

    expect(result.code).toBe('open_circuit');
    expect(result.texts[0]).toBe('zap.hint.open.1');
    expect(result.highlight?.terminalRefs).toContainEqual(
      ref('battery', 'negative'),
    );
    expect(result.highlight?.componentIds).toContain('battery');
  });

  it('gives a bulb-one-side hint', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [createWire('w1', ref('battery', 'positive'), ref('bulb', 'a'))],
    };

    const result = plan(circuit);

    expect(result.code).toBe('bulb_one_side');
    expect(result.texts[0]).toBe('zap.hint.bulb.1');
    expect(result.highlight?.componentIds).toContain('bulb');
  });

  it('points at the short wire', () => {
    const circuit: Circuit = {
      components: [createComponent('battery', { id: 'battery' })],
      wires: [createWire('short', ref('battery', 'positive'), ref('battery', 'negative'))],
    };

    const result = plan(circuit);

    expect(result.code).toBe('short_circuit');
    expect(result.texts[0]).toBe('zap.hint.short.1');
    expect(result.highlight?.wireIds).toContain('short');
  });

  it('points at the battery slot when the battery is missing', () => {
    const circuit: Circuit = {
      components: [createComponent('bulb', { id: 'bulb' })],
      wires: [],
    };

    const result = plan(circuit);

    expect(result.code).toBe('missing_battery');
    expect(result.highlight?.paletteKey).toBe('battery');
  });

  it('points at the open switch', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('switch', { id: 'switch', closed: false }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('switch', 'a')),
        createWire('w2', ref('switch', 'b'), ref('bulb', 'a')),
        createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = plan(circuit);

    expect(result.code).toBe('switch_open');
    expect(result.highlight?.componentIds).toContain('switch');
  });

  it('points at the insulating material', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('material', { id: 'material', conductive: false }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('material', 'a')),
        createWire('w2', ref('material', 'b'), ref('bulb', 'a')),
        createWire('w3', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = plan(circuit);

    expect(result.code).toBe('insulating_material');
    expect(result.highlight?.componentIds).toContain('material');
  });

  it('points at a reversed LED', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('led', { id: 'led' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('led', 'cathode')),
        createWire('w2', ref('led', 'anode'), ref('battery', 'negative')),
      ],
    };

    const result = plan(circuit);

    expect(result.code).toBe('led_reversed');
    expect(result.highlight?.componentIds).toContain('led');
  });

  it('celebrates a lit bulb', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('bulb', { id: 'bulb' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('bulb', 'a')),
        createWire('w2', ref('bulb', 'b'), ref('battery', 'negative')),
      ],
    };

    const result = plan(circuit);

    expect(result.code).toBe('success');
    expect(result.texts[0]).toBe('zap.successBulb');
    expect(result.highlight).toBeNull();
  });

  it('uses a generic success message without a bulb', () => {
    const circuit: Circuit = {
      components: [
        createComponent('battery', { id: 'battery' }),
        createComponent('resistor', { id: 'resistor' }),
      ],
      wires: [
        createWire('w1', ref('battery', 'positive'), ref('resistor', 'a')),
        createWire('w2', ref('resistor', 'b'), ref('battery', 'negative')),
      ],
    };

    expect(plan(circuit).texts[0]).toBe('zap.successGeneric');
  });
});

describe('hint expressions', () => {
  it('gets more surprised as hints progress', () => {
    const openPlan = buildHintPlan(
      simulateCircuit({
        components: [
          createComponent('battery', { id: 'battery' }),
          createComponent('bulb', { id: 'bulb' }),
        ],
        wires: [],
      }),
      {
        components: [
          createComponent('battery', { id: 'battery' }),
          createComponent('bulb', { id: 'bulb' }),
        ],
        wires: [],
      },
    );

    expect(hintExpression(openPlan, 1)).toBe('thinking');
    expect(hintExpression(openPlan, 3)).toBe('surprised');
  });

  it('uses the alert face on a short circuit', () => {
    const circuit: Circuit = {
      components: [createComponent('battery', { id: 'battery' })],
      wires: [createWire('short', ref('battery', 'positive'), ref('battery', 'negative'))],
    };

    const shortPlan = plan(circuit);

    expect(hintExpression(shortPlan, 3)).toBe('alert');
  });
});
