import { EXPECTED_TERMINAL_IDS, ROTATIONS, isComponentType } from './components';
import { CircuitError } from './errors';
import { assertId, terminalKey } from './ids';
import { UnionFind } from './unionFind';
import type {
  Circuit,
  CircuitComponent,
  TerminalRef,
  Vec2,
  Wire,
} from './types';

export interface CircuitModel {
  circuit: Circuit;
  components: CircuitComponent[];
  componentById: Map<string, CircuitComponent>;
  wires: Wire[];
  wireById: Map<string, Wire>;
  componentNodes: Map<string, Map<string, number>>;
  nodeCount: number;
  terminalRefs: TerminalRef[];
  wireEndpointKeys: Set<string>;
  danglingTerminals: TerminalRef[];
  nodesFor(component: CircuitComponent): [number, number];
  nodeOf(ref: TerminalRef): number;
}

export function buildCircuitModel(circuit: Circuit): CircuitModel {
  if (!Array.isArray(circuit.components) || !Array.isArray(circuit.wires)) {
    throw new CircuitError('invalid_circuit', 'A circuit must contain components and wires');
  }

  const componentById = new Map<string, CircuitComponent>();
  const wireById = new Map<string, Wire>();
  const allIds = new Set<string>();
  const terminalRefByKey = new Map<string, TerminalRef>();
  const terminalRefs: TerminalRef[] = [];
  const unionFind = new UnionFind();

  for (const component of circuit.components) {
    const id = assertId(component.id, 'component id');
    if (allIds.has(id)) {
      throw new CircuitError('invalid_circuit', `Duplicate circuit id: ${id}`);
    }
    allIds.add(id);
    componentById.set(id, component);
    validateComponent(component);

    const terminalIds = new Set<string>();
    for (const terminal of component.terminals) {
      const terminalId = assertId(terminal.id, `terminal id on ${id}`);
      if (terminalIds.has(terminalId)) {
        throw new CircuitError(
          'invalid_circuit',
          `Duplicate terminal ${terminalId} on component ${id}`,
        );
      }
      terminalIds.add(terminalId);
      assertFinite(terminal.offset.x, `terminal ${terminalId} x offset`);
      assertFinite(terminal.offset.y, `terminal ${terminalId} y offset`);

      const key = terminalKey({ componentId: id, terminalId });
      if (terminalRefByKey.has(key)) {
        throw new CircuitError('invalid_circuit', `Duplicate terminal reference: ${key}`);
      }

      const ref: TerminalRef = { componentId: id, terminalId };
      terminalRefByKey.set(key, ref);
      terminalRefs.push(ref);
      unionFind.add(key);
    }

    const expectedTerminals = EXPECTED_TERMINAL_IDS[component.type];
    if (
      component.terminals.length !== expectedTerminals.length ||
      expectedTerminals.some((terminalId) => !terminalIds.has(terminalId))
    ) {
      throw new CircuitError(
        'invalid_circuit',
        `Component ${id} does not expose the expected terminals`,
      );
    }
  }

  const wireEndpointKeys = new Set<string>();

  for (const wire of circuit.wires) {
    const wireId = assertId(wire.id, 'wire id');
    if (allIds.has(wireId)) {
      throw new CircuitError('invalid_circuit', `Duplicate circuit id: ${wireId}`);
    }
    allIds.add(wireId);
    wireById.set(wireId, wire);

    const fromKey = terminalKey(assertTerminalRef(wire.from, `wire ${wireId} source`));
    const toKey = terminalKey(assertTerminalRef(wire.to, `wire ${wireId} target`));

    if (!terminalRefByKey.has(fromKey)) {
      throw new CircuitError(
        'invalid_circuit',
        `Wire ${wireId} references an unknown source terminal`,
      );
    }
    if (!terminalRefByKey.has(toKey)) {
      throw new CircuitError(
        'invalid_circuit',
        `Wire ${wireId} references an unknown target terminal`,
      );
    }

    wireEndpointKeys.add(fromKey);
    wireEndpointKeys.add(toKey);
    unionFind.union(fromKey, toKey);
  }

  for (const component of circuit.components) {
    if (component.type === 'wire') {
      const [first, second] = EXPECTED_TERMINAL_IDS.wire;
      unionFind.union(
        terminalKey({ componentId: component.id, terminalId: first }),
        terminalKey({ componentId: component.id, terminalId: second }),
      );
    }
  }

  const rootToNode = new Map<string, number>();
  const nodeByTerminalKey = new Map<string, number>();

  for (const ref of terminalRefs) {
    const key = terminalKey(ref);
    const root = unionFind.find(key);
    let node = rootToNode.get(root);

    if (node === undefined) {
      node = rootToNode.size;
      rootToNode.set(root, node);
    }

    nodeByTerminalKey.set(key, node);
  }

  const componentNodes = new Map<string, Map<string, number>>();

  for (const component of circuit.components) {
    const nodes = new Map<string, number>();
    for (const terminal of component.terminals) {
      const key = terminalKey({ componentId: component.id, terminalId: terminal.id });
      const node = nodeByTerminalKey.get(key);
      if (node === undefined) {
        throw new CircuitError(
          'invalid_circuit',
          `No electrical node for ${component.id}.${terminal.id}`,
        );
      }
      nodes.set(terminal.id, node);
    }
    componentNodes.set(component.id, nodes);
  }

  const danglingTerminals = terminalRefs
    .filter((ref) => !wireEndpointKeys.has(terminalKey(ref)))
    .sort(compareTerminalRefs);

  const nodesFor = (component: CircuitComponent): [number, number] => {
    const terminalIds = EXPECTED_TERMINAL_IDS[component.type];
    const nodes = componentNodes.get(component.id);
    if (!nodes) {
      throw new CircuitError(
        'invalid_circuit',
        `Unknown component in circuit model: ${component.id}`,
      );
    }

    const first = nodes.get(terminalIds[0]);
    const second = nodes.get(terminalIds[1]);
    if (first === undefined || second === undefined) {
      throw new CircuitError(
        'invalid_circuit',
        `Missing terminal node for component ${component.id}`,
      );
    }

    return [first, second];
  };

  const nodeOf = (ref: TerminalRef): number => {
    const node = nodeByTerminalKey.get(terminalKey(assertTerminalRef(ref, 'terminal')));
    if (node === undefined) {
      throw new CircuitError(
        'invalid_circuit',
        `Unknown terminal ${ref.componentId}.${ref.terminalId}`,
      );
    }
    return node;
  };

  return {
    circuit,
    components: circuit.components,
    componentById,
    wires: circuit.wires,
    wireById,
    componentNodes,
    nodeCount: rootToNode.size,
    terminalRefs,
    wireEndpointKeys,
    danglingTerminals,
    nodesFor,
    nodeOf,
  };
}

export function compareTerminalRefs(left: TerminalRef, right: TerminalRef): number {
  const componentOrder = compareText(left.componentId, right.componentId);
  return componentOrder === 0 ? compareText(left.terminalId, right.terminalId) : componentOrder;
}

function assertTerminalRef(value: unknown, label: string): TerminalRef {
  if (typeof value !== 'object' || value === null) {
    throw new CircuitError('invalid_circuit', `${label} is not a terminal reference`);
  }

  const record = value as Record<string, unknown>;
  return {
    componentId: assertId(record['componentId'], `${label} component id`),
    terminalId: assertId(record['terminalId'], `${label} terminal id`),
  };
}

function validateComponent(component: CircuitComponent): void {
  if (!isComponentType(component.type)) {
    throw new CircuitError(
      'invalid_circuit',
      `Unknown component type: ${String(component.type)}`,
    );
  }

  if (!component.position || !isVec2(component.position)) {
    throw new CircuitError(
      'invalid_circuit',
      `Component ${component.id} has an invalid position`,
    );
  }

  if (!ROTATIONS.includes(component.rotation)) {
    throw new CircuitError(
      'invalid_circuit',
      `Component ${component.id} has an invalid rotation`,
    );
  }

  if (!Array.isArray(component.terminals) || component.terminals.length === 0) {
    throw new CircuitError(
      'invalid_circuit',
      `Component ${component.id} must expose terminals`,
    );
  }

  switch (component.type) {
    case 'battery':
      assertPositive(component.voltage, `battery ${component.id} voltage`);
      assertPositive(
        component.internalResistance,
        `battery ${component.id} internal resistance`,
      );
      break;
    case 'bulb':
    case 'motor':
    case 'buzzer':
    case 'resistor':
      assertPositive(component.resistance, `${component.type} ${component.id} resistance`);
      break;
    case 'switch':
      assertBoolean(component.closed, `switch ${component.id} closed`);
      assertPositive(
        component.resistanceWhenClosed,
        `switch ${component.id} closed resistance`,
      );
      break;
    case 'wire':
      break;
    case 'led':
      assertPositive(component.resistance, `led ${component.id} resistance`);
      assertNonNegative(component.forwardVoltage, `led ${component.id} forward voltage`);
      break;
    case 'material':
      assertBoolean(component.conductive, `material ${component.id} conductive`);
      assertPositive(
        component.resistanceWhenConductive,
        `material ${component.id} conductive resistance`,
      );
      break;
  }
}

function isVec2(value: Vec2): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function assertFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new CircuitError('invalid_circuit', `${field} must be finite`);
  }
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CircuitError('invalid_circuit', `${field} must be positive`);
  }
}

function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new CircuitError('invalid_circuit', `${field} must be zero or positive`);
  }
}

function assertBoolean(value: boolean, field: string): void {
  if (typeof value !== 'boolean') {
    throw new CircuitError('invalid_circuit', `${field} must be a boolean`);
  }
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
