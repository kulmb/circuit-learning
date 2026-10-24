import { EXPECTED_TERMINAL_IDS } from './components';
import { terminalKey } from './ids';
import type { CircuitModel } from './model';
import type { ComponentState } from './types';

interface WireEdge {
  id: string;
  kind: 'wire' | 'component';
  a: string;
  b: string;
}

interface TreeParent {
  parent: string;
  edge: WireEdge;
}

export interface WireCurrentResult {
  /** Signed current for each loose wire, positive from wire.from to wire.to. */
  wireCurrents: Record<string, number>;
  /** Signed current carried by wire components, from terminal a to terminal b. */
  componentCurrents: Record<string, number>;
}

/**
 * Distributes the solved component currents over the ideal wire network.
 *
 * Wires inside one electrical node carry an under-determined current. A spanning
 * tree of the wire graph gives one valid solution: each tree edge carries the sum
 * of the demands of the subtree below it. Non-tree edges carry zero, which keeps
 * the visualisation deterministic for parallel wires.
 */
export function computeWireCurrents(
  model: CircuitModel,
  states: Record<string, ComponentState>,
): WireCurrentResult {
  const demand = new Map<string, number>();

  for (const component of model.components) {
    if (component.type === 'wire') {
      continue;
    }

    const state = states[component.id];
    if (state === undefined) {
      continue;
    }

    const [firstId, secondId] = EXPECTED_TERMINAL_IDS[component.type];
    const firstKey = terminalKey({ componentId: component.id, terminalId: firstId });
    const secondKey = terminalKey({ componentId: component.id, terminalId: secondId });

    // The battery state is the current delivered to the external circuit, while
    // the internal branch flows from negative to positive. All other component
    // states are already signed from terminals[0] to terminals[1].
    const internalCurrent =
      component.type === 'battery' ? -state.current : state.current;

    demand.set(firstKey, (demand.get(firstKey) ?? 0) + internalCurrent);
    demand.set(secondKey, (demand.get(secondKey) ?? 0) - internalCurrent);
  }

  const edges: WireEdge[] = [];
  const wireCurrents: Record<string, number> = {};

  for (const wire of model.wires) {
    wireCurrents[wire.id] = 0;
    edges.push({
      id: wire.id,
      kind: 'wire',
      a: terminalKey(wire.from),
      b: terminalKey(wire.to),
    });
  }

  const componentCurrents: Record<string, number> = {};

  for (const component of model.components) {
    if (component.type !== 'wire') {
      continue;
    }

    componentCurrents[component.id] = 0;
    const [firstId, secondId] = EXPECTED_TERMINAL_IDS.wire;
    edges.push({
      id: component.id,
      kind: 'component',
      a: terminalKey({ componentId: component.id, terminalId: firstId }),
      b: terminalKey({ componentId: component.id, terminalId: secondId }),
    });
  }

  const adjacency = new Map<string, { edge: WireEdge; other: string }[]>();

  for (const edge of edges) {
    if (edge.a === edge.b) {
      continue;
    }

    connect(adjacency, edge.a, { edge, other: edge.b });
    connect(adjacency, edge.b, { edge, other: edge.a });
  }

  const nodes = new Set<string>();
  for (const key of demand.keys()) {
    nodes.add(key);
  }
  for (const key of adjacency.keys()) {
    nodes.add(key);
  }

  const visited = new Set<string>();

  for (const start of nodes) {
    if (visited.has(start)) {
      continue;
    }

    visited.add(start);
    const queue = [start];
    const parent = new Map<string, TreeParent>();
    const order: string[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current === undefined) {
        continue;
      }

      for (const { edge, other } of adjacency.get(current) ?? []) {
        if (visited.has(other)) {
          continue;
        }

        visited.add(other);
        parent.set(other, { parent: current, edge });
        order.push(other);
        queue.push(other);
      }
    }

    const subtreeDemand = new Map<string, number>();
    subtreeDemand.set(start, demand.get(start) ?? 0);

    for (const node of order) {
      subtreeDemand.set(node, demand.get(node) ?? 0);
    }

    for (let index = order.length - 1; index >= 0; index -= 1) {
      const node = order[index];
      if (node === undefined) {
        continue;
      }

      const info = parent.get(node);
      if (info === undefined) {
        continue;
      }

      const sum = subtreeDemand.get(node) ?? 0;
      let value: number;

      if (info.edge.a === info.parent && info.edge.b === node) {
        value = sum;
      } else if (info.edge.a === node && info.edge.b === info.parent) {
        value = -sum;
      } else {
        continue;
      }

      const current = clean(value);

      if (info.edge.kind === 'wire') {
        wireCurrents[info.edge.id] = current;
      } else {
        componentCurrents[info.edge.id] = current;
      }

      subtreeDemand.set(info.parent, (subtreeDemand.get(info.parent) ?? 0) + sum);
    }
  }

  return { wireCurrents, componentCurrents };
}

function connect(
  adjacency: Map<string, { edge: WireEdge; other: string }[]>,
  key: string,
  value: { edge: WireEdge; other: string },
): void {
  const list = adjacency.get(key);

  if (list === undefined) {
    adjacency.set(key, [value]);
  } else {
    list.push(value);
  }
}

function clean(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value;
}
