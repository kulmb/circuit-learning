import { simulateCircuitWithOptions } from './simulate';
import type {
  CapacitorComponent,
  Circuit,
  CircuitComponent,
  CircuitSimulation,
} from './types';

export const DEFAULT_TRANSIENT_STEP_MS = 16;

export interface TransientOptions {
  stepMs?: number;
  /** Initial capacitor voltages, by component id. */
  initialVoltages?: Record<string, number>;
}

export interface TransientFrame {
  simulation: CircuitSimulation;
  elapsedMs: number;
  capacitorVoltages: Record<string, number>;
}

export interface TransientSimulator {
  step(): TransientFrame;
  reset(): void;
  snapshot(): TransientFrame;
  setCircuit(circuit: Circuit): void;
  setCapacitorVoltage(componentId: string, voltage: number): void;
  capacitorVoltages(): Record<string, number>;
}

/**
 * Backward-Euler transient simulator for capacitor circuits.
 *
 * The static `simulateCircuit` treats a capacitor as an open circuit. This
 * simulator stamps the companion model (conductance C/dt plus a current source
 * C/dt * v_previous) before each solve, then stores the new capacitor voltage.
 */
export function createTransientSimulator(
  circuit: Circuit,
  options: TransientOptions = {},
): TransientSimulator {
  const stepMs = options.stepMs ?? DEFAULT_TRANSIENT_STEP_MS;
  let currentCircuit = circuit;
  let elapsedMs = 0;
  let voltages = initialVoltages(currentCircuit, options.initialVoltages);

  const buildFrame = (): TransientFrame => {
    const simulation = simulateCircuitWithOptions(currentCircuit, {
      capacitorVoltages: voltages,
      stepMs,
      forceSolve: true,
    });

    const next = { ...voltages };

    for (const component of currentCircuit.components) {
      if (component.type !== 'capacitor') {
        continue;
      }

      const state = simulation.states[component.id];
      if (state !== undefined) {
        next[component.id] = state.voltage;
      }
    }

    return {
      simulation,
      elapsedMs,
      capacitorVoltages: next,
    };
  };

  const snapshot = (): TransientFrame => {
    const frame = buildFrame();
    return {
      simulation: frame.simulation,
      elapsedMs: frame.elapsedMs,
      capacitorVoltages: { ...voltages },
    };
  };

  return {
    step() {
      const frame = buildFrame();
      voltages = frame.capacitorVoltages;
      elapsedMs += stepMs;

      return {
        simulation: frame.simulation,
        elapsedMs,
        capacitorVoltages: { ...voltages },
      };
    },

    reset() {
      elapsedMs = 0;
      voltages = initialVoltages(currentCircuit, options.initialVoltages);
    },

    snapshot,

    setCircuit(nextCircuit) {
      const nextIds = new Set(
        nextCircuit.components
          .filter((component) => component.type === 'capacitor')
          .map((component) => component.id),
      );

      currentCircuit = nextCircuit;
      voltages = Object.fromEntries(
        Object.entries(voltages).filter(([componentId]) => nextIds.has(componentId)),
      );

      for (const component of nextCircuit.components) {
        if (
          component.type === 'capacitor' &&
          voltages[component.id] === undefined
        ) {
          voltages[component.id] =
            options.initialVoltages?.[component.id] ?? component.initialVoltage;
        }
      }
    },

    setCapacitorVoltage(componentId, voltage) {
      voltages[componentId] = voltage;
    },

    capacitorVoltages() {
      return { ...voltages };
    },
  };
}

function initialVoltages(
  circuit: Circuit,
  overrides: Record<string, number> | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const component of circuit.components) {
    if (component.type !== 'capacitor') {
      continue;
    }

    result[component.id] =
      overrides?.[component.id] ?? component.initialVoltage;
  }

  return result;
}

export function isCapacitorComponent(
  component: CircuitComponent,
): component is CapacitorComponent {
  return component.type === 'capacitor';
}
