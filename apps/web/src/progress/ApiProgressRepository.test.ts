import { beforeEach, describe, expect, it } from 'vitest';

import {
  ApiProgressRepository,
  ProgressApiError,
} from './ApiProgressRepository';

const USER_ID = 'student-1';
const BASE = '/api';

interface FakeCall {
  url: string;
  init: RequestInit | undefined;
}

function queueKeys(): string[] {
  const keys: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key !== null && key.includes('api-queue')) {
      keys.push(key);
    }
  }

  return keys;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function levelDto(
  levelId: string,
  status: 'locked' | 'unlocked' | 'completed',
  overrides: Record<string, unknown> = {},
) {
  return {
    levelId,
    status,
    stars: 0,
    attempts: 0,
    hintsUsed: 0,
    bestTimeMs: null,
    firstCompletedAt: null,
    lastPlayedAt: null,
    ...overrides,
  };
}

function repository(fetchImpl: typeof fetch): ApiProgressRepository {
  return new ApiProgressRepository({
    userId: USER_ID,
    baseUrl: BASE,
    fetchImpl,
    now: () => 5000,
  });
}

describe('ApiProgressRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears this account cache and queue on logout', () => {
    const repo = repository(
      (async () => jsonResponse({})) as typeof fetch,
    );
    window.localStorage.setItem(
      `circuits-de-zap:api-progress:v1:${USER_ID}`,
      '{"version":1}',
    );
    window.localStorage.setItem(
      `circuits-de-zap:api-queue:v1:${USER_ID}`,
      '[]',
    );
    window.localStorage.setItem(
      'circuits-de-zap:api-progress:v1:other-student',
      '{"version":1}',
    );

    repo.clearUserCache();

    expect(
      window.localStorage.getItem(
        `circuits-de-zap:api-progress:v1:${USER_ID}`,
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        `circuits-de-zap:api-queue:v1:${USER_ID}`,
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        'circuits-de-zap:api-progress:v1:other-student',
      ),
    ).not.toBeNull();
  });

  it('loads the server progress and caches it', async () => {
    const calls: FakeCall[] = [];
    const repo = repository(
      (async (input, init) => {
        calls.push({ url: String(input), init });
        return jsonResponse({
          levels: [
            levelDto('light-01', 'completed', {
              stars: 3,
              attempts: 2,
              hintsUsed: 0,
              bestTimeMs: 4000,
              firstCompletedAt: 1000,
              lastPlayedAt: 2000,
            }),
            levelDto('light-02', 'unlocked'),
          ],
          vocabulary: ['circuitFerme', 'fil'],
        });
      }) as typeof fetch,
    );

    const progress = await repo.getProgress();

    expect(progress.levels['light-01']).toMatchObject({
      status: 'completed',
      stars: 3,
    });
    expect(progress.levels['light-02']?.status).toBe('unlocked');
    expect(progress.vocabulary).toContain('circuitFerme');
    expect(calls[0]?.url).toBe('/api/me/progress');
    expect(calls[0]?.init?.credentials).toBe('same-origin');
  });

  it('starts and finishes an attempt online', async () => {
    const calls: FakeCall[] = [];
    const repo = repository(
      (async (input, init) => {
        const url = String(input);
        calls.push({ url, init });

        if (url.endsWith('/me/attempts/start')) {
          const body = JSON.parse(String(init?.body)) as {
            attemptId: string;
            levelId: string;
          };
          return jsonResponse({
            attemptId: body.attemptId,
            levelId: body.levelId,
            startedAt: 100,
          });
        }

        return jsonResponse({
          progress: {
            levels: [levelDto('light-01', 'completed', { stars: 3, attempts: 1 })],
            vocabulary: ['circuitFerme'],
          },
        });
      }) as typeof fetch,
    );

    const attempt = await repo.startAttempt('light-01');
    expect(attempt.id).toMatch(/^attempt-/);
    expect(attempt.startedAt).toBe(100);

    const progress = await repo.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 5000,
      errorsDetected: [],
    });

    expect(progress.levels['light-01']?.status).toBe('completed');
    expect(calls.map((call) => call.url)).toEqual([
      '/api/me/attempts/start',
      `/api/me/attempts/${attempt.id}/finish`,
    ]);
  });

  it('queues start and finish offline, then replays them in order', async () => {
    let online = false;
    const calls: FakeCall[] = [];
    const fetchImpl = (async (input, init) => {
      const url = String(input);

      if (!online) {
        throw new TypeError('offline');
      }

      calls.push({ url, init });

      if (url.endsWith('/me/attempts/start')) {
        const body = JSON.parse(String(init?.body)) as {
          attemptId: string;
          levelId: string;
        };
        return jsonResponse({
          attemptId: body.attemptId,
          levelId: body.levelId,
          startedAt: 100,
        });
      }

      return jsonResponse({
        progress: {
          levels: [levelDto('light-01', 'completed', { stars: 3, attempts: 1 })],
          vocabulary: ['circuitFerme', 'fil'],
        },
      });
    }) as typeof fetch;
    const repo = repository(fetchImpl);

    const attempt = await repo.startAttempt('light-01');
    const optimistic = await repo.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 5000,
      errorsDetected: [],
    });

    expect(optimistic.levels['light-01']?.status).toBe('completed');
    expect(optimistic.levels['light-02']?.status).toBe('unlocked');
    expect(optimistic.vocabulary).toContain('circuitFerme');

    online = true;
    await repo.flushQueue();

    expect(calls.map((call) => call.url)).toEqual([
      '/api/me/attempts/start',
      `/api/me/attempts/${attempt.id}/finish`,
    ]);
    expect(queueKeys()).toEqual([]);
  });

  it('queues a sandbox save and lists the cached circuit offline', async () => {
    let online = false;
    const repo = repository(
      (async () => {
        if (!online) {
          throw new TypeError('offline');
        }

        return jsonResponse({
          circuit: {
            id: 'sandbox-1',
            name: 'Mon circuit',
            data: { version: 1, components: [], wires: [] },
            thumbnail: null,
            updatedAt: 6000,
          },
        });
      }) as typeof fetch,
    );

    const saved = await repo.saveSandbox({
      id: 'sandbox-1',
      name: 'Mon circuit',
      data: { version: 1, components: [], wires: [] },
    });
    expect(saved.id).toBe('sandbox-1');
    expect(saved.updatedAt).toBe(5000);

    const list = await repo.listSandbox();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Mon circuit');

    online = true;
    await repo.flushQueue();
    expect(queueKeys()).toEqual([]);
  });

  it('does not queue a refused attempt', async () => {
    const repo = repository(
      (async () =>
        jsonResponse(
          { error: { code: 'level_locked', message: 'Verrouillé.' } },
          403,
        )) as typeof fetch,
    );

    await expect(repo.startAttempt('light-02')).rejects.toBeInstanceOf(
      ProgressApiError,
    );
    expect(queueKeys()).toEqual([]);
  });

  it('falls back to the cached progress when the network disappears', async () => {
    let online = true;
    const repo = repository(
      (async () => {
        if (!online) {
          throw new TypeError('offline');
        }

        return jsonResponse({
          levels: [levelDto('light-01', 'unlocked')],
          vocabulary: [],
        });
      }) as typeof fetch,
    );

    await repo.getProgress();
    online = false;
    const progress = await repo.getProgress();

    expect(progress.levels['light-01']?.status).toBe('unlocked');
  });

  it('keeps a 5xx start in the queue and retries it', async () => {
    let attempt = 0;
    const calls: string[] = [];
    const repo = repository(
      (async (input, init) => {
        const url = String(input);
        calls.push(url);

        if (attempt === 0) {
          attempt += 1;
          return jsonResponse({ error: { code: 'down', message: 'down' } }, 503);
        }

        const body = JSON.parse(String(init?.body)) as {
          attemptId: string;
          levelId: string;
        };
        return jsonResponse({
          attemptId: body.attemptId,
          levelId: body.levelId,
          startedAt: 100,
        });
      }) as typeof fetch,
    );

    const started = await repo.startAttempt('light-01');
    expect(started.id).toMatch(/^attempt-/);

    await repo.flushQueue();
    expect(calls).toHaveLength(2);
  });
});
