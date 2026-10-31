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

/**
 * The physics runs at 16 ms, but the React tree only receives a new snapshot
 * 20 times per second. A capacitor animation is slow enough for this rate,
 * and it keeps the full workbench render off the 60 Hz path on tablets.
 */
const PUBLISH_INTERVAL_MS = 50;
/** Ignore sub-millivolt drift so a charged capacitor stops re-rendering. */
const CAPACITOR_VOLTAGE_EPSILON = 1e-3;

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
  const lastPublishAtRef = useRef(0);
  const publishedVoltagesRef = useRef<Record<string, number>>({});
  const forcePublishRef = useRef(false);
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

    const simulator = createTransientSimulator(circuitRef.current, { stepMs });
    const initial = simulator.snapshot();

    simulatorRef.current = simulator;
    runtimeRef.current = createLevelRuntime();
    lastPublishAtRef.current = 0;
    publishedVoltagesRef.current = { ...initial.capacitorVoltages };
    forcePublishRef.current = false;
    setFrame(initial);
  }, [levelId, level?.transient, stepMs]);

  useEffect(() => {
    simulatorRef.current?.setCircuit(circuit);
    // A switch or wire change can alter the visible state without moving a
    // capacitor voltage, so the next tick must publish regardless.
    forcePublishRef.current = true;
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

          const changed = Object.entries(next.capacitorVoltages).some(
            ([componentId, voltage]) =>
              Math.abs(
                voltage - (publishedVoltagesRef.current[componentId] ?? 0),
              ) >= CAPACITOR_VOLTAGE_EPSILON,
          );
          const due =
            now - lastPublishAtRef.current >= PUBLISH_INTERVAL_MS;

          if ((changed || forcePublishRef.current) && due) {
            forcePublishRef.current = false;
            lastPublishAtRef.current = now;
            publishedVoltagesRef.current = { ...next.capacitorVoltages };
            setFrame(next);
          }
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
    publishedVoltagesRef.current = { ...next.capacitorVoltages };
    lastPublishAtRef.current = 0;
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
    const next = simulator.snapshot();
    publishedVoltagesRef.current = { ...next.capacitorVoltages };
    lastPublishAtRef.current = 0;
    setFrame(next);
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
