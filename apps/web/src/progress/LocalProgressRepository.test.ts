import { serializeCircuit } from '@circuits/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalProgressRepository } from './LocalProgressRepository';

const STORAGE_KEY = 'circuits-de-zap:progress:v1';

describe('LocalProgressRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with only the first level unlocked', async () => {
    const repository = new LocalProgressRepository();
    const progress = await repository.getProgress();

    expect(progress.levels['light-01']?.status).toBe('unlocked');
    expect(progress.levels['light-02']?.status).toBe('locked');
    expect(progress.levels['light-10']?.status).toBe('locked');
    expect(progress.levels['current-01']?.status).toBe('locked');
  });

  it('unlocks chapter 2 for a player who already finished chapter 1', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        levels: {
          'light-10': {
            levelId: 'light-10',
            status: 'completed',
            stars: 3,
            attempts: 1,
            hintsUsed: 0,
            bestTimeMs: 1000,
            firstCompletedAt: 1000,
            lastPlayedAt: 1000,
          },
        },
        attempts: [],
        vocabulary: ['circuitFerme'],
        sandbox: [],
      }),
    );

    const repository = new LocalProgressRepository();
    const progress = await repository.getProgress();

    expect(progress.levels['light-10']?.status).toBe('completed');
    expect(progress.levels['current-01']?.status).toBe('unlocked');
    expect(progress.levels['current-02']?.status).toBe('locked');
  });

  it('completes a level, awards stars, unlocks the next and stores vocabulary', async () => {
    const repository = new LocalProgressRepository();
    const attempt = await repository.startAttempt('light-01');
    const progress = await repository.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 12000,
      errorsDetected: ['open_circuit', 'open_circuit'],
    });

    expect(progress.levels['light-01']?.status).toBe('completed');
    expect(progress.levels['light-01']?.stars).toBe(3);
    expect(progress.levels['light-01']?.attempts).toBe(1);
    expect(progress.levels['light-01']?.bestTimeMs).toBe(12000);
    expect(progress.levels['light-02']?.status).toBe('unlocked');
    expect(progress.vocabulary).toEqual(
      expect.arrayContaining(['circuitFerme', 'fil']),
    );

    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    ) as {
      attempts?: Array<{
        success: boolean;
        durationMs: number;
        hintsUsed: number;
        errorsDetected: string[];
      }>;
    };
    expect(stored.attempts?.[0]).toMatchObject({
      success: true,
      durationMs: 12000,
      hintsUsed: 0,
      errorsDetected: ['open_circuit'],
    });
  });

  it('gives two stars for one or two hints and one star beyond', async () => {
    const repository = new LocalProgressRepository();
    const level1 = await repository.startAttempt('light-01');
    await repository.finishAttempt(level1, {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });

    const level2 = await repository.startAttempt('light-02');
    const afterLevel2 = await repository.finishAttempt(level2, {
      success: true,
      hintsUsed: 2,
      durationMs: 2000,
      errorsDetected: [],
    });
    expect(afterLevel2.levels['light-02']?.stars).toBe(2);

    const level3 = await repository.startAttempt('light-03');
    const afterLevel3 = await repository.finishAttempt(level3, {
      success: true,
      hintsUsed: 4,
      durationMs: 3000,
      errorsDetected: ['open_circuit'],
    });
    expect(afterLevel3.levels['light-03']?.stars).toBe(1);
  });

  it('records failed attempts without unlocking or awarding stars', async () => {
    const repository = new LocalProgressRepository();
    const attempt = await repository.startAttempt('light-01');
    const progress = await repository.finishAttempt(attempt, {
      success: false,
      hintsUsed: 2,
      durationMs: 5000,
      errorsDetected: ['open_circuit'],
    });

    expect(progress.levels['light-01']?.status).toBe('unlocked');
    expect(progress.levels['light-01']?.stars).toBe(0);
    expect(progress.levels['light-01']?.attempts).toBe(1);
    expect(progress.levels['light-02']?.status).toBe('locked');
  });

  it('persists progress across repository instances', async () => {
    const first = new LocalProgressRepository();
    const attempt = await first.startAttempt('light-01');
    await first.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });

    const second = new LocalProgressRepository();
    const progress = await second.getProgress();

    expect(progress.levels['light-01']?.status).toBe('completed');
    expect(progress.levels['light-02']?.status).toBe('unlocked');
  });

  it('saves, updates and lists sandbox circuits', async () => {
    const repository = new LocalProgressRepository();
    const saved = await repository.saveSandbox({
      name: 'Mon circuit',
      data: { version: 1, components: [], wires: [] },
    });

    expect((await repository.listSandbox())).toHaveLength(1);

    const updated = await repository.saveSandbox({
      id: saved.id,
      name: 'Mon circuit modifié',
      data: { version: 1, components: [], wires: [] },
    });

    const list = await repository.listSandbox();
    expect(list).toHaveLength(1);
    expect(updated.name).toBe('Mon circuit modifié');
    expect(list[0]?.id).toBe(saved.id);
  });

  it('exposes, fingerprints and clears guest data', async () => {
    const repository = new LocalProgressRepository();
    expect(repository.hasGuestProgress()).toBe(false);
    expect(repository.guestFingerprint()).toBe('0:0:0');

    const attempt = await repository.startAttempt('light-01');
    await repository.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: ['open_circuit'],
    });

    expect(repository.hasGuestProgress()).toBe(true);
    expect(repository.guestFingerprint()).toBe('1:1:0');
    expect(repository.getAttemptHistory()[0]).toMatchObject({
      id: attempt.id,
      levelId: 'light-01',
      success: true,
      errorsDetected: ['open_circuit'],
    });

    repository.clearGuestData();
    expect(repository.hasGuestProgress()).toBe(false);
    expect((await repository.getProgress()).levels['light-01']?.status).toBe(
      'unlocked',
    );
  });

  it('resets local progress while keeping sandbox creations', async () => {
    const repository = new LocalProgressRepository();
    const attempt = await repository.startAttempt('light-01');
    await repository.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });
    await repository.saveSandbox({
      id: 'work-1',
      name: 'Mon circuit 1',
      data: serializeCircuit({ components: [], wires: [] }),
    });

    repository.resetLocalProgress();

    const progress = await repository.getProgress();
    expect(progress.levels['light-01']?.status).toBe('unlocked');
    expect(progress.levels['light-01']?.stars).toBe(0);
    expect(progress.levels['light-02']?.status).toBe('locked');
    expect(progress.vocabulary).toEqual([]);
    expect(await repository.listSandbox()).toHaveLength(1);

    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    ) as { attempts?: unknown[] };
    expect(stored.attempts).toEqual([]);
  });
});
