import type { LevelDefinition } from './types';

const BOARD = { columns: 12, rows: 8 };

export const CHAPTER_4_ID = 'challenges';
export const CHAPTER_4_TITLE_ID = 'chapter.challenges.title';

/**
 * Challenge tiers are placeholders on the map. Their circuit, components and
 * success conditions are generated from a seed in `challenges/generate.ts`
 * before the level is played; the progress repository keeps the tier id.
 */
export const CHAPTER_4_LEVELS: LevelDefinition[] = [
  {
    id: 'defi-01',
    chapterId: CHAPTER_4_ID,
    order: 23,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.defi.01.title',
    goalTextId: 'level.defi.01.goal',
    introTextId: 'level.defi.01.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant'],
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [{ type: 'circuit_ok' }],
    hintTextIds: [
      'level.defi.01.hint.1',
      'level.defi.01.hint.2',
      'level.defi.01.hint.3',
    ],
    vocabularyIds: ['circuitFerme'],
    nextLevelId: 'defi-02',
    challenge: { tier: 1, budget: 2 },
  },
  {
    id: 'defi-02',
    chapterId: CHAPTER_4_ID,
    order: 24,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.defi.02.title',
    goalTextId: 'level.defi.02.goal',
    introTextId: 'level.defi.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant'],
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [{ type: 'circuit_ok' }],
    hintTextIds: [
      'level.defi.02.hint.1',
      'level.defi.02.hint.2',
      'level.defi.02.hint.3',
    ],
    vocabularyIds: ['serie'],
    nextLevelId: 'defi-03',
    challenge: { tier: 2, budget: 3 },
  },
  {
    id: 'defi-03',
    chapterId: CHAPTER_4_ID,
    order: 25,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.defi.03.title',
    goalTextId: 'level.defi.03.goal',
    introTextId: 'level.defi.03.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant', 'puissance'],
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [{ type: 'circuit_ok' }],
    hintTextIds: [
      'level.defi.03.hint.1',
      'level.defi.03.hint.2',
      'level.defi.03.hint.3',
    ],
    vocabularyIds: ['parallele'],
    nextLevelId: 'defi-04',
    challenge: { tier: 3, budget: 4 },
  },
  {
    id: 'defi-04',
    chapterId: CHAPTER_4_ID,
    order: 26,
    number: 4,
    kind: 'circuit',
    titleTextId: 'level.defi.04.title',
    goalTextId: 'level.defi.04.goal',
    introTextId: 'level.defi.04.intro',
    board: BOARD,
    displayMode: 'symbol',
    meters: ['tension', 'courant', 'puissance'],
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [{ type: 'circuit_ok' }],
    hintTextIds: [
      'level.defi.04.hint.1',
      'level.defi.04.hint.2',
      'level.defi.04.hint.3',
    ],
    vocabularyIds: ['combinaison'],
    nextLevelId: 'sound-01',
    challenge: { tier: 4, budget: 5 },
  },
];
