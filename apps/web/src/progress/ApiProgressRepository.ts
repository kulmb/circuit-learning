import {
  applyAttemptToProgress,
  attemptStartedResponseSchema,
  deserializeCircuit,
  finishAttemptResponseSchema,
  initialPlayerProgress,
  playerProgressResponseSchema,
  reconcileProgress,
  sandboxListResponseSchema,
  sandboxResponseSchema,
  serializeCircuit,
  type AttemptResult,
  type AttemptStart,
  type CircuitDocument,
  type PlayerProgress,
  type PlayerProgressResponse,
  type ProgressRepository,
  type SandboxCircuit,
  type SandboxCircuitDto,
  type SandboxCircuitInput,
} from '@circuits/shared';

import { API_BASE_URL } from '../config';

export const PROGRESS_SYNCED_EVENT = 'circuits:progress-synced';

const CACHE_PREFIX = 'circuits-de-zap:api-progress:v1';
const QUEUE_PREFIX = 'circuits-de-zap:api-queue:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface ResponseSchema<T> {
  parse(value: unknown): T;
}

export class ProgressApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ProgressApiError';
    this.status = status;
    this.code = code;
  }
}

export class ProgressNetworkError extends Error {
  constructor() {
    super('The progress API is unreachable.');
    this.name = 'ProgressNetworkError';
  }
}

interface QueuedStart {
  kind: 'start';
  attemptId: string;
  levelId: string;
  startedAt: number;
}

interface QueuedFinish {
  kind: 'finish';
  attemptId: string;
  levelId: string;
  result: AttemptResult;
  finishedAt: number;
}

interface QueuedSandbox {
  kind: 'sandbox';
  id: string;
  name: string;
  data: CircuitDocument;
  thumbnail?: string;
  queuedAt: number;
}

type QueuedOperation = QueuedStart | QueuedFinish | QueuedSandbox;

interface CachedProgress {
  version: 1;
  progress: PlayerProgress;
}

interface CachedSandbox {
  version: 1;
  circuits: SandboxCircuit[];
}

export interface ApiProgressRepositoryOptions {
  userId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: StorageLike;
  now?: () => number;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class ApiProgressRepository implements ProgressRepository {
  private readonly userId: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly storage: StorageLike | null;
  private readonly now: () => number;
  private flushPromise: Promise<void> | null = null;

  constructor(options: ApiProgressRepositoryOptions) {
    this.userId = options.userId;
    this.baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl =
      options.fetchImpl ??
      ((input, init) => {
        if (typeof fetch !== 'function') {
          return Promise.reject(new ProgressNetworkError());
        }

        return fetch(input, init);
      });
    this.storage = options.storage ?? defaultStorage();
    this.now = options.now ?? Date.now;
  }

  async getProgress(): Promise<PlayerProgress> {
    if (this.readQueue().length > 0) {
      void this.flushQueue();
      const cached = this.readCachedProgress();

      if (cached !== null) {
        return cached;
      }
    }

    try {
      const response = await this.request(
        '/me/progress',
        { method: 'GET' },
        playerProgressResponseSchema,
      );
      const progress = toPlayerProgress(response);
      this.writeCachedProgress(progress);

      return progress;
    } catch {
      return this.readCachedProgress() ?? initialPlayerProgress();
    }
  }

  async startAttempt(
    levelId: string,
    attemptId = createId('attempt'),
  ): Promise<AttemptStart> {
    try {
      const response = await this.request(
        '/me/attempts/start',
        {
          method: 'POST',
          body: JSON.stringify({ levelId, attemptId }),
        },
        attemptStartedResponseSchema,
      );

      return {
        id: response.attemptId,
        levelId: response.levelId,
        startedAt: response.startedAt,
      };
    } catch (error) {
      if (!isQueueable(error)) {
        throw error;
      }

      const startedAt = this.now();
      this.enqueue({ kind: 'start', attemptId, levelId, startedAt });

      return { id: attemptId, levelId, startedAt };
    }
  }

  async finishAttempt(
    attempt: AttemptStart,
    result: AttemptResult,
  ): Promise<PlayerProgress> {
    if (this.hasQueuedStart(attempt.id)) {
      this.enqueue({
        kind: 'finish',
        attemptId: attempt.id,
        levelId: attempt.levelId,
        result,
        finishedAt: this.now(),
      });

      const progress = this.optimisticFinish(attempt.levelId, result);
      void this.flushQueue();

      return progress;
    }

    try {
      const response = await this.request(
        `/me/attempts/${encodeURIComponent(attempt.id)}/finish`,
        {
          method: 'POST',
          body: JSON.stringify(result),
        },
        finishAttemptResponseSchema,
      );
      const progress = toPlayerProgress(response.progress);
      this.writeCachedProgress(progress);
      void this.flushQueue();

      return progress;
    } catch (error) {
      if (!isQueueable(error)) {
        throw error;
      }

      this.enqueue({
        kind: 'finish',
        attemptId: attempt.id,
        levelId: attempt.levelId,
        result,
        finishedAt: this.now(),
      });

      return this.optimisticFinish(attempt.levelId, result);
    }
  }

  async saveSandbox(input: SandboxCircuitInput): Promise<SandboxCircuit> {
    const id = input.id ?? createId('sandbox');
    const body: Record<string, unknown> = {
      name: input.name,
      data: input.data,
    };

    if (input.thumbnail !== undefined) {
      body['thumbnail'] = input.thumbnail;
    }

    try {
      const response = await this.request(
        `/me/sandbox/${encodeURIComponent(id)}`,
        { method: 'PUT', body: JSON.stringify(body) },
        sandboxResponseSchema,
      );
      const circuit = toSandboxCircuit(response.circuit);
      this.upsertCachedSandbox(circuit);

      return circuit;
    } catch (error) {
      if (!isQueueable(error)) {
        throw error;
      }

      this.enqueue({
        kind: 'sandbox',
        id,
        name: input.name,
        data: cloneDocument(input.data),
        ...(input.thumbnail === undefined
          ? {}
          : { thumbnail: input.thumbnail }),
        queuedAt: this.now(),
      });
      const circuit: SandboxCircuit = {
        id,
        name: input.name,
        data: cloneDocument(input.data),
        updatedAt: this.now(),
        ...(input.thumbnail === undefined
          ? {}
          : { thumbnail: input.thumbnail }),
      };
      this.upsertCachedSandbox(circuit);

      return circuit;
    }
  }

  async listSandbox(): Promise<SandboxCircuit[]> {
    try {
      const response = await this.request(
        '/me/sandbox',
        { method: 'GET' },
        sandboxListResponseSchema,
      );
      const circuits = response.circuits.map(toSandboxCircuit);
      this.writeCachedSandbox(circuits);

      return circuits;
    } catch {
      return this.readCachedSandbox();
    }
  }

  /**
   * Replays queued operations in order. Starts and finishes use client ids,
   * so a lost response is replayed without counting the attempt twice.
   */
  async flushQueue(): Promise<void> {
    if (this.flushPromise !== null) {
      // A caller arriving during a failed flush deserves a fresh attempt.
      return this.flushPromise.then(() => this.flushQueue());
    }

    this.flushPromise = this.runQueue().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  startSync(): () => void {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleOnline = (): void => {
      void this.flushQueue();
    };
    window.addEventListener('online', handleOnline);
    void this.flushQueue();

    return () => window.removeEventListener('online', handleOnline);
  }

  private async runQueue(): Promise<void> {
    const queue = this.readQueue();

    if (queue.length === 0) {
      return;
    }

    let synchronized = false;
    let remaining: QueuedOperation[] | null = null;

    for (let index = 0; index < queue.length; index += 1) {
      const operation = queue[index];

      if (operation === undefined) {
        continue;
      }

      try {
        await this.runOperation(operation);
        synchronized = true;
      } catch (error) {
        if (isDiscardable(error)) {
          continue;
        }

        remaining = queue.slice(index);
        break;
      }
    }

    this.writeQueue(remaining ?? []);
    this.dispatchSynced(synchronized);
  }

  private async runOperation(operation: QueuedOperation): Promise<void> {
    if (operation.kind === 'start') {
      await this.request(
        '/me/attempts/start',
        {
          method: 'POST',
          body: JSON.stringify({
            levelId: operation.levelId,
            attemptId: operation.attemptId,
          }),
        },
        attemptStartedResponseSchema,
      );
      return;
    }

    if (operation.kind === 'finish') {
      const response = await this.request(
        `/me/attempts/${encodeURIComponent(operation.attemptId)}/finish`,
        {
          method: 'POST',
          body: JSON.stringify(operation.result),
        },
        finishAttemptResponseSchema,
      );
      this.writeCachedProgress(toPlayerProgress(response.progress));
      return;
    }

    const body: Record<string, unknown> = {
      name: operation.name,
      data: operation.data,
    };

    if (operation.thumbnail !== undefined) {
      body['thumbnail'] = operation.thumbnail;
    }

    const response = await this.request(
      `/me/sandbox/${encodeURIComponent(operation.id)}`,
      { method: 'PUT', body: JSON.stringify(body) },
      sandboxResponseSchema,
    );
    this.upsertCachedSandbox(toSandboxCircuit(response.circuit));
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    schema: ResponseSchema<T>,
  ): Promise<T> {
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...init,
      });
    } catch {
      throw new ProgressNetworkError();
    } finally {
      clearTimeout(timeout);
    }

    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const error = readErrorBody(body);
      throw new ProgressApiError(
        response.status,
        error.code,
        error.message,
      );
    }

    return schema.parse(body);
  }

  private optimisticFinish(
    levelId: string,
    result: AttemptResult,
  ): PlayerProgress {
    const progress = applyAttemptToProgress(
      this.readCachedProgress() ?? initialPlayerProgress(),
      levelId,
      result,
      this.now(),
    );
    this.writeCachedProgress(progress);

    return progress;
  }

  private queueKey(): string {
    return `${QUEUE_PREFIX}:${this.userId}`;
  }

  private cacheKey(): string {
    return `${CACHE_PREFIX}:${this.userId}`;
  }

  private enqueue(operation: QueuedOperation): void {
    const queue = this.readQueue();
    queue.push(operation);
    this.writeQueue(queue);
  }

  private hasQueuedStart(attemptId: string): boolean {
    return this.readQueue().some(
      (operation) =>
        operation.kind === 'start' && operation.attemptId === attemptId,
    );
  }

  private readQueue(): QueuedOperation[] {
    if (this.storage === null) {
      return [];
    }

    try {
      const raw = this.storage.getItem(this.queueKey());

      if (raw === null) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isQueuedOperation);
    } catch {
      return [];
    }
  }

  private writeQueue(queue: readonly QueuedOperation[]): void {
    if (this.storage === null) {
      return;
    }

    try {
      if (queue.length === 0) {
        this.storage.removeItem(this.queueKey());
      } else {
        this.storage.setItem(this.queueKey(), JSON.stringify(queue));
      }
    } catch {
      // A full quota must not block the game; the in-memory copy is lost.
    }
  }

  private readCachedProgress(): PlayerProgress | null {
    const cached = this.readJson<CachedProgress>(this.cacheKey());

    if (cached === null || cached.version !== 1) {
      return null;
    }

    return normalizeProgress(cached.progress);
  }

  private writeCachedProgress(progress: PlayerProgress): void {
    this.writeJson<CachedProgress>(this.cacheKey(), {
      version: 1,
      progress,
    });
  }

  private readCachedSandbox(): SandboxCircuit[] {
    const cached = this.readJson<CachedSandbox>(
      `${this.cacheKey()}:sandbox`,
    );

    if (cached === null || cached.version !== 1) {
      return [];
    }

    return cached.circuits;
  }

  private writeCachedSandbox(circuits: readonly SandboxCircuit[]): void {
    this.writeJson<CachedSandbox>(`${this.cacheKey()}:sandbox`, {
      version: 1,
      circuits: [...circuits],
    });
  }

  private upsertCachedSandbox(circuit: SandboxCircuit): void {
    const circuits = this.readCachedSandbox();
    const index = circuits.findIndex((entry) => entry.id === circuit.id);

    if (index >= 0) {
      circuits[index] = circuit;
    } else {
      circuits.push(circuit);
    }

    this.writeCachedSandbox(circuits);
  }

  private readJson<T>(key: string): T | null {
    if (this.storage === null) {
      return null;
    }

    try {
      const raw = this.storage.getItem(key);

      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    if (this.storage === null) {
      return;
    }

    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore a full or unavailable storage.
    }
  }

  private dispatchSynced(synchronized: boolean): void {
    if (!synchronized || typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(PROGRESS_SYNCED_EVENT));
  }
}

function isQueueable(error: unknown): boolean {
  return (
    error instanceof ProgressNetworkError ||
    (error instanceof ProgressApiError &&
      (error.status >= 500 || error.status === 408 || error.status === 429))
  );
}

function isDiscardable(error: unknown): boolean {
  return (
    error instanceof ProgressApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

function readErrorBody(body: unknown): { code: string; message: string } {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'object' &&
    (body as { error?: unknown }).error !== null
  ) {
    const error = (body as { error: { code?: unknown; message?: unknown } })
      .error;

    return {
      code: typeof error.code === 'string' ? error.code : 'api_error',
      message:
        typeof error.message === 'string'
          ? error.message
          : 'La sauvegarde a échoué.',
    };
  }

  return { code: 'api_error', message: 'La sauvegarde a échoué.' };
}

function isQueuedOperation(value: unknown): value is QueuedOperation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record['kind'] === 'start') {
    return (
      typeof record['attemptId'] === 'string' &&
      typeof record['levelId'] === 'string' &&
      typeof record['startedAt'] === 'number'
    );
  }

  if (record['kind'] === 'finish') {
    return (
      typeof record['attemptId'] === 'string' &&
      typeof record['levelId'] === 'string' &&
      typeof record['finishedAt'] === 'number' &&
      isAttemptResult(record['result'])
    );
  }

  if (record['kind'] === 'sandbox') {
    return (
      typeof record['id'] === 'string' &&
      typeof record['name'] === 'string' &&
      typeof record['data'] === 'object' &&
      record['data'] !== null &&
      typeof record['queuedAt'] === 'number' &&
      (record['thumbnail'] === undefined ||
        typeof record['thumbnail'] === 'string')
    );
  }

  return false;
}

function isAttemptResult(value: unknown): value is AttemptResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['success'] === 'boolean' &&
    typeof record['hintsUsed'] === 'number' &&
    typeof record['durationMs'] === 'number' &&
    Array.isArray(record['errorsDetected']) &&
    record['errorsDetected'].every((code) => typeof code === 'string')
  );
}

function toPlayerProgress(response: PlayerProgressResponse): PlayerProgress {
  const progress = initialPlayerProgress();

  for (const entry of response.levels) {
    if (progress.levels[entry.levelId] !== undefined) {
      progress.levels[entry.levelId] = { ...entry };
    }
  }

  progress.vocabulary = [...new Set(response.vocabulary)];

  return reconcileProgress(progress);
}

function normalizeProgress(progress: PlayerProgress): PlayerProgress {
  const base = initialPlayerProgress();

  for (const [levelId, entry] of Object.entries(progress.levels ?? {})) {
    if (
      base.levels[levelId] !== undefined &&
      entry !== null &&
      typeof entry === 'object'
    ) {
      base.levels[levelId] = { ...entry, levelId };
    }
  }

  base.vocabulary = Array.isArray(progress.vocabulary)
    ? progress.vocabulary.filter((id): id is string => typeof id === 'string')
    : [];

  return reconcileProgress(base);
}

function toSandboxCircuit(dto: SandboxCircuitDto): SandboxCircuit {
  const circuit: SandboxCircuit = {
    id: dto.id,
    name: dto.name,
    data: serializeCircuit(deserializeCircuit(dto.data)),
    updatedAt: dto.updatedAt,
  };

  if (dto.thumbnail !== null) {
    circuit.thumbnail = dto.thumbnail;
  }

  return circuit;
}

function cloneDocument(data: CircuitDocument): CircuitDocument {
  return JSON.parse(JSON.stringify(data)) as CircuitDocument;
}
