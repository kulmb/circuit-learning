import { describe, expect, it } from 'vitest';

import type { Circuit } from '../circuit';
import { cloneComponent, createComponent, createWire } from '../circuit';
import { simulateCircuit } from '../circuit/simulate';
import {
  CHAPTER_1_LEVELS,
  getLevelById,
  getNextLevel,
} from './chapterLight';
import { starsForHints } from './stars';
import { evaluateLevelSuccess } from './success';

function circuitFromLevel(levelId: string): Circuit {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  return {
    components: level.preplacedComponents.map((entry) =>
      cloneComponent(entry.component),
    ),
    wires: level.preplacedWires.map((wire) => ({ ...wire })),
  };
}

function evaluate(levelId: string, circuit: Circuit): boolean {
  const level = getLevelById(levelId);
  if (level === undefined) {
    throw new Error(`Unknown level ${levelId}`);
  }

  return evaluateLevelSuccess(level, circuit, simulateCircuit(circuit));
}

function ref(componentId: string, terminalId: string) {
  return { componentId, terminalId };
}

function wire(id: string, from: ReturnType<typeof ref>, to: ReturnType<typeof ref>) {
  return createWire(id, from, to);
}

describe('chapter 1 data', () => {
  it('has unique ids, ordered levels and coherent next links', () => {
    const ids = CHAPTER_1_LEVELS.map((level) => level.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('light-01');
    expect(ids[ids.length - 1]).toBe('light-10');
    expect(CHAPTER_1_LEVELS.map((level) => level.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);

    for (const level of CHAPTER_1_LEVELS) {
      if (level.nextLevelId !== null) {
        expect(getLevelById(level.nextLevelId)).toBeDefined();
      }
    }

    expect(getNextLevel('light-06')?.id).toBe('light-symbols');
    expect(getNextLevel('light-symbols')?.id).toBe('light-07');
  });

  it('uses realistic art for levels 1–6, overlays for 7–9 and symbols for 10', () => {
    expect(getLevelById('light-01')?.displayMode).toBe('realistic');
    expect(getLevelById('light-06')?.displayMode).toBe('realistic');
    expect(getLevelById('light-07')?.displayMode).toBe('overlay');
    expect(getLevelById('light-09')?.displayMode).toBe('overlay');
    expect(getLevelById('light-10')?.displayMode).toBe('symbol');
  });
});

describe('stars', () => {
  it('awards 3 stars without hints, 2 for one or two and 1 beyond', () => {
    expect(starsForHints(0)).toBe(3);
    expect(starsForHints(1)).toBe(2);
    expect(starsForHints(2)).toBe(2);
    expect(starsForHints(3)).toBe(1);
    expect(starsForHints(9)).toBe(1);
  });
});

describe('level success conditions', () => {
  it('lights the first bulb when the loop is closed', () => {
    const circuit = circuitFromLevel('light-01');
    expect(evaluate('light-01', circuit)).toBe(false);

    circuit.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
      wire('w2', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    );

    expect(evaluate('light-01', circuit)).toBe(true);
  });

  it('asks for both the switch and the lit bulb', () => {
    const openCircuit = circuitFromLevel('light-03');
    expect(evaluate('light-03', openCircuit)).toBe(false);

    const closedCircuit: Circuit = {
      components: openCircuit.components.map((component) => {
        const clone = cloneComponent(component);
        if (clone.type === 'switch') {
          clone.closed = true;
        }
        return clone;
      }),
      wires: openCircuit.wires,
    };

    expect(evaluate('light-03', closedCircuit)).toBe(true);
  });

  it('accepts series bulbs for level 5 but not parallel bulbs', () => {
    const series = circuitFromLevel('light-05');
    series.components.push(
      createComponent('bulb', { id: 'bulb-2', position: { x: 9, y: 4 } }),
    );
    series.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
      wire('w2', ref('bulb-1', 'b'), ref('bulb-2', 'a')),
      wire('w3', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-05', series)).toBe(true);

    const parallel = circuitFromLevel('light-05');
    parallel.components.push(
      createComponent('bulb', { id: 'bulb-2', position: { x: 9, y: 4 } }),
    );
    parallel.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
      wire('w2', ref('battery-1', 'positive'), ref('bulb-2', 'a')),
      wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      wire('w4', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-05', parallel)).toBe(false);
  });

  it('accepts parallel bulbs for level 6 but not series bulbs', () => {
    const parallel = circuitFromLevel('light-06');
    parallel.components.push(
      createComponent('bulb', { id: 'bulb-2', position: { x: 9, y: 4 } }),
    );
    parallel.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
      wire('w2', ref('battery-1', 'positive'), ref('bulb-2', 'a')),
      wire('w3', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
      wire('w4', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-06', parallel)).toBe(true);

    const series = circuitFromLevel('light-06');
    series.components.push(
      createComponent('bulb', { id: 'bulb-2', position: { x: 9, y: 4 } }),
    );
    series.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
      wire('w2', ref('bulb-1', 'b'), ref('bulb-2', 'a')),
      wire('w3', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-06', series)).toBe(false);
  });

  it('fails on a short circuit and succeeds once the short wire is removed', () => {
    const shorted = circuitFromLevel('light-07');
    expect(evaluate('light-07', shorted)).toBe(false);

    const fixed: Circuit = {
      components: shorted.components,
      wires: shorted.wires.filter((wire) => wire.id !== 'light-07-short'),
    };
    expect(evaluate('light-07', fixed)).toBe(true);
  });

  it('runs a motor and a LED in their respective levels', () => {
    const motorCircuit = circuitFromLevel('light-08');
    motorCircuit.components.push(
      createComponent('motor', { id: 'motor-1', position: { x: 8, y: 4 } }),
    );
    motorCircuit.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('motor-1', 'a')),
      wire('w2', ref('motor-1', 'b'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-08', motorCircuit)).toBe(true);

    const ledCircuit = circuitFromLevel('light-09');
    ledCircuit.components.push(
      createComponent('led', { id: 'led-1', position: { x: 8, y: 4 } }),
    );
    ledCircuit.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('led-1', 'anode')),
      wire('w2', ref('led-1', 'cathode'), ref('battery-1', 'negative')),
    );
    expect(evaluate('light-09', ledCircuit)).toBe(true);
  });

  it('requires independent switches in the final level', () => {
    const independent = buildFinalCircuit(false);
    expect(evaluate('light-10', independent)).toBe(true);

    const coupled = buildFinalCircuit(true);
    expect(evaluate('light-10', coupled)).toBe(false);
  });
});

function buildFinalCircuit(sharedSwitch: boolean) {
  const circuit = circuitFromLevel('light-10');
  circuit.components.push(
    createComponent('switch', { id: 'switch-1', closed: true }),
    createComponent('switch', { id: 'switch-2', closed: true }),
    createComponent('motor', { id: 'motor-1' }),
    createComponent('bulb', { id: 'bulb-1' }),
  );

  if (sharedSwitch) {
    circuit.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('switch-2', 'a')),
      wire('w3', ref('switch-2', 'b'), ref('motor-1', 'a')),
      wire('w4', ref('switch-2', 'b'), ref('bulb-1', 'a')),
      wire('w5', ref('motor-1', 'b'), ref('battery-1', 'negative')),
      wire('w6', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    );
  } else {
    circuit.wires.push(
      wire('w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
      wire('w2', ref('switch-1', 'b'), ref('motor-1', 'a')),
      wire('w3', ref('motor-1', 'b'), ref('battery-1', 'negative')),
      wire('w4', ref('battery-1', 'positive'), ref('switch-2', 'a')),
      wire('w5', ref('switch-2', 'b'), ref('bulb-1', 'a')),
      wire('w6', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    );
  }

  return circuit;
}
