import { addDiagnostic, analyzeCircuit, sortDiagnostics } from './analysis';
import { NOMINAL_CURRENTS, SHORT_CIRCUIT_CURRENT } from './components';
import { CircuitError } from './errors';
import { solveLinearSystem } from './mna';
import { buildCircuitModel, type CircuitModel } from './model';
import type {
  Circuit,
  CircuitComponent,
  CircuitDescription,
  CircuitSimulation,
  ComponentState,
  DiagnosticCode,
  LedComponent,
  QualitativeState,
  ShortCircuitInfo,
  TerminalRef,
} from './types';

const GMIN = 1e-9;
const MAX_LED_ITERATIONS = 12;
const REVERSE_BIAS_VOLTAGE = -0.05;
const ACTIVE_CURRENT = 1e-3;

interface LinearSystem {
  matrix: Float64Array;
  rhs: Float64Array;
}

interface SolvedCircuit {
  states: Record<string, ComponentState>;
  ledReversedIds: string[];
  shortInfo: ShortCircuitInfo | null;
}

const BLOCKING_DIAGNOSTICS = new Set<DiagnosticCode>([
  'missing_battery',
  'short_circuit',
  'switch_open',
  'insulating_material',
  'led_reversed',
  'simulation_error',
]);

export function simulateCircuit(circuit: Circuit): CircuitSimulation {
  const model = buildCircuitModel(circuit);
  const analysis = analyzeCircuit(model);
  let states = createEmptyStates(model.components);
  let ledReversedIds: string[] = [];

  if (analysis.hasBattery && analysis.closed && analysis.shortInfo === null) {
    try {
      const solved = solveCircuit(model);
      states = solved.states;
      ledReversedIds = solved.ledReversedIds;

      if (solved.shortInfo !== null) {
        analysis.shortInfo = solved.shortInfo;
        addDiagnostic(analysis.diagnostics, 'short_circuit', {
          wireIds: solved.shortInfo.wireIds,
          componentIds: solved.shortInfo.componentIds,
        });
      }
    } catch (error) {
      if (!(error instanceof CircuitError)) {
        throw error;
      }
      addDiagnostic(analysis.diagnostics, 'simulation_error');
    }
  }

  if (ledReversedIds.length > 0) {
    const terminalRefs: TerminalRef[] = [];

    for (const ledId of ledReversedIds) {
      const led = model.componentById.get(ledId);
      if (led?.type === 'led') {
        terminalRefs.push(
          { componentId: ledId, terminalId: 'anode' },
          { componentId: ledId, terminalId: 'cathode' },
        );
      }
    }

    addDiagnostic(analysis.diagnostics, 'led_reversed', {
      componentIds: ledReversedIds,
      terminalRefs,
    });
  }

  const diagnostics = sortDiagnostics(analysis.diagnostics);
  const shortCircuit = analysis.shortInfo !== null;
  const ledReversed = ledReversedIds.length > 0;
  const ok =
    analysis.closed &&
    !diagnostics.some((diagnostic) => BLOCKING_DIAGNOSTICS.has(diagnostic.code));

  return {
    ok,
    closed: analysis.closed,
    shortCircuit,
    openCircuit: !analysis.closed,
    missingBattery: !analysis.hasBattery,
    bulbOneSide: diagnostics.some((diagnostic) => diagnostic.code === 'bulb_one_side'),
    switchOpen: diagnostics.some((diagnostic) => diagnostic.code === 'switch_open'),
    insulatingMaterial: diagnostics.some(
      (diagnostic) => diagnostic.code === 'insulating_material',
    ),
    ledReversed,
    danglingTerminals: analysis.danglingTerminals,
    diagnostics,
    shortCircuitInfo: analysis.shortInfo,
    states,
  };
}

export function describeCircuit(circuit: Circuit): CircuitDescription {
  const { states: _states, ...description } = simulateCircuit(circuit);
  void _states;
  return description;
}

function solveCircuit(model: CircuitModel): SolvedCircuit {
  const leds = model.components.filter(isLedComponent);
  const ledOn = new Map<string, boolean>();
  for (const led of leds) {
    ledOn.set(led.id, false);
  }

  let voltages: Float64Array = new Float64Array(model.nodeCount);
  let changed = false;

  for (let iteration = 0; iteration < MAX_LED_ITERATIONS; iteration += 1) {
    const system = assembleSystem(model, ledOn);
    voltages = solveLinearSystem(system.matrix, system.rhs, model.nodeCount);
    changed = false;

    for (const led of leds) {
      const [anode, cathode] = model.nodesFor(led);
      const voltage = voltages[anode]! - voltages[cathode]!;
      const isOn = ledOn.get(led.id) === true;

      if (isOn) {
        const current = (voltage - led.forwardVoltage) / led.resistance;
        if (current < -1e-9) {
          ledOn.set(led.id, false);
          changed = true;
        }
      } else if (voltage > led.forwardVoltage + 1e-9) {
        ledOn.set(led.id, true);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  if (changed) {
    const system = assembleSystem(model, ledOn);
    voltages = solveLinearSystem(system.matrix, system.rhs, model.nodeCount);
  }

  const states = buildStates(model, voltages, ledOn);
  const ledReversedIds = leds
    .filter((led) => states[led.id]?.reverseBiased === true)
    .map((led) => led.id);

  let maxBatteryCurrent = 0;
  for (const component of model.components) {
    if (component.type !== 'battery') {
      continue;
    }

    const state = states[component.id];
    if (state !== undefined) {
      maxBatteryCurrent = Math.max(maxBatteryCurrent, Math.abs(state.current));
    }
  }

  let shortInfo: ShortCircuitInfo | null = null;
  if (maxBatteryCurrent > SHORT_CIRCUIT_CURRENT) {
    const componentIds = model.components
      .filter((component) => component.type !== 'battery' && component.type !== 'wire')
      .filter((component) => {
        const state = states[component.id];
        return state !== undefined && Math.abs(state.current) > SHORT_CIRCUIT_CURRENT / 2;
      })
      .map((component) => component.id);

    shortInfo = {
      wireIds: [],
      componentIds,
      current: maxBatteryCurrent,
    };
  }

  return { states, ledReversedIds, shortInfo };
}

function assembleSystem(
  model: CircuitModel,
  ledOn: Map<string, boolean>,
): LinearSystem {
  const size = model.nodeCount;
  const matrix = new Float64Array(size * size);
  const rhs = new Float64Array(size);

  const addConductance = (conductance: number, first: number, second: number): void => {
    if (first === second) {
      return;
    }

    matrix[first * size + first] = matrix[first * size + first]! + conductance;
    matrix[second * size + second] = matrix[second * size + second]! + conductance;
    matrix[first * size + second] = matrix[first * size + second]! - conductance;
    matrix[second * size + first] = matrix[second * size + first]! - conductance;
  };

  const addCurrent = (current: number, from: number, to: number): void => {
    rhs[from] = rhs[from]! + current;
    rhs[to] = rhs[to]! - current;
  };

  for (const component of model.components) {
    const [first, second] = model.nodesFor(component);

    switch (component.type) {
      case 'battery': {
        if (first === second) {
          break;
        }
        const conductance = 1 / component.internalResistance;
        addConductance(conductance, first, second);
        addCurrent(component.voltage * conductance, first, second);
        break;
      }
      case 'bulb':
      case 'motor':
      case 'buzzer':
      case 'resistor':
        addConductance(1 / component.resistance, first, second);
        break;
      case 'switch':
        if (component.closed) {
          addConductance(1 / component.resistanceWhenClosed, first, second);
        }
        break;
      case 'material':
        if (component.conductive) {
          addConductance(1 / component.resistanceWhenConductive, first, second);
        }
        break;
      case 'led':
        if (ledOn.get(component.id) === true && first !== second) {
          const conductance = 1 / component.resistance;
          addConductance(conductance, first, second);
          addCurrent(component.forwardVoltage * conductance, first, second);
        }
        break;
      case 'wire':
        break;
    }
  }

  for (let node = 0; node < size; node += 1) {
    matrix[node * size + node] = matrix[node * size + node]! + GMIN;
  }

  return { matrix, rhs };
}

function buildStates(
  model: CircuitModel,
  voltages: Float64Array,
  ledOn: Map<string, boolean>,
): Record<string, ComponentState> {
  const states = Object.create(null) as Record<string, ComponentState>;

  for (const component of model.components) {
    const [first, second] = model.nodesFor(component);
    const voltage = voltages[first]! - voltages[second]!;
    states[component.id] = buildComponentState(
      component,
      voltage,
      ledOn.get(component.id) === true,
    );
  }

  return states;
}

function buildComponentState(
  component: CircuitComponent,
  voltage: number,
  ledOn: boolean,
): ComponentState {
  switch (component.type) {
    case 'battery': {
      const current = (component.voltage - voltage) / component.internalResistance;
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        intensity: 0,
        state: on ? 'normal' : 'off',
        on,
        reverseBiased: false,
      };
    }
    case 'bulb':
    case 'motor':
    case 'buzzer': {
      const current = voltage / component.resistance;
      const intensity = Math.abs(current) / NOMINAL_CURRENTS[component.type];
      const state = toQualitativeState(intensity);

      return {
        current,
        voltage,
        intensity,
        state,
        on: state !== 'off',
        reverseBiased: false,
      };
    }
    case 'led': {
      const reverseBiased = voltage < REVERSE_BIAS_VOLTAGE;
      const current = ledOn ? (voltage - component.forwardVoltage) / component.resistance : 0;

      if (!ledOn || current <= 0) {
        return {
          current: 0,
          voltage,
          intensity: 0,
          state: 'off',
          on: false,
          reverseBiased,
        };
      }

      const intensity = current / NOMINAL_CURRENTS.led;
      const state = toQualitativeState(intensity);

      return {
        current,
        voltage,
        intensity,
        state,
        on: state !== 'off',
        reverseBiased: false,
      };
    }
    case 'resistor': {
      const current = voltage / component.resistance;
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        intensity: 0,
        state: on ? 'normal' : 'off',
        on,
        reverseBiased: false,
      };
    }
    case 'switch': {
      const current = component.closed ? voltage / component.resistanceWhenClosed : 0;

      return {
        current,
        voltage,
        intensity: 0,
        state:
          component.closed && Math.abs(current) > ACTIVE_CURRENT ? 'normal' : 'off',
        on: component.closed,
        reverseBiased: false,
      };
    }
    case 'material': {
      const current = component.conductive
        ? voltage / component.resistanceWhenConductive
        : 0;

      return {
        current,
        voltage,
        intensity: 0,
        state:
          component.conductive && Math.abs(current) > ACTIVE_CURRENT ? 'normal' : 'off',
        on: component.conductive,
        reverseBiased: false,
      };
    }
    case 'wire':
      return {
        current: 0,
        voltage,
        intensity: 0,
        state: 'off',
        on: true,
        reverseBiased: false,
      };
  }
}

function createEmptyStates(
  components: CircuitComponent[],
): Record<string, ComponentState> {
  const states = Object.create(null) as Record<string, ComponentState>;

  for (const component of components) {
    states[component.id] = {
      current: 0,
      voltage: 0,
      intensity: 0,
      state: 'off',
      on:
        component.type === 'switch'
          ? component.closed
          : component.type === 'material'
            ? component.conductive
            : component.type === 'wire',
      reverseBiased: false,
    };
  }

  return states;
}

function toQualitativeState(intensity: number): QualitativeState {
  if (!Number.isFinite(intensity) || intensity < 0.02) {
    return 'off';
  }
  if (intensity < 0.75) {
    return 'dim';
  }
  if (intensity < 1.5) {
    return 'normal';
  }
  return 'bright';
}

function isLedComponent(component: CircuitComponent): component is LedComponent {
  return component.type === 'led';
}
