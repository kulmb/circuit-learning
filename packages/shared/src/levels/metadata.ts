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
    nextLevelId: 'current-01',
    vocabularyIds: ['circuitFerme', 'interrupteur', 'moteur'],
  },
];

export const CHAPTER_2_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'current-01',
    order: 12,
    nextLevelId: 'current-02',
    vocabularyIds: ['borne'],
  },
  {
    id: 'current-02',
    order: 13,
    nextLevelId: 'current-03',
    vocabularyIds: ['tension'],
  },
  {
    id: 'current-03',
    order: 14,
    nextLevelId: 'current-04',
    vocabularyIds: ['courant'],
  },
  {
    id: 'current-04',
    order: 15,
    nextLevelId: 'current-05',
    vocabularyIds: ['resistance'],
  },
  {
    id: 'current-05',
    order: 16,
    nextLevelId: 'current-06',
    vocabularyIds: ['variateur'],
  },
  {
    id: 'current-06',
    order: 17,
    nextLevelId: 'current-07',
    vocabularyIds: ['courant', 'resistance', 'variateur'],
  },
  {
    id: 'current-07',
    order: 18,
    nextLevelId: 'assembly-01',
    vocabularyIds: ['puissance'],
  },
];

export const CHAPTER_3_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'assembly-01',
    order: 19,
    nextLevelId: 'assembly-02',
    vocabularyIds: ['serie'],
  },
  {
    id: 'assembly-02',
    order: 20,
    nextLevelId: 'assembly-03',
    vocabularyIds: ['parallele'],
  },
  {
    id: 'assembly-03',
    order: 21,
    nextLevelId: 'assembly-04',
    vocabularyIds: ['combinaison'],
  },
  {
    id: 'assembly-04',
    order: 22,
    nextLevelId: 'defi-01',
    vocabularyIds: ['combinaison'],
  },
];

export const CHAPTER_4_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'defi-01',
    order: 23,
    nextLevelId: 'defi-02',
    vocabularyIds: ['circuitFerme'],
  },
  {
    id: 'defi-02',
    order: 24,
    nextLevelId: 'defi-03',
    vocabularyIds: ['serie'],
  },
  {
    id: 'defi-03',
    order: 25,
    nextLevelId: 'defi-04',
    vocabularyIds: ['parallele'],
  },
  {
    id: 'defi-04',
    order: 26,
    nextLevelId: null,
    vocabularyIds: ['combinaison'],
  },
];

export const ALL_LEVEL_METADATA: readonly LevelMetadata[] = [
  ...CHAPTER_1_LEVEL_METADATA,
  ...CHAPTER_2_LEVEL_METADATA,
  ...CHAPTER_3_LEVEL_METADATA,
  ...CHAPTER_4_LEVEL_METADATA,
];

export function getLevelMetadata(
  levelId: string,
): LevelMetadata | undefined {
  return ALL_LEVEL_METADATA.find((level) => level.id === levelId);
}
