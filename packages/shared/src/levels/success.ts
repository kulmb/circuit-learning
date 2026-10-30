import type {
  Circuit,
  CircuitComponent,
  CircuitSimulation,
  ComponentState,
} from '../circuit';
import { cloneComponent } from '../circuit/components';
import { cloneWire } from '../circuit/components';
import { simulateCircuit } from '../circuit/simulate';
import { areInParallel, areInSeries } from '../circuit/topology';
import type { LevelRuntime } from './runtime';
import type { LevelDefinition, SuccessCondition } from './types';

export function evaluateLevelSuccess(
  level: LevelDefinition,
  circuit: Circuit,
  simulation: CircuitSimulation,
  runtime?: LevelRuntime,
): boolean {
  return level.success.every((condition) =>
    evaluateCondition(condition, circuit, simulation, runtime),
  );
}

function evaluateCondition(
  condition: SuccessCondition,
  circuit: Circuit,
  simulation: CircuitSimulation,
  runtime: LevelRuntime | undefined,
): boolean {
  switch (condition.type) {
    case 'circuit_ok':
      return simulation.ok;
    case 'component_on': {
      const state = simulation.states[condition.componentId];
      return state !== undefined && state.on;
    }
    case 'component_off': {
      const state = simulation.states[condition.componentId];
      return state !== undefined && state.state === 'off';
    }
    case 'component_state':
      return simulation.states[condition.componentId]?.state === condition.state;
    case 'switch_closed':
      return isSwitchClosed(circuit, condition.componentId);
    case 'switch_isolates':
      return switchIsolates(
        circuit,
        condition.switchId,
        condition.onComponentId,
        condition.unaffectedComponentId,
      );
    case 'switch_cuts':
      return switchCuts(circuit, condition.switchId, condition.componentIds);
    case 'components_series':
      return areInSeries(
        circuit,
        condition.componentIds[0],
        condition.componentIds[1],
      );
    case 'components_parallel':
      return areInParallel(
        circuit,
        condition.componentIds[0],
        condition.componentIds[1],
      );
    case 'brighter_than':
      return isBrighterThan(
        circuit,
        simulation,
        condition.componentId,
        condition.thanComponentId,
      );
    case 'capacitor_filled': {
      const state = simulation.states[condition.componentId];
      return (
        runtime?.capacitorFilled[condition.componentId] === true ||
        (state?.charge ?? 0) >= 0.8
      );
    }
    case 'capacitor_empty': {
      const state = simulation.states[condition.componentId];
      return (
        runtime?.capacitorEmpty[condition.componentId] === true ||
        (state?.charge ?? 1) <= 0.15
      );
    }
    case 'lamp_stays_on_after_open':
      return (
        runtime !== undefined &&
        runtime.maxLampOnAfterOpenMs >= condition.minDurationMs
      );
    case 'flash_seen':
      return runtime?.flashSeen[condition.componentId] === true;
    case 'magnet_attracts': {
      const strength =
        simulation.states[condition.componentId]?.magneticStrength ?? 0;
      return condition.amount === 'all' ? strength >= 0.75 : strength > 0.1;
    }
    case 'reed_state':
      return simulation.states[condition.componentId]?.on === condition.closed;
    case 'reed_controls': {
      const near = simulateCircuit(withReedMagnet(circuit, condition.reedId, true));
      const far = simulateCircuit(withReedMagnet(circuit, condition.reedId, false));

      return (
        near.states[condition.componentId]?.state === condition.stateNear &&
        far.states[condition.componentId]?.state === condition.stateFar
      );
    }
    case 'relay_state':
      return (
        simulation.states[condition.componentId]?.relayClosed ===
        condition.closed
      );
    case 'relay_controls': {
      const state = simulation.states[condition.relayId];
      const target = simulation.states[condition.componentId];
      if (state === undefined || target === undefined) {
        return false;
      }

      return state.relayClosed === true
        ? target.state === condition.stateOn
        : target.state === condition.stateOff;
    }
    case 'light_response': {
      const lit = simulateCircuit(withLightLevel(circuit, 1));
      const dark = simulateCircuit(withLightLevel(circuit, 0));

      return (
        lit.states[condition.componentId]?.state === condition.litState &&
        dark.states[condition.componentId]?.state === condition.darkState
      );
    }
    case 'diode_conducts': {
      const state = simulation.states[condition.componentId];
      return state !== undefined && state.on && !state.reverseBiased;
    }
    case 'diode_blocks': {
      const state = simulation.states[condition.componentId];
      return state !== undefined && (!state.on || state.reverseBiased);
    }
    case 'every_source_powers':
      return everySourcePowers(circuit, condition.componentId);
  }
}

function isSwitchClosed(circuit: Circuit, componentId: string): boolean {
  const component = circuit.components.find((item) => item.id === componentId);
  return component?.type === 'switch' && component.closed;
}

function switchIsolates(
  circuit: Circuit,
  switchId: string,
  onComponentId: string,
  unaffectedComponentId: string,
): boolean {
  const open = simulateCircuit(withSwitchState(circuit, switchId, false));
  const closed = simulateCircuit(withSwitchState(circuit, switchId, true));

  const affectedOpen = open.states[onComponentId];
  const affectedClosed = closed.states[onComponentId];
  const unaffectedOpen = open.states[unaffectedComponentId];
  const unaffectedClosed = closed.states[unaffectedComponentId];

  return (
    open.ok &&
    closed.ok &&
    affectedOpen !== undefined &&
    affectedOpen.state === 'off' &&
    affectedClosed !== undefined &&
    affectedClosed.state !== 'off' &&
    unaffectedOpen !== undefined &&
    unaffectedOpen.state !== 'off' &&
    unaffectedClosed !== undefined &&
    unaffectedClosed.state !== 'off'
  );
}

function switchCuts(
  circuit: Circuit,
  switchId: string,
  componentIds: string[],
): boolean {
  const switchComponent = circuit.components.find(
    (component) => component.id === switchId,
  );

  if (switchComponent?.type !== 'switch' || componentIds.length === 0) {
    return false;
  }

  const open = simulateCircuit(withSwitchState(circuit, switchId, false));
  const closed = simulateCircuit(withSwitchState(circuit, switchId, true));

  return (
    closed.ok &&
    componentIds.every((componentId) => {
      const openState = open.states[componentId];
      const closedState = closed.states[componentId];

      return (
        openState !== undefined &&
        openState.state === 'off' &&
        closedState !== undefined &&
        closedState.state !== 'off'
      );
    })
  );
}

function isBrighterThan(
  circuit: Circuit,
  simulation: CircuitSimulation,
  componentId: string,
  thanComponentId: string,
): boolean {
  const component = circuit.components.find(
    (item) => item.id === componentId,
  );
  const other = circuit.components.find(
    (item) => item.id === thanComponentId,
  );
  const state = simulation.states[componentId];
  const otherState = simulation.states[thanComponentId];

  if (
    component === undefined ||
    other === undefined ||
    state === undefined ||
    otherState === undefined ||
    !state.on ||
    !otherState.on
  ) {
    return false;
  }

  const value = outputIntensity(component, state);
  const otherValue = outputIntensity(other, otherState);

  return value > otherValue * 1.25;
}

function outputIntensity(
  component: CircuitComponent,
  state: ComponentState,
): number {
  switch (component.type) {
    case 'bulb':
    case 'motor':
    case 'buzzer':
    case 'led':
      return state.intensity;
    default:
      return state.power;
  }
}

function withSwitchState(circuit: Circuit, switchId: string, closed: boolean): Circuit {
  const components = circuit.components.map((component) => {
    const clone = cloneComponent(component);

    if (clone.id === switchId && clone.type === 'switch') {
      clone.closed = closed;
    }

    return clone as CircuitComponent;
  });

  return {
    components,
    wires: circuit.wires.map(cloneWire),
  };
}

function withLightLevel(circuit: Circuit, lightLevel: number): Circuit {
  const components = circuit.components.map((component) => {
    const clone = cloneComponent(component);

    if (clone.type === 'ldr' || clone.type === 'solar') {
      clone.lightLevel = lightLevel;
    }

    return clone as CircuitComponent;
  });

  return {
    components,
    wires: circuit.wires.map(cloneWire),
  };
}

function withReedMagnet(
  circuit: Circuit,
  reedId: string,
  magnetNear: boolean,
): Circuit {
  const components = circuit.components.map((component) => {
    const clone = cloneComponent(component);

    if (clone.id === reedId && clone.type === 'reed') {
      clone.magnetNear = magnetNear;
    }

    return clone as CircuitComponent;
  });

  return {
    components,
    wires: circuit.wires.map(cloneWire),
  };
}

function everySourcePowers(circuit: Circuit, componentId: string): boolean {
  const sources = circuit.components.filter(
    (component) => component.type === 'battery' || component.type === 'solar',
  );

  if (sources.length === 0) {
    return false;
  }

  return sources.every((source) => {
    const simulation = simulateCircuit(withoutOtherSources(circuit, source.id));
    return simulation.states[componentId]?.on === true;
  });
}

function withoutOtherSources(circuit: Circuit, keepId: string): Circuit {
  const removed = new Set(
    circuit.components
      .filter(
        (component) =>
          (component.type === 'battery' || component.type === 'solar') &&
          component.id !== keepId,
      )
      .map((component) => component.id),
  );

  return {
    components: circuit.components
      .filter((component) => !removed.has(component.id))
      .map(cloneComponent),
    wires: circuit.wires
      .filter(
        (wire) =>
          !removed.has(wire.from.componentId) && !removed.has(wire.to.componentId),
      )
      .map(cloneWire),
  };
}
