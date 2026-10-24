import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttemptStart, PlayerProgress } from '@circuits/shared';
import type { LevelDefinition } from '@circuits/shared/levels';

import { useProgressRepository } from '../progress/ProgressContext';

export interface LevelSession {
  hintsUsed: number;
  recordHint: () => void;
  recordDiagnostics: (codes: readonly string[]) => void;
  completeSuccess: () => Promise<PlayerProgress | null>;
}

export function useLevelSession(level: LevelDefinition | null): LevelSession {
  const [hintsUsed, setHintsUsed] = useState(0);
  const hintsRef = useRef(0);
  const errorsRef = useRef<Set<string>>(new Set());
  const attemptRef = useRef<AttemptStart | null>(null);
  const attemptPromiseRef = useRef<Promise<AttemptStart> | null>(null);
  const startTimeRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const repository = useProgressRepository();

  const finishAttempt = useCallback(
    async (success: boolean): Promise<PlayerProgress | null> => {
      if (level === null || finishedRef.current) {
        return null;
      }

      finishedRef.current = true;

      try {
        const pendingAttempt = attemptPromiseRef.current;
        const attempt =
          attemptRef.current ??
          (pendingAttempt !== null ? await pendingAttempt : null) ?? {
            id: `attempt-${Date.now()}`,
            levelId: level.id,
            startedAt: startTimeRef.current,
          };

        const durationMs = Math.max(0, Date.now() - attempt.startedAt);

        return await repository.finishAttempt(attempt, {
          success,
          hintsUsed: hintsRef.current,
          durationMs,
          errorsDetected: [...errorsRef.current],
        });
      } catch {
        return null;
      }
    },
    [level, repository],
  );

  useEffect(() => {
    if (level === null) {
      return;
    }

    finishedRef.current = false;
    hintsRef.current = 0;
    errorsRef.current.clear();
    attemptRef.current = null;
    startTimeRef.current = Date.now();
    setHintsUsed(0);

    let active = true;
    const promise = repository
      .startAttempt(level.id)
      .then((attempt) => {
        if (active) {
          attemptRef.current = attempt;
        }
        return attempt;
      })
      .catch(() => {
        const fallback: AttemptStart = {
          id: `attempt-${Date.now()}`,
          levelId: level.id,
          startedAt: startTimeRef.current,
        };

        if (active) {
          attemptRef.current = fallback;
        }

        return fallback;
      });
    attemptPromiseRef.current = promise;

    return () => {
      active = false;
      void finishAttempt(false);
    };
  }, [level, finishAttempt, repository]);

  const recordHint = useCallback(() => {
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
  }, []);

  const recordDiagnostics = useCallback((codes: readonly string[]) => {
    for (const code of codes) {
      errorsRef.current.add(code);
    }
  }, []);

  const completeSuccess = useCallback(
    () => finishAttempt(true),
    [finishAttempt],
  );

  return { hintsUsed, recordHint, recordDiagnostics, completeSuccess };
}
