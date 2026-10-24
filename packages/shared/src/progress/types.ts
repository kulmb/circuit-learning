import type { CircuitDocument } from '../circuit/serialization';

export type LevelStatus = 'locked' | 'unlocked' | 'completed';

export interface LevelProgress {
  levelId: string;
  status: LevelStatus;
  stars: number;
  attempts: number;
  hintsUsed: number;
  bestTimeMs: number | null;
  firstCompletedAt: number | null;
  lastPlayedAt: number | null;
}

export interface PlayerProgress {
  levels: Record<string, LevelProgress>;
  vocabulary: string[];
}

export interface AttemptStart {
  id: string;
  levelId: string;
  startedAt: number;
}

export interface AttemptResult {
  success: boolean;
  hintsUsed: number;
  durationMs: number;
  errorsDetected: string[];
}

export interface SandboxCircuit {
  id: string;
  name: string;
  data: CircuitDocument;
  thumbnail?: string;
  updatedAt: number;
}

export interface SandboxCircuitInput {
  id?: string;
  name: string;
  data: CircuitDocument;
  thumbnail?: string;
}

export interface ProgressRepository {
  getProgress(): Promise<PlayerProgress>;
  startAttempt(levelId: string): Promise<AttemptStart>;
  finishAttempt(
    attempt: AttemptStart,
    result: AttemptResult,
  ): Promise<PlayerProgress>;
  saveSandbox(input: SandboxCircuitInput): Promise<SandboxCircuit>;
  listSandbox(): Promise<SandboxCircuit[]>;
}
