import {
  CHAPTER_1_LEVELS,
  createComponent,
  createWire,
  simulateCircuit,
  type LevelProgress,
  type PlayerProgress,
} from '@circuits/shared';
import { describe, expect, it } from 'vitest';

import {
  chooseSandboxCuriosity,
  createSandboxStarter,
  nextSandboxName,
  sandboxCuriosityTips,
  sandboxFingerprint,
  sandboxPaletteIsComplete,
  sandboxPaletteItems,
  sandboxPhotoFileName,
} from './sandbox';

function progressWith(completed: readonly string[]): PlayerProgress {
  const levels: Record<string, LevelProgress> = {};

  for (const level of CHAPTER_1_LEVELS) {
    const isCompleted = completed.includes(level.id);
    levels[level.id] = {
      levelId: level.id,
      status: isCompleted ? 'completed' : 'unlocked',
      stars: isCompleted ? 3 : 0,
      attempts: isCompleted ? 1 : 0,
      hintsUsed: 0,
      bestTimeMs: isCompleted ? 1000 : null,
      firstCompletedAt: isCompleted ? 1000 : null,
      lastPlayedAt: isCompleted ? 1000 : null,
    };
  }

  return { levels, vocabulary: [] };
}

describe('sandbox palette', () => {
  it('starts with the battery and the bulb only', () => {
    expect(sandboxPaletteItems(null).map((item) => item.key)).toEqual([
      'battery',
      'bulb',
    ]);
  });

  it('unlocks components when their level is completed', () => {
    const palette = sandboxPaletteItems(
      progressWith([
        'light-03',
        'light-04',
        'light-symbols',
        'light-08',
        'light-09',
      ]),
    );

    expect(palette.map((item) => item.key)).toEqual([
      'battery',
      'bulb',
      'switch',
      'motor',
      'led',
      'resistor',
      'metal',
      'gum',
    ]);
    expect(sandboxPaletteIsComplete(progressWith([
      'light-03',
      'light-04',
      'light-symbols',
      'light-08',
      'light-09',
    ]))).toBe(true);
  });

  it('does not unlock a component from an unfinished level', () => {
    const palette = sandboxPaletteItems(progressWith(['light-03']));

    expect(palette.map((item) => item.key)).toEqual([
      'battery',
      'bulb',
      'switch',
    ]);
    expect(sandboxPaletteIsComplete(progressWith(['light-03']))).toBe(false);
  });
});

describe('sandbox naming', () => {
  it('finds the first free circuit name', () => {
    expect(nextSandboxName([])).toBe('Mon circuit 1');
    expect(
      nextSandboxName([
        { name: 'Mon circuit 1' },
        { name: 'Mon circuit 3' },
      ]),
    ).toBe('Mon circuit 2');
  });

  it('makes a safe file name from French accents', () => {
    expect(sandboxPhotoFileName('Mon circuit étoilé !')).toBe(
      'circuit-zap-mon-circuit-etoile.png',
    );
    expect(sandboxPhotoFileName('   ')).toBe('circuit-zap-atelier.png');
  });
});

describe('sandbox circuit helpers', () => {
  it('creates a valid starter circuit without wires', () => {
    const starter = createSandboxStarter();

    expect(starter.components).toHaveLength(2);
    expect(starter.wires).toHaveLength(0);
    expect(JSON.parse(sandboxFingerprint(starter))).toBeDefined();
  });
});

describe('sandbox curiosity', () => {
  const empty = { components: [], wires: [] };

  it('invites the child to place a battery and a bulb on an empty board', () => {
    expect(
      sandboxCuriosityTips(empty, simulateCircuit(empty), new Set()),
    ).toEqual(['sandbox.curiosity.empty']);
  });

  it('only suggests components that are unlocked', () => {
    const circuit = {
      components: [
        createComponent('battery', {
          id: 'battery-1',
          position: { x: 3, y: 4 },
        }),
      ],
      wires: [],
    };

    expect(
      sandboxCuriosityTips(
        circuit,
        simulateCircuit(circuit),
        new Set(['battery', 'bulb']),
      ),
    ).toEqual([
      'sandbox.curiosity.bulb',
      'sandbox.curiosity.secondBattery',
      'sandbox.curiosity.rotate',
    ]);
  });

  it('stays quiet while the battery is shorted', () => {
    const battery = createComponent('battery', {
      id: 'battery-1',
      position: { x: 3, y: 4 },
    });
    const circuit = {
      components: [battery],
      wires: [
        createWire(
          'wire-1',
          { componentId: 'battery-1', terminalId: 'positive' },
          { componentId: 'battery-1', terminalId: 'negative' },
        ),
      ],
    };
    const simulation = simulateCircuit(circuit);

    expect(simulation.shortCircuit).toBe(true);
    expect(
      sandboxCuriosityTips(circuit, simulation, new Set(['battery'])),
    ).toEqual([]);
  });

  it('varies the prompt instead of repeating the previous one', () => {
    expect(
      chooseSandboxCuriosity(['a', 'b'], 'a'),
    ).toBe('b');
    expect(chooseSandboxCuriosity(['a'], 'a')).toBe('a');
    expect(chooseSandboxCuriosity([], 'a')).toBeNull();
  });
});
