import { describe, expect, it } from 'vitest';

import {
  applyAttemptToProgress,
  initialPlayerProgress,
  reconcileProgress,
} from './applyAttempt';

describe('applyAttemptToProgress', () => {
  it('starts with only the first level unlocked', () => {
    const progress = initialPlayerProgress();

    expect(progress.levels['light-01']?.status).toBe('unlocked');
    expect(progress.levels['light-02']?.status).toBe('locked');
    expect(progress.levels['current-01']?.status).toBe('locked');
    expect(progress.vocabulary).toEqual([]);
  });

  it('unlocks chapter 2 after the last chapter 1 level', () => {
    const progress = applyAttemptToProgress(
      initialPlayerProgress(),
      'light-10',
      {
        success: true,
        hintsUsed: 0,
        durationMs: 5000,
        errorsDetected: [],
      },
      1000,
    );

    expect(progress.levels['current-01']?.status).toBe('unlocked');
  });

  it('reconciles progress saved before chapter 2 existed', () => {
    const initial = initialPlayerProgress();
    const oldProgress = {
      levels: {
        ...initial.levels,
        'light-10': {
          ...initial.levels['light-10']!,
          status: 'completed' as const,
        },
      },
      vocabulary: ['circuitFerme'],
    };
    const progress = reconcileProgress(oldProgress);

    expect(progress.levels['current-01']?.status).toBe('unlocked');
    expect(progress.levels['current-02']?.status).toBe('locked');
    expect(progress.vocabulary).toEqual(['circuitFerme']);
  });

  it('reconciles progress saved before the power and assembly levels existed', () => {
    const initial = initialPlayerProgress();
    const oldLevels = { ...initial.levels };

    for (const levelId of [
      'current-07',
      'assembly-01',
      'assembly-02',
      'assembly-03',
      'assembly-04',
      'defi-01',
      'defi-02',
      'defi-03',
      'defi-04',
    ]) {
      delete oldLevels[levelId];
    }

    oldLevels['current-06'] = {
      ...initial.levels['current-06']!,
      status: 'completed',
    };

    const progress = reconcileProgress({
      levels: oldLevels,
      vocabulary: [],
    });

    expect(progress.levels['current-07']?.status).toBe('unlocked');
    expect(progress.levels['assembly-01']?.status).toBe('locked');
    expect(progress.levels['defi-01']?.status).toBe('locked');
  });

  it('unlocks the assembly chapter after the power level', () => {
    const progress = applyAttemptToProgress(
      initialPlayerProgress(),
      'current-07',
      {
        success: true,
        hintsUsed: 0,
        durationMs: 5000,
        errorsDetected: [],
      },
      1000,
    );

    expect(progress.levels['assembly-01']?.status).toBe('unlocked');
  });

  it('unlocks the challenge chapter after the assembly chapter', () => {
    const progress = applyAttemptToProgress(
      initialPlayerProgress(),
      'assembly-04',
      {
        success: true,
        hintsUsed: 0,
        durationMs: 5000,
        errorsDetected: [],
      },
      1000,
    );

    expect(progress.levels['defi-01']?.status).toBe('unlocked');
  });

  it('completes a level, unlocks the next and adds vocabulary', () => {
    const progress = applyAttemptToProgress(
      initialPlayerProgress(),
      'light-01',
      {
        success: true,
        hintsUsed: 0,
        durationMs: 5000,
        errorsDetected: [],
      },
      1000,
    );

    expect(progress.levels['light-01']).toMatchObject({
      status: 'completed',
      stars: 3,
      attempts: 1,
      hintsUsed: 0,
      bestTimeMs: 5000,
      firstCompletedAt: 1000,
      lastPlayedAt: 1000,
    });
    expect(progress.levels['light-02']?.status).toBe('unlocked');
    expect(progress.vocabulary).toEqual(
      expect.arrayContaining(['circuitFerme', 'fil']),
    );
  });

  it('keeps the best stars, hints and time on a replay', () => {
    const first = applyAttemptToProgress(
      initialPlayerProgress(),
      'light-01',
      {
        success: true,
        hintsUsed: 0,
        durationMs: 5000,
        errorsDetected: [],
      },
      1000,
    );
    const replay = applyAttemptToProgress(
      first,
      'light-01',
      {
        success: true,
        hintsUsed: 3,
        durationMs: 3000,
        errorsDetected: [],
      },
      2000,
    );

    expect(replay.levels['light-01']).toMatchObject({
      stars: 3,
      attempts: 2,
      hintsUsed: 0,
      bestTimeMs: 3000,
      firstCompletedAt: 1000,
      lastPlayedAt: 2000,
    });
  });

  it('counts a failure without unlocking or adding vocabulary', () => {
    const progress = applyAttemptToProgress(
      initialPlayerProgress(),
      'light-01',
      {
        success: false,
        hintsUsed: 1,
        durationMs: 7000,
        errorsDetected: ['open_circuit'],
      },
      3000,
    );

    expect(progress.levels['light-01']).toMatchObject({
      status: 'unlocked',
      stars: 0,
      attempts: 1,
      hintsUsed: 0,
      lastPlayedAt: 3000,
    });
    expect(progress.levels['light-02']?.status).toBe('locked');
    expect(progress.vocabulary).toEqual([]);
  });

  it('ignores an unknown level', () => {
    const initial = initialPlayerProgress();
    const progress = applyAttemptToProgress(initial, 'unknown', {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });

    expect(progress).toBe(initial);
  });
});
