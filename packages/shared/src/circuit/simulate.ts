import { addDiagnostic, analyzeCircuit, sortDiagnostics } from './analysis';
import {
  EXPECTED_TERMINAL_IDS,
  NOMINAL_CURRENTS,
  SHORT_CIRCUIT_CURRENT,
  rheostatResistance,
} from './components';
import { CircuitError } from './errors';
import { solveLinearSystem } from './mna';
import { buildCircuitModel, type CircuitModel } from './model';
import { computeWireCurrents } from './wireCurrents';
import type {
  BatteryComponent,
  Circuit,
  CircuitComponent,
  CircuitDescription,
  CircuitSimulation,
  ComponentState,
  DiagnosticCode,
  DiodeComponent,
  LedComponent,
  QualitativeState,
  RelayComponent,
  ShortCircuitInfo,
  SolarComponent,
  TerminalRef,
} from './types';

const GMIN = 1e-9;
const MAX_OPERATING_POINT_ITERATIONS = 12;
const REVERSE_BIAS_VOLTAGE = -0.05;
const ACTIVE_CURRENT = 1e-3;

interface LinearSystem {
  matrix: Float64Array;
  rhs: Float64Array;
}

interface SolveOptions {
  /** Previous capacitor voltages for a backward-Euler step. */
  capacitorVoltages?: Record<string, number>;
  /** Time step in seconds. Enables capacitor companion models. */
  stepMs?: number;
  /** Solve even when the graph analysis reports an open circuit. */
  forceSolve?: boolean;
}

interface OperatingPoint {
  conducting: Map<string, boolean>;
  relayEnergized: Map<string, boolean>;
}

interface SolvedCircuit {
  states: Record<string, ComponentState>;
  ledReversedIds: string[];
  diodeReversedIds: string[];
  shortInfo: ShortCircuitInfo | null;
  wireCurrents: Record<string, number>;
}

const BLOCKING_DIAGNOSTICS = new Set<DiagnosticCode>([
  'missing_battery',
  'missing_source',
  'short_circuit',
  'switch_open',
  'insulating_material',
  'led_reversed',
  'simulation_error',
]);

export function simulateCircuit(circuit: Circuit): CircuitSimulation {
  return simulateCircuitWithOptions(circuit, {});
}

export function simulateCircuitWithOptions(
  circuit: Circuit,
  options: SolveOptions,
): CircuitSimulation {
  const model = buildCircuitModel(circuit);
  const analysis = analyzeCircuit(model);
  let states = createEmptyStates(model.components);
  let ledReversedIds: string[] = [];
  let diodeReversedIds: string[] = [];
  let wireCurrents: Record<string, number> = {};

  const chargedCapacitor = Object.values(options.capacitorVoltages ?? {}).some(
    (voltage) => Math.abs(voltage) > 1e-9,
  );

  if (options.forceSolve && chargedCapacitor) {
    analysis.diagnostics = analysis.diagnostics.filter(
      (diagnostic) =>
        diagnostic.code !== 'missing_battery' &&
        diagnostic.code !== 'missing_source',
    );
  }

  const shouldSolve = options.forceSolve
    ? analysis.hasSource || chargedCapacitor
    : analysis.hasSource && analysis.closed && analysis.shortInfo === null;

  if (shouldSolve) {
    try {
      const solved = solveCircuit(model, options);
      states = solved.states;
      ledReversedIds = solved.ledReversedIds;
      diodeReversedIds = solved.diodeReversedIds;
      wireCurrents = solved.wireCurrents;

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

  if (diodeReversedIds.length > 0) {
    const terminalRefs: TerminalRef[] = [];

    for (const diodeId of diodeReversedIds) {
      const diode = model.componentById.get(diodeId);
      if (diode?.type === 'diode') {
        terminalRefs.push(
          { componentId: diodeId, terminalId: 'anode' },
          { componentId: diodeId, terminalId: 'cathode' },
        );
      }
    }

    addDiagnostic(analysis.diagnostics, 'diode_reversed', {
      componentIds: diodeReversedIds,
      terminalRefs,
    });
  }

  const diagnostics = sortDiagnostics(analysis.diagnostics);
  const shortCircuit = analysis.shortInfo !== null;
  const ledReversed = ledReversedIds.length > 0;
  const diodeReversed = diodeReversedIds.length > 0;
  const hasSource = analysis.hasSource || chargedCapacitor;
  const ok =
    analysis.closed &&
    !diagnostics.some((diagnostic) => BLOCKING_DIAGNOSTICS.has(diagnostic.code));

  return {
    ok,
    closed: analysis.closed,
    shortCircuit,
    openCircuit: !analysis.closed,
    missingBattery: !hasSource,
    missingSource: !hasSource,
    bulbOneSide: diagnostics.some((diagnostic) => diagnostic.code === 'bulb_one_side'),
    switchOpen: diagnostics.some((diagnostic) => diagnostic.code === 'switch_open'),
    insulatingMaterial: diagnostics.some(
      (diagnostic) => diagnostic.code === 'insulating_material',
    ),
    ledReversed,
    diodeReversed,
    danglingTerminals: analysis.danglingTerminals,
    diagnostics,
    shortCircuitInfo: analysis.shortInfo,
    states,
    wireCurrents,
  };
}

export function describeCircuit(circuit: Circuit): CircuitDescription {
  const { states: _states, wireCurrents: _wireCurrents, ...description } =
    simulateCircuit(circuit);
  void _states;
  void _wireCurrents;
  return description;
}

function solveCircuit(model: CircuitModel, options: SolveOptions): SolvedCircuit {
  const controlled = model.components.filter(isControlledComponent);
  const relays = model.components.filter(isRelayComponent);
  const operating: OperatingPoint = {
    conducting: new Map(controlled.map((component) => [component.id, false])),
    relayEnergized: new Map(
      relays.map((relay) => [relay.id, initialRelayEnergized(relay)]),
    ),
  };

  let voltages: Float64Array = new Float64Array(model.nodeCount);
  let changed = false;

  for (
    let iteration = 0;
    iteration < MAX_OPERATING_POINT_ITERATIONS;
    iteration += 1
  ) {
    const system = assembleSystem(model, operating, options);
    voltages = solveLinearSystem(system.matrix, system.rhs, model.nodeCount);
    changed = false;

    for (const component of controlled) {
      const [anode, cathode] = model.nodesFor(component);
      const voltage = voltages[anode]! - voltages[cathode]!;
      const isOn = operating.conducting.get(component.id) === true;

      if (isOn) {
        const current =
          (voltage - component.forwardVoltage) / component.resistance;
        if (current < -1e-9) {
          operating.conducting.set(component.id, false);
          changed = true;
        }
      } else if (voltage > component.forwardVoltage + 1e-9) {
        operating.conducting.set(component.id, true);
        changed = true;
      }
    }

    for (const relay of relays) {
      const [coilA, coilB] = model.nodesForTerminals(relay, ['coilA', 'coilB']);
      if (coilA === undefined || coilB === undefined) {
        continue;
      }

      const coilVoltage = voltages[coilA]! - voltages[coilB]!;
      const current = Math.abs(coilVoltage) / relay.coilResistance;
      const energized = operating.relayEnergized.get(relay.id) === true;

      if (energized) {
        if (current < relay.threshold * 0.6) {
          operating.relayEnergized.set(relay.id, false);
          changed = true;
        }
      } else if (current > relay.threshold) {
        operating.relayEnergized.set(relay.id, true);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  if (changed) {
    const system = assembleSystem(model, operating, options);
    voltages = solveLinearSystem(system.matrix, system.rhs, model.nodeCount);
  }

  const states = buildStates(model, voltages, operating, options);
  const ledReversedIds = controlled
    .filter((component) => component.type === 'led')
    .filter((component) => states[component.id]?.reverseBiased === true)
    .map((component) => component.id);
  const diodeReversedIds = controlled
    .filter((component) => component.type === 'diode')
    .filter((component) => states[component.id]?.reverseBiased === true)
    .map((component) => component.id);

  let maxSourceCurrent = 0;
  for (const component of model.components) {
    if (!isSourceComponent(component)) {
      continue;
    }

    const state = states[component.id];
    if (state !== undefined) {
      maxSourceCurrent = Math.max(maxSourceCurrent, Math.abs(state.current));
    }
  }

  let shortInfo: ShortCircuitInfo | null = null;
  if (maxSourceCurrent > SHORT_CIRCUIT_CURRENT) {
    const componentIds = model.components
      .filter(
        (component) => !isSourceComponent(component) && component.type !== 'wire',
      )
      .filter((component) => {
        const state = states[component.id];
        if (state === undefined) {
          return false;
        }

        const branchCurrents = Object.values(state.branchCurrents ?? {});
        const current = Math.max(
          Math.abs(state.current),
          ...branchCurrents.map((value) => Math.abs(value)),
        );
        return current > SHORT_CIRCUIT_CURRENT / 2;
      })
      .map((component) => component.id);

    shortInfo = {
      wireIds: [],
      componentIds,
      current: maxSourceCurrent,
    };
  }

  let wireCurrents: Record<string, number> = {};

  if (shortInfo === null) {
    const result = computeWireCurrents(model, states);
    wireCurrents = result.wireCurrents;

    for (const [componentId, current] of Object.entries(result.componentCurrents)) {
      const state = states[componentId];
      if (state !== undefined) {
        state.current = current;
        state.state = Math.abs(current) > ACTIVE_CURRENT ? 'normal' : 'off';
        state.on = true;
      }
    }
  }

  return { states, ledReversedIds, diodeReversedIds, shortInfo, wireCurrents };
}

function assembleSystem(
  model: CircuitModel,
  operating: OperatingPoint,
  options: SolveOptions,
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
    if (component.type === 'relay') {
      const [coilA, coilB, contactA, contactB] =
        EXPECTED_TERMINAL_IDS.relay;

      if (
        coilA === undefined ||
        coilB === undefined ||
        contactA === undefined ||
        contactB === undefined
      ) {
        continue;
      }

      const [coilFirst, coilSecond] = model.nodesForTerminals(component, [
        coilA,
        coilB,
      ]);
      const [contactFirst, contactSecond] = model.nodesForTerminals(component, [
        contactA,
        contactB,
      ]);

      if (coilFirst !== undefined && coilSecond !== undefined) {
        addConductance(1 / component.coilResistance, coilFirst, coilSecond);
      }

      const energized = operating.relayEnergized.get(component.id) === true;
      if (
        relayContactClosed(component, energized) &&
        contactFirst !== undefined &&
        contactSecond !== undefined
      ) {
        addConductance(
          1 / component.contactResistance,
          contactFirst,
          contactSecond,
        );
      }
      continue;
    }

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
      case 'solar': {
        if (first === second) {
          break;
        }
        const conductance = 1 / component.internalResistance;
        addConductance(conductance, first, second);
        addCurrent(
          component.voltage * component.lightLevel * conductance,
          first,
          second,
        );
        break;
      }
      case 'bulb':
      case 'motor':
      case 'buzzer':
      case 'resistor':
      case 'electromagnet':
        addConductance(1 / component.resistance, first, second);
        break;
      case 'ldr': {
        const resistance =
          component.lightResistance +
          (component.darkResistance - component.lightResistance) *
            (1 - component.lightLevel);
        addConductance(1 / resistance, first, second);
        break;
      }
      case 'rheostat':
        addConductance(1 / rheostatResistance(component), first, second);
        break;
      case 'switch':
        if (component.closed) {
          addConductance(1 / component.resistanceWhenClosed, first, second);
        }
        break;
      case 'reed':
        if (reedClosed(component)) {
          addConductance(1 / component.resistanceWhenClosed, first, second);
        }
        break;
      case 'material':
        if (component.conductive) {
          addConductance(1 / component.resistanceWhenConductive, first, second);
        }
        break;
      case 'led':
      case 'diode':
        if (operating.conducting.get(component.id) === true && first !== second) {
          const conductance = 1 / component.resistance;
          addConductance(conductance, first, second);
          addCurrent(component.forwardVoltage * conductance, first, second);
        }
        break;
      case 'capacitor': {
        if (
          options.stepMs === undefined ||
          options.capacitorVoltages === undefined ||
          first === second
        ) {
          break;
        }

        const stepSeconds = options.stepMs / 1000;
        const conductance = component.capacitance / stepSeconds;
        const previous =
          options.capacitorVoltages[component.id] ??
          component.initialVoltage;
        addConductance(conductance, first, second);
        addCurrent(conductance * previous, first, second);
        break;
      }
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
  operating: OperatingPoint,
  options: SolveOptions,
): Record<string, ComponentState> {
  const states = Object.create(null) as Record<string, ComponentState>;
  const context: StateContext = {
    model,
    voltages,
    operating,
    options,
    referenceVoltage: referenceSourceVoltage(model),
  };

  for (const component of model.components) {
    const [first, second] = model.nodesFor(component);
    const voltage = voltages[first]! - voltages[second]!;
    states[component.id] = buildComponentState(component, voltage, context);
  }

  return states;
}

interface StateContext {
  model: CircuitModel;
  voltages: Float64Array;
  operating: OperatingPoint;
  options: SolveOptions;
  referenceVoltage: number;
}

function buildComponentState(
  component: CircuitComponent,
  voltage: number,
  context: StateContext,
): ComponentState {
  switch (component.type) {
    case 'battery':
    case 'solar': {
      const sourceVoltage =
        component.type === 'battery'
          ? component.voltage
          : component.voltage * component.lightLevel;
      const current =
        (sourceVoltage - voltage) / component.internalResistance;
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
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
        power: Math.abs(current * voltage),
        intensity,
        state,
        on: state !== 'off',
        reverseBiased: false,
      };
    }
    case 'led':
    case 'diode': {
      const reverseBiased = voltage < REVERSE_BIAS_VOLTAGE;
      const conducting = context.operating.conducting.get(component.id) === true;
      const current = conducting
        ? (voltage - component.forwardVoltage) / component.resistance
        : 0;

      if (!conducting || current <= 0) {
        return {
          current: 0,
          voltage,
          power: 0,
          intensity: 0,
          state: 'off',
          on: false,
          reverseBiased,
        };
      }

      const nominal =
        component.type === 'led'
          ? NOMINAL_CURRENTS.led
          : NOMINAL_CURRENTS.diode;
      const intensity = current / nominal;
      const state = toQualitativeState(intensity);

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity,
        state,
        on: state !== 'off',
        reverseBiased: false,
      };
    }
    case 'electromagnet': {
      const current = voltage / component.resistance;
      const intensity =
        Math.abs(current) / NOMINAL_CURRENTS.electromagnet;
      const strength = clamp(
        (Math.abs(current) * component.turns) /
          (NOMINAL_CURRENTS.electromagnet * 120),
        0,
        1,
      );
      const state = toQualitativeState(intensity);

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity,
        state,
        on: state !== 'off',
        reverseBiased: false,
        magneticStrength: strength,
      };
    }
    case 'reed': {
      const closed = reedClosed(component);
      const current = closed ? voltage / component.resistanceWhenClosed : 0;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity: 0,
        state:
          closed && Math.abs(current) > ACTIVE_CURRENT ? 'normal' : 'off',
        on: closed,
        reverseBiased: false,
        magnetNear: component.magnetNear,
      };
    }
    case 'relay': {
      const energized = context.operating.relayEnergized.get(component.id) === true;
      const contactClosed = relayContactClosed(component, energized);
      const [contactA, contactB] = context.model.nodesForTerminals(component, [
        'contactA',
        'contactB',
      ]);
      const contactVoltage =
        contactA === undefined || contactB === undefined
          ? 0
          : context.voltages[contactA]! - context.voltages[contactB]!;
      const contactCurrent = contactClosed
        ? contactVoltage / component.contactResistance
        : 0;
      const coilCurrent = voltage / component.coilResistance;

      return {
        current: coilCurrent,
        voltage,
        power: Math.abs(coilCurrent * voltage) + Math.abs(contactCurrent * contactVoltage),
        intensity: Math.abs(coilCurrent) / component.threshold,
        state: contactClosed ? 'normal' : 'off',
        on: contactClosed,
        reverseBiased: false,
        relayClosed: contactClosed,
        branchCurrents: {
          coil: coilCurrent,
          contact: contactCurrent,
        },
      };
    }
    case 'ldr': {
      const resistance =
        component.lightResistance +
        (component.darkResistance - component.lightResistance) *
          (1 - component.lightLevel);
      const current = voltage / resistance;
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity: 0,
        state: on ? 'normal' : 'off',
        on,
        reverseBiased: false,
      };
    }
    case 'capacitor': {
      const previous =
        context.options.capacitorVoltages?.[component.id] ??
        component.initialVoltage;
      const stepSeconds = context.options.stepMs
        ? context.options.stepMs / 1000
        : 0;
      const current =
        stepSeconds > 0
          ? (component.capacitance * (voltage - previous)) / stepSeconds
          : 0;
      const charge = clamp(
        voltage / Math.max(context.referenceVoltage, 1e-9),
        0,
        1,
      );
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity: charge,
        state: on ? 'normal' : 'off',
        on,
        reverseBiased: false,
        charge,
      };
    }
    case 'resistor': {
      const current = voltage / component.resistance;
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
        intensity: 0,
        state: on ? 'normal' : 'off',
        on,
        reverseBiased: false,
      };
    }
    case 'rheostat': {
      const current = voltage / rheostatResistance(component);
      const on = Math.abs(current) > ACTIVE_CURRENT;

      return {
        current,
        voltage,
        power: Math.abs(current * voltage),
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
        power: Math.abs(current * voltage),
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
        power: Math.abs(current * voltage),
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
        power: 0,
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
      power: 0,
      intensity: 0,
      state: 'off',
      on:
        component.type === 'switch'
          ? component.closed
          : component.type === 'reed'
            ? reedClosed(component)
            : component.type === 'relay'
              ? component.closed
              : component.type === 'material'
                ? component.conductive
                : component.type === 'wire',
      reverseBiased: false,
      ...(component.type === 'reed'
        ? { magnetNear: component.magnetNear }
        : {}),
      ...(component.type === 'relay'
        ? { relayClosed: component.closed }
        : {}),
      ...(component.type === 'capacitor'
        ? {
            charge: clamp(
              component.initialVoltage / 4.5,
              0,
              1,
            ),
          }
        : {}),
    };
  }

  return states;
}

function isControlledComponent(
  component: CircuitComponent,
): component is LedComponent | DiodeComponent {
  return component.type === 'led' || component.type === 'diode';
}

function isRelayComponent(component: CircuitComponent): component is RelayComponent {
  return component.type === 'relay';
}

function isSourceComponent(
  component: CircuitComponent,
): component is BatteryComponent | SolarComponent {
  return component.type === 'battery' || component.type === 'solar';
}

function reedClosed(component: CircuitComponent & { type: 'reed' }): boolean {
  return component.normallyOpen ? component.magnetNear : !component.magnetNear;
}

function relayContactClosed(
  component: RelayComponent,
  energized: boolean,
): boolean {
  return component.normallyClosed ? !energized : energized;
}

function initialRelayEnergized(relay: RelayComponent): boolean {
  return relay.normallyClosed ? !relay.closed : relay.closed;
}

function referenceSourceVoltage(model: CircuitModel): number {
  let voltage = 1;

  for (const component of model.components) {
    if (component.type === 'battery') {
      voltage = Math.max(voltage, component.voltage);
    } else if (component.type === 'solar') {
      voltage = Math.max(voltage, component.voltage * component.lightLevel);
    } else if (component.type === 'capacitor') {
      voltage = Math.max(voltage, component.initialVoltage);
    }
  }

  return voltage;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
