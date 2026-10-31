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
    nextLevelId: 'sound-01',
    vocabularyIds: ['combinaison'],
  },
];

export const CHAPTER_5_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'sound-01',
    order: 27,
    nextLevelId: 'sound-02',
    vocabularyIds: ['circuitFerme', 'sonnerie'],
  },
  {
    id: 'sound-02',
    order: 28,
    nextLevelId: 'sound-03',
    vocabularyIds: ['serie', 'sonnerie'],
  },
  {
    id: 'sound-03',
    order: 29,
    nextLevelId: 'diode-01',
    vocabularyIds: ['parallele', 'sonnerie'],
  },
];

export const CHAPTER_6_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'diode-01',
    order: 30,
    nextLevelId: 'diode-02',
    vocabularyIds: ['diode', 'sensUnique'],
  },
  {
    id: 'diode-02',
    order: 31,
    nextLevelId: 'diode-03',
    vocabularyIds: ['diode', 'sensUnique'],
  },
  {
    id: 'diode-03',
    order: 32,
    nextLevelId: 'mag-01',
    vocabularyIds: ['diode', 'sensUnique'],
  },
];

export const CHAPTER_7_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'mag-01',
    order: 33,
    nextLevelId: 'mag-02',
    vocabularyIds: ['electroAimant', 'bobine'],
  },
  {
    id: 'mag-02',
    order: 34,
    nextLevelId: 'mag-03',
    vocabularyIds: ['electroAimant', 'bobine'],
  },
  {
    id: 'mag-03',
    order: 35,
    nextLevelId: 'mag-04',
    vocabularyIds: ['lameSouple'],
  },
  {
    id: 'mag-04',
    order: 36,
    nextLevelId: 'mag-05',
    vocabularyIds: ['relais'],
  },
  {
    id: 'mag-05',
    order: 37,
    nextLevelId: 'sensor-01',
    vocabularyIds: ['lameSouple'],
  },
];

export const CHAPTER_8_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'sensor-01',
    order: 38,
    nextLevelId: 'sensor-02',
    vocabularyIds: ['capteurLumiere'],
  },
  {
    id: 'sensor-02',
    order: 39,
    nextLevelId: 'sensor-03',
    vocabularyIds: ['capteurLumiere', 'relais'],
  },
  {
    id: 'sensor-03',
    order: 40,
    nextLevelId: 'cap-01',
    vocabularyIds: ['panneauSolaire'],
  },
];

export const CHAPTER_9_LEVEL_METADATA: readonly LevelMetadata[] = [
  {
    id: 'cap-01',
    order: 41,
    nextLevelId: 'cap-02',
    vocabularyIds: ['condensateur', 'reserve'],
  },
  {
    id: 'cap-02',
    order: 42,
    nextLevelId: 'cap-03',
    vocabularyIds: ['charge'],
  },
  {
    id: 'cap-03',
    order: 43,
    nextLevelId: 'cap-04',
    vocabularyIds: ['decharge'],
  },
  {
    id: 'cap-04',
    order: 44,
    nextLevelId: 'cap-05',
    vocabularyIds: ['condensateur', 'reserve'],
  },
  {
    id: 'cap-05',
    order: 45,
    nextLevelId: 'cap-06',
    vocabularyIds: ['condensateur', 'reserve'],
  },
  {
    id: 'cap-06',
    order: 46,
    nextLevelId: null,
    vocabularyIds: ['condensateur', 'charge', 'decharge'],
  },
];

export const ALL_LEVEL_METADATA: readonly LevelMetadata[] = [
  ...CHAPTER_1_LEVEL_METADATA,
  ...CHAPTER_2_LEVEL_METADATA,
  ...CHAPTER_3_LEVEL_METADATA,
  ...CHAPTER_4_LEVEL_METADATA,
  ...CHAPTER_5_LEVEL_METADATA,
  ...CHAPTER_6_LEVEL_METADATA,
  ...CHAPTER_7_LEVEL_METADATA,
  ...CHAPTER_8_LEVEL_METADATA,
  ...CHAPTER_9_LEVEL_METADATA,
];

export function getLevelMetadata(
  levelId: string,
): LevelMetadata | undefined {
  return ALL_LEVEL_METADATA.find((level) => level.id === levelId);
}
