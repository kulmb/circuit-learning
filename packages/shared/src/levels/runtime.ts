import type { Circuit, CircuitSimulation } from '../circuit';

export interface LevelRuntime {
  elapsedMs: number;
  capacitorVoltages: Record<string, number>;
  capacitorFilled: Record<string, boolean>;
  capacitorEmpty: Record<string, boolean>;
  maxLampOnAfterOpenMs: number;
  flashSeen: Record<string, boolean>;
  /** Internal: instant each switch opened, or null when it is closed. */
  switchOpenAt: Record<string, number | null>;
  /** Internal: last high current and its instant, per component. */
  peakCurrent: Record<string, number>;
  peakAtMs: Record<string, number | null>;
}

const CAPACITOR_FULL = 0.8;
const CAPACITOR_EMPTY = 0.15;
const FLASH_CURRENT = 0.25;
const FLASH_DROP_CURRENT = 0.05;
const FLASH_MAX_MS = 600;

export function createLevelRuntime(): LevelRuntime {
  return {
    elapsedMs: 0,
    capacitorVoltages: {},
    capacitorFilled: {},
    capacitorEmpty: {},
    maxLampOnAfterOpenMs: 0,
    flashSeen: {},
    switchOpenAt: {},
    peakCurrent: {},
    peakAtMs: {},
  };
}

/**
 * Consumes one simulation frame. All flags latch: once a child has seen a
 * capacitor fill, a lamp stay on or a flash, the success condition keeps it.
 */
export function updateLevelRuntime(
  runtime: LevelRuntime,
  circuit: Circuit,
  simulation: CircuitSimulation,
  dtMs: number,
): LevelRuntime {
  runtime.elapsedMs += Math.max(0, dtMs);

  for (const component of circuit.components) {
    if (component.type !== 'capacitor') {
      continue;
    }

    const state = simulation.states[component.id];
    const voltage = state?.voltage ?? 0;
    const charge = state?.charge ?? 0;

    runtime.capacitorVoltages[component.id] = voltage;

    if (charge >= CAPACITOR_FULL) {
      runtime.capacitorFilled[component.id] = true;
    }

    if (
      runtime.capacitorFilled[component.id] === true &&
      charge <= CAPACITOR_EMPTY
    ) {
      runtime.capacitorEmpty[component.id] = true;
    }
  }

  let anySwitchOpen = false;

  for (const component of circuit.components) {
    if (component.type !== 'switch') {
      continue;
    }

    if (component.closed) {
      runtime.switchOpenAt[component.id] = null;
      continue;
    }

    anySwitchOpen = true;

    if (runtime.switchOpenAt[component.id] === null ||
        runtime.switchOpenAt[component.id] === undefined) {
      runtime.switchOpenAt[component.id] = runtime.elapsedMs;
    }
  }

  if (anySwitchOpen) {
    let longest = 0;

    for (const component of circuit.components) {
      if (component.type !== 'bulb') {
        continue;
      }

      if (simulation.states[component.id]?.on !== true) {
        continue;
      }

      for (const openAt of Object.values(runtime.switchOpenAt)) {
        if (openAt !== null && openAt !== undefined) {
          longest = Math.max(longest, runtime.elapsedMs - openAt);
        }
      }
    }

    runtime.maxLampOnAfterOpenMs = Math.max(
      runtime.maxLampOnAfterOpenMs,
      longest,
    );
  }

  for (const component of circuit.components) {
    if (
      component.type !== 'bulb' &&
      component.type !== 'led' &&
      component.type !== 'diode'
    ) {
      continue;
    }

    const state = simulation.states[component.id];
    if (state === undefined) {
      continue;
    }

    const current = Math.abs(state.current);

    if (current > FLASH_CURRENT) {
      runtime.peakCurrent[component.id] = current;
      runtime.peakAtMs[component.id] = runtime.elapsedMs;
    }

    const peakAt = runtime.peakAtMs[component.id];
    const peak = runtime.peakCurrent[component.id] ?? 0;

    if (
      peakAt !== null &&
      peakAt !== undefined &&
      peak > FLASH_CURRENT &&
      current < FLASH_DROP_CURRENT &&
      runtime.elapsedMs - peakAt <= FLASH_MAX_MS
    ) {
      runtime.flashSeen[component.id] = true;
    }
  }

  return runtime;
}
