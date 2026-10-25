import { CircuitError } from './errors';
import { terminalKey } from './ids';
import { UnionFind } from './unionFind';
import type { Circuit, CircuitComponent } from './types';

export interface CircuitTopology {
  circuit: Circuit;
  componentById: Map<string, CircuitComponent>;
  nodeOf(componentId: string, terminalId: string): number;
  nodesFor(componentId: string): [number, number];
}

/**
 * Collapses every conductive connection (wires, closed switches, conductive
 * materials) into electrical nodes. Loads and batteries stay between nodes.
 * This is the graph the game uses to tell "in series" from "in parallel".
 */
export function buildCircuitTopology(circuit: Circuit): CircuitTopology {
  const unionFind = new UnionFind();
  const componentById = new Map<string, CircuitComponent>();
  const terminalKeys = new Set<string>();

  for (const component of circuit.components) {
    componentById.set(component.id, component);
    for (const terminal of component.terminals) {
      const key = terminalKey({
        componentId: component.id,
        terminalId: terminal.id,
      });
      unionFind.add(key);
      terminalKeys.add(key);
    }
  }

  for (const wire of circuit.wires) {
    const from = terminalKey(wire.from);
    const to = terminalKey(wire.to);

    if (!terminalKeys.has(from) || !terminalKeys.has(to)) {
      throw new CircuitError(
        'invalid_circuit',
        `Wire ${wire.id} references an unknown terminal`,
      );
    }

    unionFind.union(from, to);
  }

  for (const component of circuit.components) {
    if (!isConductiveWhenClosed(component)) {
      continue;
    }

    const first = component.terminals[0];
    const second = component.terminals[1];

    if (first !== undefined && second !== undefined) {
      unionFind.union(
        terminalKey({ componentId: component.id, terminalId: first.id }),
        terminalKey({ componentId: component.id, terminalId: second.id }),
      );
    }
  }

  const rootToNode = new Map<string, number>();
  const nodeByTerminal = new Map<string, number>();

  for (const key of terminalKeys) {
    const root = unionFind.find(key);
    let node = rootToNode.get(root);

    if (node === undefined) {
      node = rootToNode.size;
      rootToNode.set(root, node);
    }

    nodeByTerminal.set(key, node);
  }

  const nodeFor = (componentId: string, terminalId: string): number => {
    const node = nodeByTerminal.get(
      terminalKey({ componentId, terminalId }),
    );

    if (node === undefined) {
      throw new CircuitError(
        'invalid_circuit',
        `Unknown terminal ${componentId}.${terminalId}`,
      );
    }

    return node;
  };

  const nodesFor = (componentId: string): [number, number] => {
    const component = componentById.get(componentId);

    if (component === undefined) {
      throw new CircuitError(
        'invalid_circuit',
        `Unknown component ${componentId}`,
      );
    }

    const first = component.terminals[0];
    const second = component.terminals[1];

    if (first === undefined || second === undefined) {
      throw new CircuitError(
        'invalid_circuit',
        `Component ${componentId} does not have two terminals`,
      );
    }

    return [
      nodeFor(componentId, first.id),
      nodeFor(componentId, second.id),
    ];
  };

  return {
    circuit,
    componentById,
    nodeOf: nodeFor,
    nodesFor,
  };
}

/**
 * Two components are in series when they share an electrical node that has
 * no other load, battery or open switch attached to it.
 */
export function areInSeries(
  circuit: Circuit,
  firstComponentId: string,
  secondComponentId: string,
): boolean {
  if (firstComponentId === secondComponentId) {
    return false;
  }

  const topology = buildCircuitTopology(circuit);

  if (
    !topology.componentById.has(firstComponentId) ||
    !topology.componentById.has(secondComponentId)
  ) {
    return false;
  }

  const firstNodes = topology.nodesFor(firstComponentId);
  const secondNodes = topology.nodesFor(secondComponentId);
  const sharedNodes = firstNodes.filter((node) =>
    secondNodes.includes(node),
  );

  if (sharedNodes.length === 0) {
    return false;
  }

  const terminalCounts = significantTerminalCounts(circuit, topology);

  return sharedNodes.some((node) => (terminalCounts.get(node) ?? 0) === 2);
}

/**
 * Two components are in parallel when their terminals sit on the same pair
 * of electrical nodes.
 */
export function areInParallel(
  circuit: Circuit,
  firstComponentId: string,
  secondComponentId: string,
): boolean {
  if (firstComponentId === secondComponentId) {
    return false;
  }

  const topology = buildCircuitTopology(circuit);

  if (
    !topology.componentById.has(firstComponentId) ||
    !topology.componentById.has(secondComponentId)
  ) {
    return false;
  }

  const firstNodes = topology.nodesFor(firstComponentId);
  const secondNodes = topology.nodesFor(secondComponentId);

  if (firstNodes[0] === firstNodes[1] || secondNodes[0] === secondNodes[1]) {
    return false;
  }

  return (
    (firstNodes[0] === secondNodes[0] && firstNodes[1] === secondNodes[1]) ||
    (firstNodes[0] === secondNodes[1] && firstNodes[1] === secondNodes[0])
  );
}

function significantTerminalCounts(
  circuit: Circuit,
  topology: CircuitTopology,
): Map<number, number> {
  const counts = new Map<number, number>();

  for (const component of circuit.components) {
    if (isConductiveWhenClosed(component)) {
      continue;
    }

    for (const terminal of component.terminals) {
      const node = topology.nodeOf(component.id, terminal.id);
      counts.set(node, (counts.get(node) ?? 0) + 1);
    }
  }

  return counts;
}

function isConductiveWhenClosed(component: CircuitComponent): boolean {
  if (component.type === 'wire') {
    return true;
  }
  if (component.type === 'switch') {
    return component.closed;
  }
  if (component.type === 'material') {
    return component.conductive;
  }
  return false;
}
