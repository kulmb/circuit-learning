import type { PlayerProgress } from '@circuits/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiProgressRepository } from './ApiProgressRepository';
import { LocalProgressRepository } from './LocalProgressRepository';
import { mergeGuestProgressIntoApi } from './mergeGuestProgress';

function fakeRepository() {
  return {
    startAttempt: vi.fn(async (levelId: string, attemptId: string) => ({
      id: attemptId,
      levelId,
      startedAt: 0,
    })),
    finishAttempt: vi.fn(
      async (): Promise<PlayerProgress> => ({
        levels: {},
        vocabulary: [],
      }),
    ),
    saveSandbox: vi.fn(async (input: { id?: string; name: string }) => ({
      id: input.id ?? 'sandbox',
      name: input.name,
      data: { version: 1 as const, components: [], wires: [] },
      updatedAt: 0,
    })),
  } as unknown as ApiProgressRepository;
}

describe('mergeGuestProgressIntoApi', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('replays attempts in order and copies sandbox circuits', async () => {
    const local = new LocalProgressRepository();
    const failed = await local.startAttempt('light-01');
    await local.finishAttempt(failed, {
      success: false,
      hintsUsed: 0,
      durationMs: 2000,
      errorsDetected: ['open_circuit'],
    });
    const success = await local.startAttempt('light-01');
    await local.finishAttempt(success, {
      success: true,
      hintsUsed: 0,
      durationMs: 3000,
      errorsDetected: [],
    });
    const sandbox = await local.saveSandbox({
      name: 'Mon circuit',
      data: { version: 1, components: [], wires: [] },
    });

    const repository = fakeRepository();
    await mergeGuestProgressIntoApi(repository, local);

    expect(repository.startAttempt).toHaveBeenNthCalledWith(
      1,
      'light-01',
      failed.id,
    );
    expect(repository.startAttempt).toHaveBeenNthCalledWith(
      2,
      'light-01',
      success.id,
    );
    expect(repository.finishAttempt).toHaveBeenCalledTimes(2);
    expect(repository.saveSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sandbox.id,
        name: 'Mon circuit',
      }),
    );
  });
});
