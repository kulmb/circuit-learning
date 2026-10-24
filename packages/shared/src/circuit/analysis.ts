import { EXPECTED_TERMINAL_IDS } from './components';
import { terminalKey } from './ids';
import { compareTerminalRefs, type CircuitModel } from './model';
import type {
  BatteryComponent,
  CircuitComponent,
  CircuitDiagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  ShortCircuitInfo,
  TerminalRef,
} from './types';

type GraphEdgeKind =
  | 'wire'
  | 'wire-component'
  | 'closed-switch'
  | 'open-switch'
  | 'conductive-material'
  | 'insulating-material'
  | 'load'
  | 'led'
  | 'battery';

interface GraphEdge {
  from: string;
  to: string;
  cost: 0 | 1;
  kind: GraphEdgeKind;
  componentId: string | null;
  wireId: string | null;
}

interface PathResult {
  edges: GraphEdge[];
  cost: number;
}

export interface BatteryPath {
  battery: BatteryComponent;
  path: PathResult | null;
}

export interface CircuitAnalysis {
  model: CircuitModel;
  hasBattery: boolean;
  shortInfo: ShortCircuitInfo | null;
  batteryPaths: BatteryPath[];
  closed: boolean;
  danglingTerminals: TerminalRef[];
  diagnostics: CircuitDiagnostic[];
  bulbOneSide: boolean;
  switchOpen: boolean;
  insulatingMaterial: boolean;
}

export interface DiagnosticDetails {
  componentIds?: string[];
  terminalRefs?: TerminalRef[];
  wireIds?: string[];
}

const DIAGNOSTIC_PRIORITY: Record<DiagnosticCode, number> = {
  missing_battery: 0,
  short_circuit: 1,
  switch_open: 2,
  insulating_material: 3,
  bulb_one_side: 4,
  led_reversed: 5,
  open_circuit: 6,
  simulation_error: 7,
};

export function analyzeCircuit(model: CircuitModel): CircuitAnalysis {
  const diagnostics: CircuitDiagnostic[] = [];
  const batteries = model.components.filter(isBatteryComponent);

  addBulbOneSideDiagnostics(model, diagnostics);

  if (batteries.length === 0) {
    addDiagnostic(diagnostics, 'missing_battery');

    return {
      model,
      hasBattery: false,
      shortInfo: null,
      batteryPaths: [],
      closed: false,
      danglingTerminals: model.danglingTerminals,
      diagnostics: sortDiagnostics(diagnostics),
      bulbOneSide: diagnostics.some((item) => item.code === 'bulb_one_side'),
      switchOpen: false,
      insulatingMaterial: false,
    };
  }

  const { allEdges, zero: zeroGraph } = buildGraphs(model);
  const batteryPaths: BatteryPath[] = [];
  const shortWireIds = new Set<string>();
  const shortComponentIds = new Set<string>();
  let shortDetected = false;

  for (const battery of batteries) {
    const [positiveId, negativeId] = EXPECTED_TERMINAL_IDS.battery;
    const positiveKey = terminalKey({ componentId: battery.id, terminalId: positiveId });
    const negativeKey = terminalKey({ componentId: battery.id, terminalId: negativeId });

    const zeroPath = findPath(positiveKey, negativeKey, zeroGraph);
    if (zeroPath !== null) {
      shortDetected = true;
      collectPathIds(zeroPath, shortWireIds, shortComponentIds);
    }

    const allGraph = buildAdjacency(
      allEdges.filter(
        (edge) => !(edge.kind === 'battery' && edge.componentId === battery.id),
      ),
    );

    batteryPaths.push({
      battery,
      path: findMinBlockerPath(positiveKey, negativeKey, allGraph),
    });
  }

  const shortInfo: ShortCircuitInfo | null = shortDetected
    ? {
        wireIds: sorted(shortWireIds),
        componentIds: sorted(shortComponentIds),
        current: null,
      }
    : null;

  if (shortInfo !== null) {
    addDiagnostic(diagnostics, 'short_circuit', {
      wireIds: shortInfo.wireIds,
      componentIds: shortInfo.componentIds,
    });
  }

  const switchIds = new Set<string>();
  const materialIds = new Set<string>();

  for (const batteryPath of batteryPaths) {
    const path = batteryPath.path;

    if (path === null || path.cost > 0) {
      addDiagnostic(diagnostics, 'open_circuit', {
        componentIds: [batteryPath.battery.id],
        terminalRefs: model.danglingTerminals,
      });

      if (path !== null) {
        for (const edge of path.edges) {
          if (edge.cost === 0 || edge.componentId === null) {
            continue;
          }

          if (edge.kind === 'open-switch') {
            switchIds.add(edge.componentId);
          } else if (edge.kind === 'insulating-material') {
            materialIds.add(edge.componentId);
          }
        }
      }
    }
  }

  if (switchIds.size > 0) {
    addDiagnostic(diagnostics, 'switch_open', { componentIds: sorted(switchIds) });
  }

  if (materialIds.size > 0) {
    addDiagnostic(diagnostics, 'insulating_material', {
      componentIds: sorted(materialIds),
    });
  }

  const closed =
    batteryPaths.length > 0 &&
    batteryPaths.every((batteryPath) => batteryPath.path !== null && batteryPath.path.cost === 0);

  return {
    model,
    hasBattery: true,
    shortInfo,
    batteryPaths,
    closed,
    danglingTerminals: model.danglingTerminals,
    diagnostics: sortDiagnostics(diagnostics),
    bulbOneSide: diagnostics.some((item) => item.code === 'bulb_one_side'),
    switchOpen: diagnostics.some((item) => item.code === 'switch_open'),
    insulatingMaterial: diagnostics.some((item) => item.code === 'insulating_material'),
  };
}

export function addDiagnostic(
  diagnostics: CircuitDiagnostic[],
  code: DiagnosticCode,
  details: DiagnosticDetails = {},
): void {
  const diagnostic: CircuitDiagnostic = {
    code,
    severity: severityFor(code),
    componentIds: sorted(new Set(details.componentIds ?? [])),
    terminalRefs: uniqueTerminalRefs(details.terminalRefs ?? []),
    wireIds: sorted(new Set(details.wireIds ?? [])),
  };

  const key = diagnosticKey(diagnostic);
  if (diagnostics.some((item) => diagnosticKey(item) === key)) {
    return;
  }

  diagnostics.push(diagnostic);
}

export function sortDiagnostics(diagnostics: CircuitDiagnostic[]): CircuitDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const priority = DIAGNOSTIC_PRIORITY[left.code] - DIAGNOSTIC_PRIORITY[right.code];
    return priority === 0 ? compareText(left.code, right.code) : priority;
  });
}

function addBulbOneSideDiagnostics(
  model: CircuitModel,
  diagnostics: CircuitDiagnostic[],
): void {
  for (const component of model.components) {
    if (component.type !== 'bulb') {
      continue;
    }

    const connectedTerminals = component.terminals.filter((terminal) =>
      model.wireEndpointKeys.has(
        terminalKey({ componentId: component.id, terminalId: terminal.id }),
      ),
    );

    if (connectedTerminals.length === 1) {
      const dangling = component.terminals
        .filter((terminal) => !connectedTerminals.includes(terminal))
        .map((terminal) => ({
          componentId: component.id,
          terminalId: terminal.id,
        }));

      addDiagnostic(diagnostics, 'bulb_one_side', {
        componentIds: [component.id],
        terminalRefs: dangling,
      });
    }
  }
}

function buildGraphs(model: CircuitModel): {
  allEdges: GraphEdge[];
  zero: Map<string, GraphEdge[]>;
} {
  const allEdges: GraphEdge[] = [];
  const zeroEdges: GraphEdge[] = [];

  const components = [...model.components].sort((left, right) =>
    compareText(left.id, right.id),
  );

  for (const component of components) {
    if (component.type === 'battery') {
      const [positiveId, negativeId] = EXPECTED_TERMINAL_IDS.battery;
      allEdges.push({
        from: terminalKey({ componentId: component.id, terminalId: positiveId }),
        to: terminalKey({ componentId: component.id, terminalId: negativeId }),
        cost: 0,
        kind: 'battery',
        componentId: component.id,
        wireId: null,
      });
      continue;
    }

    const [firstId, secondId] = EXPECTED_TERMINAL_IDS[component.type];
    const from = terminalKey({ componentId: component.id, terminalId: firstId });
    const to = terminalKey({ componentId: component.id, terminalId: secondId });

    let kind: GraphEdgeKind;
    let cost: 0 | 1;

    switch (component.type) {
      case 'switch':
        kind = component.closed ? 'closed-switch' : 'open-switch';
        cost = component.closed ? 0 : 1;
        break;
      case 'material':
        kind = component.conductive ? 'conductive-material' : 'insulating-material';
        cost = component.conductive ? 0 : 1;
        break;
      case 'wire':
        kind = 'wire-component';
        cost = 0;
        break;
      case 'led':
        kind = 'led';
        cost = 0;
        break;
      default:
        kind = 'load';
        cost = 0;
    }

    const edge: GraphEdge = {
      from,
      to,
      cost,
      kind,
      componentId: component.id,
      wireId: null,
    };

    allEdges.push(edge);
    if (isZeroResistanceEdge(edge)) {
      zeroEdges.push(edge);
    }
  }

  const wires = [...model.wires].sort((left, right) => compareText(left.id, right.id));

  for (const wire of wires) {
    const edge: GraphEdge = {
      from: terminalKey(wire.from),
      to: terminalKey(wire.to),
      cost: 0,
      kind: 'wire',
      componentId: null,
      wireId: wire.id,
    };

    allEdges.push(edge);
    zeroEdges.push(edge);
  }

  return {
    allEdges,
    zero: buildAdjacency(zeroEdges),
  };
}

function buildAdjacency(edges: GraphEdge[]): Map<string, GraphEdge[]> {
  const adjacency = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    const fromEdges = adjacency.get(edge.from);
    if (fromEdges === undefined) {
      adjacency.set(edge.from, [edge]);
    } else {
      fromEdges.push(edge);
    }

    if (edge.to !== edge.from) {
      const toEdges = adjacency.get(edge.to);
      if (toEdges === undefined) {
        adjacency.set(edge.to, [edge]);
      } else {
        toEdges.push(edge);
      }
    }
  }

  return adjacency;
}

function findPath(
  start: string,
  target: string,
  adjacency: Map<string, GraphEdge[]>,
): GraphEdge[] | null {
  const queue = [start];
  const visited = new Set<string>([start]);
  const previous = new Map<string, { current: string; edge: GraphEdge }>();

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined || current === target) {
      continue;
    }

    for (const edge of adjacency.get(current) ?? []) {
      const next = edge.from === current ? edge.to : edge.from;
      if (visited.has(next)) {
        continue;
      }

      visited.add(next);
      previous.set(next, { current, edge });
      queue.push(next);
    }
  }

  if (!visited.has(target)) {
    return null;
  }

  return reconstructPath(start, target, previous);
}

function findMinBlockerPath(
  start: string,
  target: string,
  adjacency: Map<string, GraphEdge[]>,
): PathResult | null {
  const distance = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, { current: string; edge: GraphEdge }>();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    const currentDistance = distance.get(current);
    if (currentDistance === undefined) {
      continue;
    }

    for (const edge of adjacency.get(current) ?? []) {
      const next = edge.from === current ? edge.to : edge.from;
      const nextDistance = currentDistance + edge.cost;
      const knownDistance = distance.get(next);

      if (knownDistance !== undefined && knownDistance <= nextDistance) {
        continue;
      }

      distance.set(next, nextDistance);
      previous.set(next, { current, edge });

      if (edge.cost === 0) {
        queue.unshift(next);
      } else {
        queue.push(next);
      }
    }
  }

  const targetDistance = distance.get(target);
  if (targetDistance === undefined) {
    return null;
  }

  const edges = reconstructPath(start, target, previous);
  if (edges === null) {
    return null;
  }

  return { edges, cost: targetDistance };
}

function reconstructPath(
  start: string,
  target: string,
  previous: Map<string, { current: string; edge: GraphEdge }>,
): GraphEdge[] | null {
  if (start === target) {
    return [];
  }

  const path: GraphEdge[] = [];
  let current = target;

  while (current !== start) {
    const step = previous.get(current);
    if (step === undefined) {
      return null;
    }

    path.push(step.edge);
    current = step.current;
  }

  path.reverse();
  return path;
}

function isZeroResistanceEdge(edge: GraphEdge): boolean {
  return (
    edge.kind === 'wire' ||
    edge.kind === 'wire-component' ||
    edge.kind === 'closed-switch' ||
    edge.kind === 'conductive-material'
  );
}

function collectPathIds(
  path: GraphEdge[],
  wireIds: Set<string>,
  componentIds: Set<string>,
): void {
  for (const edge of path) {
    if (edge.wireId !== null) {
      wireIds.add(edge.wireId);
    }
    if (edge.componentId !== null) {
      componentIds.add(edge.componentId);
    }
  }
}

function isBatteryComponent(component: CircuitComponent): component is BatteryComponent {
  return component.type === 'battery';
}

function severityFor(code: DiagnosticCode): DiagnosticSeverity {
  switch (code) {
    case 'short_circuit':
    case 'simulation_error':
      return 'danger';
    case 'missing_battery':
    case 'open_circuit':
    case 'bulb_one_side':
    case 'led_reversed':
      return 'warning';
    case 'switch_open':
    case 'insulating_material':
      return 'info';
  }
}

function diagnosticKey(diagnostic: CircuitDiagnostic): string {
  return [
    diagnostic.code,
    diagnostic.componentIds.join(','),
    diagnostic.wireIds.join(','),
    diagnostic.terminalRefs.map((ref) => terminalKey(ref)).join(','),
  ].join('|');
}

function uniqueTerminalRefs(refs: TerminalRef[]): TerminalRef[] {
  const unique = new Map<string, TerminalRef>();

  for (const ref of refs) {
    unique.set(terminalKey(ref), ref);
  }

  return [...unique.values()].sort(compareTerminalRefs);
}

function sorted(values: Set<string>): string[] {
  return [...values].sort(compareText);
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
