import {
  cloneComponent,
  cloneWire,
  createComponent,
  createWire,
  simulateCircuit,
  type Circuit,
  type CircuitComponent,
  type CircuitSimulation,
  type ComponentType,
  type CreateComponentOptions,
  type LevelDefinition,
  type Rotation,
  type TerminalRef,
  type Vec2,
  type Wire,
} from '@circuits/shared';
import { create } from 'zustand';

import { nextDisplayMode, type DisplayMode } from './displayMode';

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
  history: CircuitSnapshot[];
  loadLevel: (level: LevelDefinition) => void;
  addComponent: (
    type: ComponentType,
    options: ComponentOptions,
    position: Vec2,
    paletteKey?: string,
  ) => void;
  moveComponent: (componentId: string, position: Vec2) => void;
  rotateComponent: (componentId: string) => void;
  toggleSwitch: (componentId: string) => void;
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
  history: [],

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
      history: [],
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

    set({
      ...nextCircuitState(state, { components, wires }),
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

    const components = state.circuit.components.filter(
      (component) => component.id !== selection.id,
    );
    const wires = state.circuit.wires.filter(
      (wire) =>
        wire.from.componentId !== selection.id && wire.to.componentId !== selection.id,
    );

    set({
      ...nextCircuitState(state, { components, wires }),
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
      history: [],
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

function nextId(prefix: string, circuit: Circuit): string {
  const used = new Set<string>();

  for (const component of circuit.components) {
    used.add(component.id);
  }
  for (const wire of circuit.wires) {
    used.add(wire.id);
  }

  let index = 1;
  while (used.has(`${prefix}-${index}`)) {
    index += 1;
  }

  return `${prefix}-${index}`;
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
