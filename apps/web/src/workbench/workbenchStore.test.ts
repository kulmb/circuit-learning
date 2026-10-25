import { getLevelById } from '@circuits/shared/levels';
import { beforeEach, describe, expect, it } from 'vitest';

import { createSandboxStarter } from './sandbox';
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

  it('inserts a component on a wire and keeps the current direction', () => {
    store().addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: 'bulb-1', terminalId: 'a' },
    );

    store().addComponentOnWire(
      'switch',
      { closed: true },
      { x: 5, y: 4 },
      'switch',
      'wire-1',
      0,
    );

    const state = store();
    const added = state.circuit.components.find(
      (component) => component.type === 'switch',
    );

    expect(added).toBeDefined();
    if (added === undefined) {
      throw new Error('Switch was not inserted');
    }
    expect(state.circuit.wires).toHaveLength(2);
    expect(
      state.circuit.wires.some((wire) => wire.id === 'wire-1'),
    ).toBe(false);

    const incoming = state.circuit.wires.find(
      (wire) =>
        wire.from.componentId === 'battery-1' &&
        wire.to.componentId === added.id,
    );
    const outgoing = state.circuit.wires.find(
      (wire) =>
        wire.from.componentId === added.id &&
        wire.to.componentId === 'bulb-1',
    );

    expect(incoming?.to.terminalId).toBe('a');
    expect(outgoing?.from.terminalId).toBe('b');
    expect(state.selected).toEqual({ kind: 'component', id: added.id });

    store().undo();

    expect(store().circuit.components).toHaveLength(2);
    expect(store().circuit.wires).toHaveLength(1);
  });

  it('ignores an insert when the palette count is exhausted', () => {
    const level = getLevelById('light-05');
    if (level === undefined) {
      throw new Error('Level missing');
    }

    store().loadLevel(level);
    store().addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: 'bulb-1', terminalId: 'a' },
    );
    const firstWireId = store().circuit.wires[0]?.id;
    if (firstWireId === undefined) {
      throw new Error('Wire missing');
    }

    store().addComponentOnWire('bulb', {}, { x: 4, y: 4 }, 'bulb', firstWireId, 0);
    expect(store().availableCounts?.['bulb']).toBe(0);

    store().addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: 'bulb-1', terminalId: 'a' },
    );
    const wires = store().circuit.wires;
    const secondWireId = wires[wires.length - 1]?.id;
    if (secondWireId === undefined) {
      throw new Error('Second wire missing');
    }

    const wireCount = store().circuit.wires.length;
    const componentCount = store().circuit.components.length;
    store().addComponentOnWire(
      'bulb',
      {},
      { x: 4, y: 4 },
      'bulb',
      secondWireId,
      0,
    );

    expect(store().circuit.wires).toHaveLength(wireCount);
    expect(store().circuit.components).toHaveLength(componentCount);
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

  it('cycles through the three display modes', () => {
    expect(store().displayMode).toBe('realistic');

    store().cycleDisplayMode();
    expect(store().displayMode).toBe('symbol');

    store().cycleDisplayMode();
    expect(store().displayMode).toBe('overlay');

    store().cycleDisplayMode();
    expect(store().displayMode).toBe('realistic');

    store().setDisplayMode('overlay');
    expect(store().displayMode).toBe('overlay');
  });

  it('loads a level with locked components and no free palette', () => {
    const level = getLevelById('light-01');
    expect(level).toBeDefined();
    if (!level) throw new Error('Level missing');

    store().loadLevel(level);

    expect(store().levelId).toBe('light-01');
    expect(store().circuit.components).toHaveLength(2);
    expect(store().lockedComponentIds).toEqual(['battery-1', 'bulb-1']);
    expect(store().availableCounts).toEqual({});
    expect(store().displayMode).toBe('realistic');

    store().moveComponent('battery-1', { x: 8, y: 8 });
    store().rotateComponent('battery-1');
    store().select({ kind: 'component', id: 'battery-1' });
    store().deleteSelection();

    const battery = store().circuit.components.find(
      (component) => component.id === 'battery-1',
    );
    expect(battery?.position).toEqual({ x: 3, y: 4 });
    expect(battery?.rotation).toBe(0);

    store().addComponent('bulb', {}, { x: 5, y: 5 });
    expect(store().circuit.components).toHaveLength(2);
  });

  it('enforces palette counts in a level and restores them with undo', () => {
    const level = getLevelById('light-05');
    expect(level).toBeDefined();
    if (!level) throw new Error('Level missing');

    store().loadLevel(level);
    expect(store().availableCounts).toEqual({ bulb: 1 });

    store().addComponent('bulb', {}, { x: 9, y: 4 });
    expect(store().circuit.components).toHaveLength(2);

    store().addComponent('bulb', {}, { x: 9, y: 4 }, 'bulb');
    expect(store().circuit.components).toHaveLength(3);
    expect(store().availableCounts).toEqual({ bulb: 0 });

    store().addComponent('bulb', {}, { x: 10, y: 4 }, 'bulb');
    expect(store().circuit.components).toHaveLength(3);

    store().undo();
    expect(store().circuit.components).toHaveLength(2);
    expect(store().availableCounts).toEqual({ bulb: 1 });
  });

  it('allows a locked switch to be toggled', () => {
    const level = getLevelById('light-03');
    expect(level).toBeDefined();
    if (!level) throw new Error('Level missing');

    store().loadLevel(level);
    expect(store().lockedComponentIds).toContain('switch-1');

    store().toggleSwitch('switch-1');

    const switchComponent = store().circuit.components.find(
      (component) => component.id === 'switch-1',
    );
    expect(switchComponent?.type === 'switch' ? switchComponent.closed : null).toBe(
      true,
    );
  });

  it('uses deterministic ids for the final level components', () => {
    const level = getLevelById('light-10');
    expect(level).toBeDefined();
    if (!level) throw new Error('Level missing');

    store().loadLevel(level);
    store().addComponent('switch', {}, { x: 4, y: 2 }, 'switch');
    store().addComponent('switch', {}, { x: 6, y: 2 }, 'switch');
    store().addComponent('motor', {}, { x: 4, y: 6 }, 'motor');
    store().addComponent('bulb', {}, { x: 8, y: 6 }, 'bulb');

    const ids = store().circuit.components.map((component) => component.id);
    expect(ids).toEqual(
      expect.arrayContaining(['switch-1', 'switch-2', 'motor-1', 'bulb-1']),
    );
    expect(store().availableCounts).toEqual({
      switch: 0,
      motor: 0,
      bulb: 0,
    });
  });

  it('creates unique ids for new components', () => {
    store().addComponent('bulb', {}, { x: 2, y: 2 });
    store().addComponent('bulb', {}, { x: 4, y: 2 });

    const ids = store().circuit.components.map((component) => component.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('bulb-2');
    expect(ids).toContain('bulb-3');
  });

  it('loads a sandbox without counts or locked components', () => {
    const work = {
      id: 'sandbox-1',
      name: 'Mon circuit 1',
      updatedAt: 1000,
    };

    store().loadSandboxCircuit(createSandboxStarter(), work, 'guest');

    expect(store().sandboxActive).toBe(true);
    expect(store().levelId).toBeNull();
    expect(store().availableCounts).toBeNull();
    expect(store().lockedComponentIds).toEqual([]);
    expect(store().sandboxWork).toEqual(work);

    store().addComponent('bulb', {}, { x: 5, y: 2 }, 'bulb');
    store().addComponent('bulb', {}, { x: 6, y: 2 }, 'bulb');
    store().addComponent('bulb', {}, { x: 7, y: 2 }, 'bulb');

    expect(store().circuit.components).toHaveLength(5);
    expect(store().availableCounts).toBeNull();

    store().clearSandboxCircuit();

    expect(store().circuit.components).toHaveLength(0);
    expect(store().sandboxWork).toBeNull();
    expect(store().sandboxActive).toBe(true);
  });

  it('leaves the sandbox when a level starts', () => {
    store().loadSandboxCircuit(createSandboxStarter(), null, 'guest');
    expect(store().sandboxActive).toBe(true);

    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');
    store().loadLevel(level);

    expect(store().sandboxActive).toBe(false);
    expect(store().sandboxWork).toBeNull();
    expect(store().sandboxSavedFingerprint).toBeNull();
  });
});
