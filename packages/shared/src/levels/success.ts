import type { Circuit, CircuitComponent, CircuitSimulation } from '../circuit';
import { cloneComponent } from '../circuit/components';
import { cloneWire } from '../circuit/components';
import { simulateCircuit } from '../circuit/simulate';
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
