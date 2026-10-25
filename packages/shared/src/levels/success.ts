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
import type { LevelDefinition, SuccessCondition } from './types';

export function evaluateLevelSuccess(
  level: LevelDefinition,
  circuit: Circuit,
  simulation: CircuitSimulation,
): boolean {
  return level.success.every((condition) =>
    evaluateCondition(condition, circuit, simulation),
  );
}

function evaluateCondition(
  condition: SuccessCondition,
  circuit: Circuit,
  simulation: CircuitSimulation,
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
