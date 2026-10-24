import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkbenchStore } from './workbenchStore';

function store() {
  return useWorkbenchStore.getState();
}

function connectBulb() {
  store().addWire(
    { componentId: 'battery-1', terminalId: 'positive' },
    { componentId: 'bulb-1', terminalId: 'a' },
  );
  store().addWire(
    { componentId: 'bulb-1', terminalId: 'b' },
    { componentId: 'battery-1', terminalId: 'negative' },
  );
}

describe('workbench store', () => {
  beforeEach(() => {
    store().resetWorkbench();
  });

  it('starts with a battery and a bulb but no wire', () => {
    const state = store();

    expect(state.circuit.components).toHaveLength(2);
    expect(state.circuit.wires).toHaveLength(0);
    expect(state.simulation.openCircuit).toBe(true);
    expect(state.history).toHaveLength(0);
  });

  it('connects the starter components and recomputes the simulation', () => {
    connectBulb();

    const state = store();

    expect(state.circuit.wires).toHaveLength(2);
    expect(state.simulation.closed).toBe(true);
    expect(state.simulation.ok).toBe(true);
    expect(state.simulation.states['bulb-1']?.state).toBe('normal');
    expect(state.history).toHaveLength(2);

    store().undo();
    expect(store().circuit.wires).toHaveLength(1);
    expect(store().simulation.openCircuit).toBe(true);

    store().undo();
    expect(store().circuit.wires).toHaveLength(0);
  });

  it('adds, toggles and undoes a switch', () => {
    store().addComponent('switch', { closed: false }, { x: 5, y: 2 });

    const switchComponent = store().circuit.components.find(
      (component) => component.type === 'switch',
    );
    expect(switchComponent).toBeDefined();
    if (!switchComponent) {
      throw new Error('Switch was not added');
    }

    store().toggleSwitch(switchComponent.id);

    const toggled = store().circuit.components.find(
      (component) => component.id === switchComponent.id,
    );
    expect(toggled?.type === 'switch' ? toggled.closed : null).toBe(true);

    store().undo();

    const restored = store().circuit.components.find(
      (component) => component.id === switchComponent.id,
    );
    expect(restored?.type === 'switch' ? restored.closed : null).toBe(false);
  });

  it('deletes a component with its wires and restores them with undo', () => {
    connectBulb();
    store().select({ kind: 'component', id: 'bulb-1' });
    store().deleteSelection();

    expect(
      store().circuit.components.some((component) => component.id === 'bulb-1'),
    ).toBe(false);
    expect(store().circuit.wires).toHaveLength(0);

    store().undo();

    expect(
      store().circuit.components.some((component) => component.id === 'bulb-1'),
    ).toBe(true);
    expect(store().circuit.wires).toHaveLength(2);
  });

  it('rotates a component by 90 degrees and undoes it', () => {
    store().rotateComponent('bulb-1');

    expect(
      store().circuit.components.find((component) => component.id === 'bulb-1')
        ?.rotation,
    ).toBe(90);

    store().undo();

    expect(
      store().circuit.components.find((component) => component.id === 'bulb-1')
        ?.rotation,
    ).toBe(0);
  });

  it('ignores a duplicate wire', () => {
    store().addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: 'bulb-1', terminalId: 'a' },
    );
    const historyLength = store().history.length;

    store().addWire(
      { componentId: 'bulb-1', terminalId: 'a' },
      { componentId: 'battery-1', terminalId: 'positive' },
    );

    expect(store().circuit.wires).toHaveLength(1);
    expect(store().history).toHaveLength(historyLength);
  });

  it('creates unique ids for new components', () => {
    store().addComponent('bulb', {}, { x: 2, y: 2 });
    store().addComponent('bulb', {}, { x: 4, y: 2 });

    const ids = store().circuit.components.map((component) => component.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('bulb-2');
    expect(ids).toContain('bulb-3');
  });
});
