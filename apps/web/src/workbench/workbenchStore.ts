import {
  cloneComponent,
  cloneWire,
  createComponent,
  createWire,
  deserializeCircuit,
  serializeCircuit,
  simulateCircuit,
  type Circuit,
  type CircuitComponent,
  type CircuitDocument,
  type CircuitSimulation,
  type ComponentType,
  type CreateComponentOptions,
  type Rotation,
  type TerminalRef,
  type Vec2,
  type Wire,
} from '@circuits/shared';
import type {
  LevelAvailableComponent,
  LevelDefinition,
} from '@circuits/shared/levels';
import { create } from 'zustand';

import { nextDisplayMode, type DisplayMode } from './displayMode';
import type { SandboxWorkMeta } from './sandbox';

export type ComponentOptions = Omit<CreateComponentOptions, 'id' | 'position'>;

export interface Selection {
  kind: 'component' | 'wire';
  id: string;
}

interface CircuitSnapshot {
  components: CircuitComponent[];
  wires: Wire[];
  availableCounts: Record<string, number> | null;
}

const HISTORY_LIMIT = 50;

export interface WorkbenchState {
  circuit: Circuit;
  simulation: CircuitSimulation;
  selected: Selection | null;
  pendingTerminal: TerminalRef | null;
  displayMode: DisplayMode;
  levelId: string | null;
  lockedComponentIds: string[];
  availableCounts: Record<string, number> | null;
  availableOffers: readonly LevelAvailableComponent[];
  history: CircuitSnapshot[];
  sandboxActive: boolean;
  sandboxOwnerKey: string | null;
  sandboxWork: SandboxWorkMeta | null;
  sandboxSavedFingerprint: string | null;
  loadLevel: (level: LevelDefinition) => void;
  loadSandboxCircuit: (
    document: CircuitDocument,
    work: SandboxWorkMeta | null,
    ownerKey: string,
  ) => void;
  markSandboxSaved: (work: SandboxWorkMeta, fingerprint: string) => void;
  clearSandboxCircuit: () => void;
  addComponent: (
    type: ComponentType,
    options: ComponentOptions,
    position: Vec2,
    paletteKey?: string,
  ) => void;
  addComponentOnWire: (
    type: ComponentType,
    options: ComponentOptions,
    position: Vec2,
    paletteKey: string | undefined,
    wireId: string,
    rotation: Rotation,
  ) => void;
  moveComponent: (componentId: string, position: Vec2) => void;
  rotateComponent: (componentId: string) => void;
  toggleSwitch: (componentId: string) => void;
  setRheostatWiper: (
    componentId: string,
    wiperPosition: number,
    recordHistory: boolean,
  ) => void;
  setLightLevel: (lightLevel: number) => void;
  setReedMagnet: (componentId: string, magnetNear: boolean) => void;
  deleteComponent: (componentId: string) => void;
  deleteSelection: () => void;
  addWire: (from: TerminalRef, to: TerminalRef) => void;
  select: (selection: Selection | null) => void;
  setPendingTerminal: (ref: TerminalRef | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  cycleDisplayMode: () => void;
  undo: () => void;
  resetWorkbench: () => void;
}

const initialCircuit = createInitialCircuit();

export const useWorkbenchStore = create<WorkbenchState>()((set, get) => ({
  circuit: initialCircuit,
  simulation: simulateCircuit(initialCircuit),
  selected: null,
  pendingTerminal: null,
  displayMode: 'realistic',
  levelId: null,
  lockedComponentIds: [],
  availableCounts: null,
  availableOffers: [],
  history: [],
  sandboxActive: false,
  sandboxOwnerKey: null,
  sandboxWork: null,
  sandboxSavedFingerprint: null,

  loadLevel(level) {
    const circuit: Circuit = {
      components: level.preplacedComponents.map((entry) =>
        cloneComponent(entry.component),
      ),
      wires: level.preplacedWires.map(cloneWire),
    };
    const availableCounts = Object.fromEntries(
      level.availableComponents.map((entry) => [entry.key, entry.count]),
    );

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      selected: null,
      pendingTerminal: null,
      displayMode: level.displayMode,
      levelId: level.id,
      lockedComponentIds: level.preplacedComponents
        .filter((entry) => entry.locked)
        .map((entry) => entry.component.id),
      availableCounts,
      availableOffers: level.availableComponents,
      history: [],
      sandboxActive: false,
      sandboxOwnerKey: null,
      sandboxWork: null,
      sandboxSavedFingerprint: null,
    });
  },

  loadSandboxCircuit(document, work, ownerKey) {
    const circuit = deserializeCircuit(document);
    const fingerprint = JSON.stringify(serializeCircuit(circuit));

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      selected: null,
      pendingTerminal: null,
      displayMode: 'realistic',
      levelId: null,
      lockedComponentIds: [],
      availableCounts: null,
      availableOffers: [],
      history: [],
      sandboxActive: true,
      sandboxOwnerKey: ownerKey,
      sandboxWork: work,
      sandboxSavedFingerprint: fingerprint,
    });
  },

  markSandboxSaved(work, fingerprint) {
    set({
      sandboxWork: work,
      sandboxSavedFingerprint: fingerprint,
    });
  },

  clearSandboxCircuit() {
    const circuit: Circuit = { components: [], wires: [] };

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      selected: null,
      pendingTerminal: null,
      levelId: null,
      lockedComponentIds: [],
      availableCounts: null,
      availableOffers: [],
      history: [],
      sandboxActive: true,
      sandboxWork: null,
      sandboxSavedFingerprint: JSON.stringify(serializeCircuit(circuit)),
    });
  },

  addComponent(type, options, position, paletteKey) {
    const state = get();

    if (state.availableCounts !== null) {
      if (paletteKey === undefined) {
        return;
      }

      const remaining = state.availableCounts[paletteKey] ?? 0;
      if (remaining <= 0) {
        return;
      }
    }

    const id = nextId(type, state.circuit);
    const component = createComponent(type, { id, position, ...options });
    const circuit: Circuit = {
      components: [...state.circuit.components, component],
      wires: state.circuit.wires,
    };
    const availableCounts =
      state.availableCounts !== null && paletteKey !== undefined
        ? {
            ...state.availableCounts,
            [paletteKey]: (state.availableCounts[paletteKey] ?? 0) - 1,
          }
        : state.availableCounts;

    set({
      ...nextCircuitState(state, circuit, availableCounts),
      selected: { kind: 'component', id },
      pendingTerminal: null,
    });
  },

  addComponentOnWire(type, options, position, paletteKey, wireId, rotation) {
    const state = get();

    if (state.availableCounts !== null) {
      if (paletteKey === undefined) {
        return;
      }

      const remaining = state.availableCounts[paletteKey] ?? 0;
      if (remaining <= 0) {
        return;
      }
    }

    const targetWire = state.circuit.wires.find((wire) => wire.id === wireId);
    if (targetWire === undefined) {
      return;
    }

    const id = nextId(type, state.circuit);
    const component = createComponent(type, {
      id,
      position,
      rotation,
      ...options,
    });

    if (component.terminals.length !== 2) {
      return;
    }

    const firstTerminal = component.terminals[0];
    const secondTerminal = component.terminals[1];

    if (firstTerminal === undefined || secondTerminal === undefined) {
      return;
    }

    // Both new wires keep the original from → to direction, so the current
    // animation keeps flowing the same way through the inserted component.
    const used = collectIds(state.circuit);
    used.add(id);
    const incoming = createWire(
      nextIdFrom(used, 'wire'),
      targetWire.from,
      { componentId: id, terminalId: firstTerminal.id },
    );
    const outgoing = createWire(
      nextIdFrom(used, 'wire'),
      { componentId: id, terminalId: secondTerminal.id },
      targetWire.to,
    );
    const circuit: Circuit = {
      components: [...state.circuit.components, component],
      wires: [
        ...state.circuit.wires.filter((wire) => wire.id !== wireId),
        incoming,
        outgoing,
      ],
    };
    const availableCounts =
      state.availableCounts !== null && paletteKey !== undefined
        ? {
            ...state.availableCounts,
            [paletteKey]: (state.availableCounts[paletteKey] ?? 0) - 1,
          }
        : state.availableCounts;

    set({
      ...nextCircuitState(state, circuit, availableCounts),
      selected: { kind: 'component', id },
      pendingTerminal: null,
    });
  },

  moveComponent(componentId, position) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (
      target === undefined ||
      state.lockedComponentIds.includes(target.id) ||
      (target.position.x === position.x && target.position.y === position.y)
    ) {
      return;
    }

    const components = state.circuit.components.map((component) => {
      if (component.id !== componentId) {
        return component;
      }

      const moved = cloneComponent(component);
      moved.position = { ...position };
      return moved;
    });

    set({
      ...nextCircuitState(state, { components, wires: state.circuit.wires }),
      pendingTerminal: null,
    });
  },

  rotateComponent(componentId) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (target === undefined || state.lockedComponentIds.includes(target.id)) {
      return;
    }

    const components = state.circuit.components.map((component) => {
      if (component.id !== componentId) {
        return component;
      }

      const rotated = cloneComponent(component);
      rotated.rotation = nextRotation(rotated.rotation);
      return rotated;
    });

    set({
      ...nextCircuitState(state, { components, wires: state.circuit.wires }),
      pendingTerminal: null,
    });
  },

  toggleSwitch(componentId) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (target?.type !== 'switch') {
      return;
    }

    const components = state.circuit.components.map((component) =>
      component.id === componentId && component.type === 'switch'
        ? { ...component, closed: !component.closed }
        : component,
    );

    set({
      ...nextCircuitState(state, { components, wires: state.circuit.wires }),
      selected: { kind: 'component', id: componentId },
      pendingTerminal: null,
    });
  },

  setRheostatWiper(componentId, wiperPosition, recordHistory) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (target?.type !== 'rheostat') {
      return;
    }

    const clamped = Math.min(1, Math.max(0, wiperPosition));

    if (Math.abs(target.wiperPosition - clamped) < 1e-9) {
      return;
    }

    const components = state.circuit.components.map((component) =>
      component.id === componentId && component.type === 'rheostat'
        ? { ...component, wiperPosition: clamped }
        : component,
    );
    const circuit: Circuit = { components, wires: state.circuit.wires };
    const selection = { kind: 'component' as const, id: componentId };

    if (recordHistory) {
      set({
        ...nextCircuitState(state, circuit),
        selected: selection,
        pendingTerminal: null,
      });
      return;
    }

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      selected: selection,
      pendingTerminal: null,
    });
  },

  setLightLevel(lightLevel) {
    const state = get();
    const clamped = Math.min(1, Math.max(0, lightLevel));
    const components = state.circuit.components.map((component) => {
      if (component.type !== 'ldr' && component.type !== 'solar') {
        return component;
      }

      return { ...component, lightLevel: clamped };
    });
    const circuit: Circuit = { components, wires: state.circuit.wires };

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      pendingTerminal: null,
    });
  },

  setReedMagnet(componentId, magnetNear) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (target?.type !== 'reed' || target.magnetNear === magnetNear) {
      return;
    }

    const components = state.circuit.components.map((component) =>
      component.id === componentId && component.type === 'reed'
        ? { ...component, magnetNear }
        : component,
    );
    const circuit: Circuit = { components, wires: state.circuit.wires };

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      pendingTerminal: null,
    });
  },

  deleteComponent(componentId) {
    const state = get();
    const target = state.circuit.components.find(
      (component) => component.id === componentId,
    );

    if (target === undefined || state.lockedComponentIds.includes(target.id)) {
      return;
    }

    const components = state.circuit.components.filter(
      (component) => component.id !== componentId,
    );
    const wires = state.circuit.wires.filter(
      (wire) =>
        wire.from.componentId !== componentId && wire.to.componentId !== componentId,
    );
    const availableCounts = restoredAvailableCounts(state, target);

    set({
      ...nextCircuitState(state, { components, wires }, availableCounts),
      selected: null,
      pendingTerminal:
        state.pendingTerminal?.componentId === componentId
          ? null
          : state.pendingTerminal,
    });
  },

  deleteSelection() {
    const state = get();
    const selection = state.selected;

    if (selection === null) {
      return;
    }

    if (selection.kind === 'wire') {
      const wires = state.circuit.wires.filter((wire) => wire.id !== selection.id);

      set({
        ...nextCircuitState(state, {
          components: state.circuit.components,
          wires,
        }),
        selected: null,
        pendingTerminal: null,
      });
      return;
    }

    if (state.lockedComponentIds.includes(selection.id)) {
      return;
    }

    const target = state.circuit.components.find(
      (component) => component.id === selection.id,
    );

    if (target === undefined) {
      return;
    }

    const components = state.circuit.components.filter(
      (component) => component.id !== selection.id,
    );
    const wires = state.circuit.wires.filter(
      (wire) =>
        wire.from.componentId !== selection.id && wire.to.componentId !== selection.id,
    );
    const availableCounts = restoredAvailableCounts(state, target);

    set({
      ...nextCircuitState(state, { components, wires }, availableCounts),
      selected: null,
      pendingTerminal: null,
    });
  },

  addWire(from, to) {
    const state = get();

    if (sameRef(from, to)) {
      set({ pendingTerminal: null });
      return;
    }

    const alreadyExists = state.circuit.wires.some(
      (wire) =>
        (sameRef(wire.from, from) && sameRef(wire.to, to)) ||
        (sameRef(wire.from, to) && sameRef(wire.to, from)),
    );

    if (alreadyExists) {
      set({ pendingTerminal: null });
      return;
    }

    const hasFrom = terminalExists(state.circuit, from);
    const hasTo = terminalExists(state.circuit, to);

    if (!hasFrom || !hasTo) {
      set({ pendingTerminal: null });
      return;
    }

    const wire = createWire(nextId('wire', state.circuit), from, to);
    const circuit: Circuit = {
      components: state.circuit.components,
      wires: [...state.circuit.wires, wire],
    };

    set({
      ...nextCircuitState(state, circuit),
      selected: null,
      pendingTerminal: null,
    });
  },

  select(selection) {
    const current = get().selected;

    if (sameSelection(current, selection)) {
      return;
    }

    set({ selected: selection });
  },

  setPendingTerminal(ref) {
    const current = get().pendingTerminal;

    if (sameRefOrNull(current, ref)) {
      return;
    }

    set({ pendingTerminal: ref });
  },

  setDisplayMode(mode) {
    if (get().displayMode === mode) {
      return;
    }

    set({ displayMode: mode });
  },

  cycleDisplayMode() {
    set({ displayMode: nextDisplayMode(get().displayMode) });
  },

  undo() {
    const state = get();
    const previous = state.history[state.history.length - 1];

    if (previous === undefined) {
      return;
    }

    const circuit = cloneCircuit(previous);

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      availableCounts:
        previous.availableCounts === null ? null : { ...previous.availableCounts },
      history: state.history.slice(0, -1),
      selected: null,
      pendingTerminal: null,
    });
  },

  resetWorkbench() {
    const circuit = createInitialCircuit();

    set({
      circuit,
      simulation: simulateCircuit(circuit),
      selected: null,
      pendingTerminal: null,
      displayMode: 'realistic',
      levelId: null,
      lockedComponentIds: [],
      availableCounts: null,
      availableOffers: [],
      history: [],
      sandboxActive: false,
      sandboxOwnerKey: null,
      sandboxWork: null,
      sandboxSavedFingerprint: null,
    });
  },
}));

function createInitialCircuit(): Circuit {
  return {
    components: [
      createComponent('battery', {
        id: 'battery-1',
        position: { x: 3, y: 4 },
      }),
      createComponent('bulb', {
        id: 'bulb-1',
        position: { x: 8, y: 4 },
      }),
    ],
    wires: [],
  };
}

/**
 * Gives back one palette slot when a child removes a component they placed.
 * Without this, deleting the only offered bulb would leave the palette empty
 * and the child unable to try again. Locked preplaced components never reach
 * this helper.
 */
function restoredAvailableCounts(
  state: WorkbenchState,
  component: CircuitComponent,
): Record<string, number> | null {
  if (state.availableCounts === null) {
    return null;
  }

  const offer = state.availableOffers.find((candidate) =>
    offerMatchesComponent(candidate, component),
  );

  if (offer === undefined) {
    return state.availableCounts;
  }

  const remaining = state.availableCounts[offer.key] ?? 0;

  if (remaining >= offer.count) {
    return state.availableCounts;
  }

  return {
    ...state.availableCounts,
    [offer.key]: remaining + 1,
  };
}

function offerMatchesComponent(
  offer: LevelAvailableComponent,
  component: CircuitComponent,
): boolean {
  if (offer.type !== component.type) {
    return false;
  }

  if (offer.type === 'material') {
    return (
      component.type === 'material' &&
      (offer.key === 'metal') === component.conductive
    );
  }

  if (offer.options === undefined) {
    return true;
  }

  const values = component as unknown as Record<string, unknown>;

  return Object.entries(offer.options).every(([key, value]) => {
    // These fields are changed by play (switch state, magnet, day/night)
    // and must not decide which palette slot is restored.
    if (
      key === 'closed' ||
      key === 'magnetNear' ||
      key === 'wiperPosition' ||
      key === 'lightLevel' ||
      key === 'conductive'
    ) {
      return true;
    }

    return values[key] === value;
  });
}

function nextCircuitState(
  state: WorkbenchState,
  circuit: Circuit,
  availableCounts: Record<string, number> | null = state.availableCounts,
): Pick<
  WorkbenchState,
  'circuit' | 'simulation' | 'history' | 'availableCounts'
> {
  return {
    circuit,
    simulation: simulateCircuit(circuit),
    availableCounts,
    history: [
      ...state.history,
      {
        components: state.circuit.components.map(cloneComponent),
        wires: state.circuit.wires.map(cloneWire),
        availableCounts:
          state.availableCounts === null ? null : { ...state.availableCounts },
      },
    ].slice(-HISTORY_LIMIT),
  };
}

function cloneCircuit(circuit: Circuit): Circuit {
  return {
    components: circuit.components.map(cloneComponent),
    wires: circuit.wires.map(cloneWire),
  };
}

function collectIds(circuit: Circuit): Set<string> {
  const used = new Set<string>();

  for (const component of circuit.components) {
    used.add(component.id);
  }
  for (const wire of circuit.wires) {
    used.add(wire.id);
  }

  return used;
}

function nextId(prefix: string, circuit: Circuit): string {
  return nextIdFrom(collectIds(circuit), prefix);
}

function nextIdFrom(used: Set<string>, prefix: string): string {
  let index = 1;
  while (used.has(`${prefix}-${index}`)) {
    index += 1;
  }

  const id = `${prefix}-${index}`;
  used.add(id);
  return id;
}

function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

function sameRef(left: TerminalRef, right: TerminalRef): boolean {
  return (
    left.componentId === right.componentId && left.terminalId === right.terminalId
  );
}

function sameRefOrNull(left: TerminalRef | null, right: TerminalRef | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return sameRef(left, right);
}

function sameSelection(left: Selection | null, right: Selection | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return left.kind === right.kind && left.id === right.id;
}

function terminalExists(circuit: Circuit, ref: TerminalRef): boolean {
  return circuit.components.some(
    (component) =>
      component.id === ref.componentId &&
      component.terminals.some((terminal) => terminal.id === ref.terminalId),
  );
}
