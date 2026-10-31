import {
  ALL_LEVEL_METADATA,
  getLevelMetadata,
  reconcileProgress,
  starsForHints,
  type AttemptResult,
  type AttemptStart,
  type CircuitDocument,
  type LevelProgress,
  type PlayerProgress,
  type ProgressRepository,
  type SandboxCircuit,
  type SandboxCircuitInput,
} from '@circuits/shared';

const STORAGE_KEY = 'circuits-de-zap:progress:v1';

export interface StoredAttempt {
  id: string;
  levelId: string;
  success: boolean;
  hintsUsed: number;
  durationMs: number;
  errorsDetected: string[];
  endedAt: number;
}

export interface GuestRecord {
  completedLevels: number;
  stars: number;
  attempts: number;
}

interface StoredState {
  version: 1;
  levels: Record<string, LevelProgress>;
  attempts: StoredAttempt[];
  vocabulary: string[];
  sandbox: SandboxCircuit[];
}

export class LocalProgressRepository implements ProgressRepository {
  private memoryFallback: StoredState | null = null;

  async getProgress(): Promise<PlayerProgress> {
    const state = this.readState();
    this.writeState(state);
    return toPlayerProgress(state);
  }

  async startAttempt(levelId: string): Promise<AttemptStart> {
    return {
      id: createId('attempt'),
      levelId,
      startedAt: Date.now(),
    };
  }

  async finishAttempt(
    attempt: AttemptStart,
    result: AttemptResult,
  ): Promise<PlayerProgress> {
    const state = this.readState();
    const now = Date.now();
    const level = getLevelMetadata(attempt.levelId);
    const hintsUsed = Math.max(0, Math.round(result.hintsUsed));
    const durationMs = Math.max(0, Math.round(result.durationMs));
    const errorsDetected = [...new Set(result.errorsDetected)].sort();

    const progress = state.levels[attempt.levelId] ?? createLevelProgress(attempt.levelId);
    progress.attempts += 1;
    progress.lastPlayedAt = now;

    if (result.success) {
      const stars = starsForHints(hintsUsed);
      const wasCompleted = progress.status === 'completed';

      progress.status = 'completed';
      progress.stars = Math.max(progress.stars, stars);
      progress.hintsUsed = wasCompleted
        ? Math.min(progress.hintsUsed, hintsUsed)
        : hintsUsed;
      progress.bestTimeMs =
        progress.bestTimeMs === null
          ? durationMs
          : Math.min(progress.bestTimeMs, durationMs);
      progress.firstCompletedAt ??= now;

      if (level !== undefined) {
        for (const vocabularyId of level.vocabularyIds) {
          if (!state.vocabulary.includes(vocabularyId)) {
            state.vocabulary.push(vocabularyId);
          }
        }
      }

      const nextLevel = level?.nextLevelId
        ? state.levels[level.nextLevelId]
        : undefined;
      if (nextLevel !== undefined && nextLevel.status === 'locked') {
        nextLevel.status = 'unlocked';
      }
    }

    state.levels[attempt.levelId] = progress;
    state.attempts.push({
      id: attempt.id,
      levelId: attempt.levelId,
      success: result.success,
      hintsUsed,
      durationMs,
      errorsDetected,
      endedAt: now,
    });
    trimAttempts(state);
    this.writeState(state);

    return toPlayerProgress(state);
  }

  async saveSandbox(input: SandboxCircuitInput): Promise<SandboxCircuit> {
    const state = this.readState();
    const id = input.id ?? createId('sandbox');
    const existingIndex = state.sandbox.findIndex((item) => item.id === id);
    const data = cloneDocument(input.data);
    const entry: SandboxCircuit = {
      id,
      name: input.name,
      data,
      updatedAt: Date.now(),
    };

    if (input.thumbnail !== undefined) {
      entry.thumbnail = input.thumbnail;
    }

    if (existingIndex >= 0) {
      state.sandbox[existingIndex] = entry;
    } else {
      state.sandbox.push(entry);
    }

    this.writeState(state);
    return cloneSandbox(entry);
  }

  async listSandbox(): Promise<SandboxCircuit[]> {
    return this.readState().sandbox.map(cloneSandbox);
  }

  /** Guest attempts can be replayed into a student account after login. */
  getAttemptHistory(): StoredAttempt[] {
    return this.readState().attempts.map((attempt) => ({
      ...attempt,
      errorsDetected: [...attempt.errorsDetected],
    }));
  }

  /**
   * Summary shown to a guest on the level map. It only describes progress and
   * attempts; workshop creations stay out of the record and survive a reset.
   */
  getGuestRecord(): GuestRecord {
    const state = this.readState();
    let completedLevels = 0;
    let stars = 0;

    for (const progress of Object.values(state.levels)) {
      if (progress.status === 'completed') {
        completedLevels += 1;
        stars += progress.stars;
      }
    }

    return {
      completedLevels,
      stars,
      attempts: state.attempts.length,
    };
  }

  hasGuestProgress(): boolean {
    const state = this.readState();

    return (
      state.attempts.length > 0 ||
      state.sandbox.length > 0 ||
      Object.values(state.levels).some(
        (progress) => progress.status === 'completed',
      )
    );
  }

  /**
   * Changes when the guest data changes, so a declined merge can be asked
   * again only after new guest progress appears.
   */
  guestFingerprint(): string {
    const state = this.readState();
    const completed = Object.values(state.levels).filter(
      (progress) => progress.status === 'completed',
    ).length;

    return `${state.attempts.length}:${completed}:${state.sandbox.length}`;
  }

  clearGuestData(): void {
    this.memoryFallback = createInitialState();

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is unavailable: the in-memory reset still applies.
    }
  }

  /**
   * Parent settings reset the levels and stars of this device. The child's
   * sandbox creations are not progress and are kept on purpose.
   */
  resetLocalProgress(): void {
    const current = this.readState();
    const reset = createInitialState();
    reset.sandbox = current.sandbox.map(cloneSandbox);
    this.writeState(reset);
  }

  private readState(): StoredState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        const initial = createInitialState();
        this.memoryFallback = initial;
        return initial;
      }

      const parsed = JSON.parse(raw) as unknown;
      return normalizeState(parsed);
    } catch {
      if (this.memoryFallback === null) {
        this.memoryFallback = createInitialState();
      }
      return this.memoryFallback;
    }
  }

  private writeState(state: StoredState): void {
    this.memoryFallback = state;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota: keep the in-memory copy for this session.
    }
  }
}

function createInitialState(): StoredState {
  const levels: Record<string, LevelProgress> = {};

  for (const [index, level] of ALL_LEVEL_METADATA.entries()) {
    levels[level.id] = createLevelProgress(
      level.id,
      index === 0 ? 'unlocked' : 'locked',
    );
  }

  return {
    version: 1,
    levels,
    attempts: [],
    vocabulary: [],
    sandbox: [],
  };
}

function normalizeState(raw: unknown): StoredState {
  if (typeof raw !== 'object' || raw === null) {
    return createInitialState();
  }

  const record = raw as Partial<StoredState>;
  if (record.version !== 1) {
    return createInitialState();
  }

  const levels: Record<string, LevelProgress> = {};

  for (const [index, level] of ALL_LEVEL_METADATA.entries()) {
    const stored = record.levels?.[level.id];
    levels[level.id] =
      stored !== undefined
        ? normalizeLevelProgress(level.id, stored)
        : createLevelProgress(level.id, index === 0 ? 'unlocked' : 'locked');
  }

  if (
    !Object.values(levels).some(
      (level) => level.status === 'unlocked' || level.status === 'completed',
    )
  ) {
    const first = ALL_LEVEL_METADATA[0];
    if (first !== undefined) {
      levels[first.id] = createLevelProgress(first.id, 'unlocked');
    }
  }

  const reconciledLevels = reconcileProgress({
    levels,
    vocabulary: [],
  }).levels;

  return {
    version: 1,
    levels: reconciledLevels,
    attempts: Array.isArray(record.attempts) ? record.attempts : [],
    vocabulary: Array.isArray(record.vocabulary)
      ? [...new Set(record.vocabulary.filter((id): id is string => typeof id === 'string'))]
      : [],
    sandbox: Array.isArray(record.sandbox) ? record.sandbox : [],
  };
}

function normalizeLevelProgress(
  levelId: string,
  raw: LevelProgress,
): LevelProgress {
  const status =
    raw.status === 'locked' ||
    raw.status === 'unlocked' ||
    raw.status === 'completed'
      ? raw.status
      : 'locked';

  return {
    levelId,
    status,
    stars:
      typeof raw.stars === 'number' ? Math.min(3, Math.max(0, raw.stars)) : 0,
    attempts: typeof raw.attempts === 'number' ? Math.max(0, raw.attempts) : 0,
    hintsUsed:
      typeof raw.hintsUsed === 'number' ? Math.max(0, raw.hintsUsed) : 0,
    bestTimeMs: typeof raw.bestTimeMs === 'number' ? raw.bestTimeMs : null,
    firstCompletedAt:
      typeof raw.firstCompletedAt === 'number' ? raw.firstCompletedAt : null,
    lastPlayedAt:
      typeof raw.lastPlayedAt === 'number' ? raw.lastPlayedAt : null,
  };
}

function createLevelProgress(
  levelId: string,
  status: LevelProgress['status'] = 'locked',
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

function toPlayerProgress(state: StoredState): PlayerProgress {
  return {
    levels: Object.fromEntries(
      Object.entries(state.levels).map(([id, progress]) => [id, { ...progress }]),
    ),
    vocabulary: [...state.vocabulary],
  };
}

function trimAttempts(state: StoredState): void {
  const maxAttempts = 500;
  if (state.attempts.length > maxAttempts) {
    state.attempts = state.attempts.slice(-maxAttempts);
  }
}

function cloneDocument(data: CircuitDocument): CircuitDocument {
  return JSON.parse(JSON.stringify(data)) as CircuitDocument;
}

function cloneSandbox(sandbox: SandboxCircuit): SandboxCircuit {
  const clone: SandboxCircuit = {
    id: sandbox.id,
    name: sandbox.name,
    data: cloneDocument(sandbox.data),
    updatedAt: sandbox.updatedAt,
  };

  if (sandbox.thumbnail !== undefined) {
    clone.thumbnail = sandbox.thumbnail;
  }

  return clone;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const localProgressRepository = new LocalProgressRepository();
