import {
  createLevelRuntime,
  createTransientSimulator,
  DEFAULT_TRANSIENT_STEP_MS,
  updateLevelRuntime,
  type Circuit,
  type LevelRuntime,
  type TransientSimulator,
} from '@circuits/shared';
import type { LevelDefinition } from '@circuits/shared/levels';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TransientState {
  simulation: ReturnType<TransientSimulator['snapshot']>['simulation'];
  runtime: LevelRuntime;
  emptyCapacitor: (componentId: string) => void;
  reset: () => void;
}

interface Options {
  level: LevelDefinition | undefined;
  circuit: Circuit;
  enabled: boolean;
}

/**
 * Runs the capacitor simulation while a transient level is active.
 * State stays local: the store remains the static simulation used by editing.
 */
export function useTransientSimulation({
  level,
  circuit,
  enabled,
}: Options): TransientState | null {
  const levelId = level?.id ?? null;
  const stepMs = level?.transient?.stepMs ?? DEFAULT_TRANSIENT_STEP_MS;
  const simulatorRef = useRef<TransientSimulator | null>(null);
  const runtimeRef = useRef<LevelRuntime | null>(null);
  const circuitRef = useRef(circuit);
  const [frame, setFrame] = useState<ReturnType<TransientSimulator['snapshot']> | null>(
    null,
  );

  circuitRef.current = circuit;

  useEffect(() => {
    if (levelId === null || level?.transient === undefined) {
      simulatorRef.current = null;
      runtimeRef.current = null;
      setFrame(null);
      return;
    }

    simulatorRef.current = createTransientSimulator(circuitRef.current, { stepMs });
    runtimeRef.current = createLevelRuntime();
    setFrame(simulatorRef.current.snapshot());
  }, [levelId, level?.transient, stepMs]);

  useEffect(() => {
    simulatorRef.current?.setCircuit(circuit);
  }, [circuit]);

  useEffect(() => {
    if (!enabled || level?.transient === undefined) {
      return;
    }

    if (import.meta.env.MODE === 'test') {
      return;
    }

    let raf = 0;
    let last = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) {
        return;
      }

      if (document.hidden) {
        last = now;
        raf = window.requestAnimationFrame(tick);
        return;
      }

      const elapsed = last === 0 ? 0 : Math.min(now - last, 64);
      last = now;

      if (elapsed >= stepMs) {
        const simulator = simulatorRef.current;
        const runtime = runtimeRef.current;

        if (simulator !== null && runtime !== null) {
          const next = simulator.step();
          updateLevelRuntime(runtime, circuitRef.current, next.simulation, stepMs);
          setFrame(next);
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, level?.transient, stepMs]);

  const emptyCapacitor = useCallback((componentId: string) => {
    const simulator = simulatorRef.current;
    const runtime = runtimeRef.current;

    if (simulator === null || runtime === null) {
      return;
    }

    simulator.setCapacitorVoltage(componentId, 0);
    const next = simulator.snapshot();
    updateLevelRuntime(runtime, circuitRef.current, next.simulation, 0);
    setFrame(next);
  }, []);

  const reset = useCallback(() => {
    const simulator = simulatorRef.current;
    const runtime = runtimeRef.current;

    if (simulator === null || runtime === null) {
      return;
    }

    simulator.reset();
    runtimeRef.current = createLevelRuntime();
    setFrame(simulator.snapshot());
  }, []);

  if (
    !enabled ||
    levelId === null ||
    level?.transient === undefined ||
    frame === null ||
    simulatorRef.current === null ||
    runtimeRef.current === null
  ) {
    return null;
  }

  return {
    simulation: frame.simulation,
    runtime: runtimeRef.current,
    emptyCapacitor,
    reset,
  };
}
