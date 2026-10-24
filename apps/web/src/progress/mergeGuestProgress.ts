import {
  CHAPTER_1_LEVEL_METADATA,
  type AttemptResult,
  type LevelProgress,
} from '@circuits/shared';

import type { ApiProgressRepository } from './ApiProgressRepository';
import {
  localProgressRepository,
  type LocalProgressRepository,
  type StoredAttempt,
} from './LocalProgressRepository';

const VALID_ATTEMPT_ID = /^[A-Za-z0-9._-]{8,80}$/;

function hintsForStars(progress: LevelProgress): number {
  if (progress.stars >= 3) {
    return 0;
  }

  if (progress.stars === 2) {
    return 1;
  }

  return 3;
}

function attemptIdFor(attempt: StoredAttempt, index: number): string {
  return VALID_ATTEMPT_ID.test(attempt.id)
    ? attempt.id
    : `merge-attempt-${index}`;
}

/**
 * Rebuilds the guest path level by level, in chapter order: earlier levels
 * must be completed before a later one can start. Client ids are
 * deterministic, so an interrupted merge can be run again without counting an
 * attempt twice.
 */
export async function mergeGuestProgressIntoApi(
  repository: ApiProgressRepository,
  source: LocalProgressRepository = localProgressRepository,
): Promise<void> {
  const [progress, sandbox] = await Promise.all([
    source.getProgress(),
    source.listSandbox(),
  ]);
  const attempts = source.getAttemptHistory();
  let syntheticIndex = 0;

  for (const level of CHAPTER_1_LEVEL_METADATA) {
    const levelAttempts = attempts
      .filter((attempt) => attempt.levelId === level.id)
      .sort((left, right) => left.endedAt - right.endedAt);
    let hasSuccess = false;

    for (const attempt of levelAttempts) {
      const attemptId = attemptIdFor(attempt, syntheticIndex);
      syntheticIndex += 1;
      const started = await repository.startAttempt(level.id, attemptId);
      const result: AttemptResult = {
        success: attempt.success,
        hintsUsed: attempt.hintsUsed,
        durationMs: attempt.durationMs,
        errorsDetected: attempt.errorsDetected,
      };

      await repository.finishAttempt(started, result);

      if (attempt.success) {
        hasSuccess = true;
      }
    }

    const entry = progress.levels[level.id];

    if (entry?.status === 'completed' && !hasSuccess) {
      const started = await repository.startAttempt(
        level.id,
        `merge-${level.id}`,
      );
      await repository.finishAttempt(started, {
        success: true,
        hintsUsed: hintsForStars(entry),
        durationMs: entry.bestTimeMs ?? 0,
        errorsDetected: [],
      });
    }
  }

  for (const circuit of sandbox) {
    await repository.saveSandbox({
      id: circuit.id,
      name: circuit.name,
      data: circuit.data,
      ...(circuit.thumbnail === undefined
        ? {}
        : { thumbnail: circuit.thumbnail }),
    });
  }
}
