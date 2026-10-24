import { CHAPTER_1_LEVELS, getLevelById } from '../levels/chapterLight';
import { starsForHints } from '../levels/stars';
import type {
  AttemptResult,
  LevelProgress,
  PlayerProgress,
} from './types';

function emptyLevelProgress(
  levelId: string,
  status: LevelProgress['status'],
): LevelProgress {
  return {
    levelId,
    status,
    stars: 0,
    attempts: 0,
    hintsUsed: 0,
    bestTimeMs: null,
    firstCompletedAt: null,
    lastPlayedAt: null,
  };
}

/** A fresh chapter: only the first level is playable. */
export function initialPlayerProgress(): PlayerProgress {
  return {
    levels: Object.fromEntries(
      CHAPTER_1_LEVELS.map((level, index) => [
        level.id,
        emptyLevelProgress(level.id, index === 0 ? 'unlocked' : 'locked'),
      ]),
    ),
    vocabulary: [],
  };
}

/**
 * The same optimistic rule the local repository applies. The server remains
 * the source of truth; this keeps the map responsive while an attempt waits
 * in the offline queue.
 */
export function applyAttemptToProgress(
  progress: PlayerProgress,
  levelId: string,
  result: AttemptResult,
  now = Date.now(),
): PlayerProgress {
  const level = getLevelById(levelId);

  if (level === undefined) {
    return progress;
  }

  const levels = { ...progress.levels };
  const current =
    levels[levelId] ??
    emptyLevelProgress(levelId, level.order === 1 ? 'unlocked' : 'locked');
  const hintsUsed = Math.max(0, Math.round(result.hintsUsed));
  const durationMs = Math.max(0, Math.round(result.durationMs));
  const next: LevelProgress = {
    ...current,
    attempts: current.attempts + 1,
    lastPlayedAt: now,
  };

  if (result.success) {
    const stars = starsForHints(hintsUsed);
    const wasCompleted = current.status === 'completed';

    next.status = 'completed';
    next.stars = Math.max(current.stars, stars);
    next.hintsUsed = wasCompleted
      ? Math.min(current.hintsUsed, hintsUsed)
      : hintsUsed;
    next.bestTimeMs =
      current.bestTimeMs === null
        ? durationMs
        : Math.min(current.bestTimeMs, durationMs);
    next.firstCompletedAt = current.firstCompletedAt ?? now;
  }

  levels[levelId] = next;

  if (result.success && level.nextLevelId !== null) {
    const nextLevel = levels[level.nextLevelId];

    if (nextLevel !== undefined && nextLevel.status === 'locked') {
      levels[level.nextLevelId] = { ...nextLevel, status: 'unlocked' };
    }
  }

  const vocabulary = [...progress.vocabulary];

  if (result.success) {
    for (const wordId of level.vocabularyIds) {
      if (!vocabulary.includes(wordId)) {
        vocabulary.push(wordId);
      }
    }
  }

  return { levels, vocabulary };
}
