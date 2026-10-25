import {
  CHAPTER_1_ID,
  CHAPTER_1_LEVELS,
  CHAPTER_1_TITLE_ID,
} from './chapterLight';
import {
  CHAPTER_2_ID,
  CHAPTER_2_LEVELS,
  CHAPTER_2_TITLE_ID,
} from './chapterCurrent';
import {
  CHAPTER_3_ID,
  CHAPTER_3_LEVELS,
  CHAPTER_3_TITLE_ID,
} from './chapterAssemblies';
import {
  CHAPTER_4_ID,
  CHAPTER_4_LEVELS,
  CHAPTER_4_TITLE_ID,
} from './chapterChallenges';
import type { LevelDefinition } from './types';

export interface ChapterDefinition {
  id: string;
  titleTextId: string;
  levels: readonly LevelDefinition[];
}

export const CHAPTERS: readonly ChapterDefinition[] = [
  {
    id: CHAPTER_1_ID,
    titleTextId: CHAPTER_1_TITLE_ID,
    levels: CHAPTER_1_LEVELS,
  },
  {
    id: CHAPTER_2_ID,
    titleTextId: CHAPTER_2_TITLE_ID,
    levels: CHAPTER_2_LEVELS,
  },
  {
    id: CHAPTER_3_ID,
    titleTextId: CHAPTER_3_TITLE_ID,
    levels: CHAPTER_3_LEVELS,
  },
  {
    id: CHAPTER_4_ID,
    titleTextId: CHAPTER_4_TITLE_ID,
    levels: CHAPTER_4_LEVELS,
  },
];

export const ALL_LEVELS: readonly LevelDefinition[] =
  CHAPTERS.flatMap((chapter) => chapter.levels);

export function getLevelById(levelId: string): LevelDefinition | undefined {
  return ALL_LEVELS.find((level) => level.id === levelId);
}

export function getNextLevel(levelId: string): LevelDefinition | undefined {
  const level = getLevelById(levelId);

  if (level === undefined || level.nextLevelId === null) {
    return undefined;
  }

  return getLevelById(level.nextLevelId);
}

export function getChapterForLevel(
  levelId: string,
): ChapterDefinition | undefined {
  return CHAPTERS.find((chapter) =>
    chapter.levels.some((level) => level.id === levelId),
  );
}
