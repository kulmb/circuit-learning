/**
 * Lightweight level metadata used by progress code that must stay in the
 * first-screen bundle. Full circuit definitions live in chapterLight.ts and
 * are loaded with the game screens.
 */
export interface LevelMetadata {
  id: string;
  order: number;
  nextLevelId: string | null;
  vocabularyIds: readonly string[];
}

export const CHAPTER_1_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'light-01',
    order: 1,
    nextLevelId: 'light-02',
    vocabularyIds: ['circuitFerme', 'fil'],
  },
  {
    id: 'light-02',
    order: 2,
    nextLevelId: 'light-03',
    vocabularyIds: ['circuitOuvert', 'circuitFerme'],
  },
  {
    id: 'light-03',
    order: 3,
    nextLevelId: 'light-04',
    vocabularyIds: ['interrupteur', 'circuitFerme'],
  },
  {
    id: 'light-04',
    order: 4,
    nextLevelId: 'light-05',
    vocabularyIds: ['conducteur', 'isolant'],
  },
  {
    id: 'light-05',
    order: 5,
    nextLevelId: 'light-06',
    vocabularyIds: ['serie'],
  },
  {
    id: 'light-06',
    order: 6,
    nextLevelId: 'light-symbols',
    vocabularyIds: ['parallele'],
  },
  {
    id: 'light-symbols',
    order: 7,
    nextLevelId: 'light-07',
    vocabularyIds: ['symbole'],
  },
  {
    id: 'light-07',
    order: 8,
    nextLevelId: 'light-08',
    vocabularyIds: ['courtCircuit'],
  },
  {
    id: 'light-08',
    order: 9,
    nextLevelId: 'light-09',
    vocabularyIds: ['moteur'],
  },
  {
    id: 'light-09',
    order: 10,
    nextLevelId: 'light-10',
    vocabularyIds: ['polarite'],
  },
  {
    id: 'light-10',
    order: 11,
    nextLevelId: null,
    vocabularyIds: ['circuitFerme', 'interrupteur', 'moteur'],
  },
];

export function getLevelMetadata(
  levelId: string,
): LevelMetadata | undefined {
  return CHAPTER_1_LEVEL_METADATA.find((level) => level.id === levelId);
}
