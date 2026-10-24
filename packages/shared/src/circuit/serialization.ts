import {
  EXPECTED_TERMINAL_IDS,
  ROTATIONS,
  isComponentType,
} from './components';
import { CircuitError } from './errors';
import { ID_SEPARATOR, terminalKey } from './ids';
import type {
  Circuit,
  CircuitComponent,
  Rotation,
  Terminal,
  TerminalPolarity,
  TerminalRef,
  Vec2,
  Wire,
} from './types';

export const CIRCUIT_FORMAT_VERSION = 1 as const;

export interface CircuitDocument {
  version: typeof CIRCUIT_FORMAT_VERSION;
  components: CircuitComponent[];
  wires: Wire[];
}

export function serializeCircuit(circuit: Circuit): CircuitDocument {
  const validated = deserializeCircuit({
    version: CIRCUIT_FORMAT_VERSION,
    components: circuit.components,
    wires: circuit.wires,
  });

  return {
    version: CIRCUIT_FORMAT_VERSION,
    components: validated.components,
    wires: validated.wires,
  };
}

export function deserializeCircuit(input: unknown): Circuit {
  const value = typeof input === 'string' ? parseJson(input) : input;

  if (!isRecord(value)) {
    fail('Circuit document must be an object');
  }
  if (value['version'] !== CIRCUIT_FORMAT_VERSION) {
    fail(`Unsupported circuit format version: ${String(value['version'])}`);
  }

  const rawComponents = value['components'];
  const rawWires = value['wires'];

  if (!Array.isArray(rawComponents)) {
    fail('Circuit components must be an array');
  }
  if (!Array.isArray(rawWires)) {
    fail('Circuit wires must be an array');
  }

  const components = rawComponents.map((raw, index) =>
    parseComponent(raw, `components[${index}]`),
  );
  const usedIds = new Set<string>();
  const terminalKeys = new Set<string>();

  for (const component of components) {
    if (usedIds.has(component.id)) {
      fail(`Duplicate circuit id: ${component.id}`);
    }
    usedIds.add(component.id);

    for (const terminal of component.terminals) {
      const key = terminalKey({
        componentId: component.id,
        terminalId: terminal.id,
      });
      if (terminalKeys.has(key)) {
        fail(`Duplicate terminal reference: ${key}`);
      }
      terminalKeys.add(key);
    }
  }

  const wires = rawWires.map((raw, index) => parseWire(raw, `wires[${index}]`));

  for (const wire of wires) {
    if (usedIds.has(wire.id)) {
      fail(`Duplicate circuit id: ${wire.id}`);
    }
    usedIds.add(wire.id);

    if (!terminalKeys.has(terminalKey(wire.from))) {
      fail(`Wire ${wire.id} references an unknown source terminal`);
    }
    if (!terminalKeys.has(terminalKey(wire.to))) {
      fail(`Wire ${wire.id} references an unknown target terminal`);
    }
  }

  return { components, wires };
}

function parseComponent(raw: unknown, path: string): CircuitComponent {
  if (!isRecord(raw)) {
    fail(`${path} must be an object`);
  }

  const id = readId(raw, 'id', path);
  const type = raw['type'];

  if (!isComponentType(type)) {
    fail(`${path}.type is not a supported component type`);
  }

  const position = readVec2(raw['position'], `${path}.position`);
  const rotation = readRotation(raw['rotation'], `${path}.rotation`);
  const terminals = parseTerminals(raw['terminals'], `${path}.terminals`);
  const terminalIds = new Set(terminals.map((terminal) => terminal.id));
  const expectedTerminals = EXPECTED_TERMINAL_IDS[type];

  if (
    terminals.length !== expectedTerminals.length ||
    expectedTerminals.some((terminalId) => !terminalIds.has(terminalId))
  ) {
    fail(`${path} does not expose the terminals expected for ${type}`);
  }

  const base = { id, position, rotation, terminals };

  switch (type) {
    case 'battery':
      return {
        ...base,
        type,
        voltage: readPositiveNumber(raw, 'voltage', path),
        internalResistance: readPositiveNumber(raw, 'internalResistance', path),
      };
    case 'bulb':
      return {
        ...base,
        type,
        resistance: readPositiveNumber(raw, 'resistance', path),
      };
    case 'switch':
      return {
        ...base,
        type,
        closed: readBoolean(raw, 'closed', path),
        resistanceWhenClosed: readPositiveNumber(raw, 'resistanceWhenClosed', path),
      };
    case 'wire':
      return { ...base, type };
    case 'motor':
      return {
        ...base,
        type,
        resistance: readPositiveNumber(raw, 'resistance', path),
      };
    case 'buzzer':
      return {
        ...base,
        type,
        resistance: readPositiveNumber(raw, 'resistance', path),
      };
    case 'led':
      return {
        ...base,
        type,
        resistance: readPositiveNumber(raw, 'resistance', path),
        forwardVoltage: readNonNegativeNumber(raw, 'forwardVoltage', path),
      };
    case 'resistor':
      return {
        ...base,
        type,
        resistance: readPositiveNumber(raw, 'resistance', path),
      };
    case 'material':
      return {
        ...base,
        type,
        conductive: readBoolean(raw, 'conductive', path),
        resistanceWhenConductive: readPositiveNumber(
          raw,
          'resistanceWhenConductive',
          path,
        ),
      };
  }
}

function parseTerminals(value: unknown, path: string): Terminal[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${path} must be a non-empty array`);
  }

  const terminals = value.map((raw, index) => parseTerminal(raw, `${path}[${index}]`));
  const ids = new Set<string>();

  for (const terminal of terminals) {
    if (ids.has(terminal.id)) {
      fail(`Duplicate terminal ${terminal.id} in ${path}`);
    }
    ids.add(terminal.id);
  }

  return terminals;
}

function parseTerminal(raw: unknown, path: string): Terminal {
  if (!isRecord(raw)) {
    fail(`${path} must be an object`);
  }

  const terminal: Terminal = {
    id: readId(raw, 'id', path),
    offset: readVec2(raw['offset'], `${path}.offset`),
  };

  const label = raw['label'];
  if (label !== undefined) {
    if (typeof label !== 'string') {
      fail(`${path}.label must be a string`);
    }
    terminal.label = label;
  }

  const polarity = raw['polarity'];
  if (polarity !== undefined) {
    if (!isTerminalPolarity(polarity)) {
      fail(`${path}.polarity is invalid`);
    }
    terminal.polarity = polarity;
  }

  return terminal;
}

function parseWire(raw: unknown, path: string): Wire {
  if (!isRecord(raw)) {
    fail(`${path} must be an object`);
  }

  const wire: Wire = {
    id: readId(raw, 'id', path),
    from: parseTerminalRef(raw['from'], `${path}.from`),
    to: parseTerminalRef(raw['to'], `${path}.to`),
  };

  const points = raw['points'];
  if (points !== undefined) {
    if (!Array.isArray(points)) {
      fail(`${path}.points must be an array`);
    }
    wire.points = points.map((point, index) =>
      readVec2(point, `${path}.points[${index}]`),
    );
  }

  return wire;
}

function parseTerminalRef(value: unknown, path: string): TerminalRef {
  if (!isRecord(value)) {
    fail(`${path} must be an object`);
  }

  return {
    componentId: readId(value, 'componentId', path),
    terminalId: readId(value, 'terminalId', path),
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    fail('Circuit document is not valid JSON');
  }
}

function readId(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key];

  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value.includes(ID_SEPARATOR)
  ) {
    fail(`${path}.${key} must be a non-empty id`);
  }

  return value;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
): boolean {
  const value = record[key];

  if (typeof value !== 'boolean') {
    fail(`${path}.${key} must be a boolean`);
  }

  return value;
}

function readPositiveNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = readNumber(record, key, path);

  if (value <= 0) {
    fail(`${path}.${key} must be positive`);
  }

  return value;
}

function readNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = readNumber(record, key, path);

  if (value < 0) {
    fail(`${path}.${key} must be zero or positive`);
  }

  return value;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${path}.${key} must be a finite number`);
  }

  return value;
}

function readVec2(value: unknown, path: string): Vec2 {
  if (!isRecord(value)) {
    fail(`${path} must be an object`);
  }

  return {
    x: readNumber(value, 'x', path),
    y: readNumber(value, 'y', path),
  };
}

function readRotation(value: unknown, path: string): Rotation {
  if (typeof value !== 'number' || !ROTATIONS.includes(value as Rotation)) {
    fail(`${path} must be one of 0, 90, 180 or 270`);
  }

  return value as Rotation;
}

function isTerminalPolarity(value: unknown): value is TerminalPolarity {
  return (
    value === 'positive' ||
    value === 'negative' ||
    value === 'anode' ||
    value === 'cathode'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new CircuitError('invalid_serialized_circuit', message);
}
