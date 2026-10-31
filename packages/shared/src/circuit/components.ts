import { CircuitError } from './errors';
import { assertId } from './ids';
import type {
  CircuitComponent,
  ComponentType,
  RheostatComponent,
  Rotation,
  Terminal,
  TerminalRef,
  Vec2,
  Wire,
} from './types';

export const COMPONENT_TYPES = [
  'battery',
  'bulb',
  'switch',
  'wire',
  'motor',
  'buzzer',
  'led',
  'resistor',
  'rheostat',
  'material',
  'diode',
  'electromagnet',
  'reed',
  'relay',
  'ldr',
  'solar',
  'capacitor',
] as const satisfies readonly ComponentType[];

export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

export const DEFAULT_BATTERY_VOLTAGE = 4.5;
export const DEFAULT_BATTERY_INTERNAL_RESISTANCE = 0.5;
export const DEFAULT_BULB_RESISTANCE = 10;
export const DEFAULT_MOTOR_RESISTANCE = 8;
export const DEFAULT_BUZZER_RESISTANCE = 15;
export const DEFAULT_LED_RESISTANCE = 100;
export const DEFAULT_LED_FORWARD_VOLTAGE = 0.6;
export const DEFAULT_DIODE_RESISTANCE = 100;
export const DEFAULT_DIODE_FORWARD_VOLTAGE = 0.6;
export const DEFAULT_ELECTROMAGNET_RESISTANCE = 8;
export const DEFAULT_ELECTROMAGNET_TURNS = 40;
export const DEFAULT_REED_RESISTANCE = 0.01;
export const DEFAULT_RELAY_COIL_RESISTANCE = 100;
export const DEFAULT_RELAY_CONTACT_RESISTANCE = 0.01;
export const DEFAULT_RELAY_THRESHOLD = 0.005;
export const DEFAULT_LDR_LIGHT_RESISTANCE = 2;
export const DEFAULT_LDR_DARK_RESISTANCE = 1000;
export const DEFAULT_LIGHT_LEVEL = 1;
export const DEFAULT_SOLAR_VOLTAGE = 4.5;
export const DEFAULT_SOLAR_INTERNAL_RESISTANCE = 0.5;
export const DEFAULT_CAPACITOR_CAPACITANCE = 0.2;
export const DEFAULT_CAPACITOR_INITIAL_VOLTAGE = 0;
export const DEFAULT_SWITCH_RESISTANCE = 0.01;
export const DEFAULT_MATERIAL_RESISTANCE = 0.01;
export const DEFAULT_RESISTOR_RESISTANCE = 10;
export const DEFAULT_RHEOSTAT_MIN_RESISTANCE = 2;
export const DEFAULT_RHEOSTAT_MAX_RESISTANCE = 20;
export const DEFAULT_RHEOSTAT_WIPER_POSITION = 0;
export const SHORT_CIRCUIT_CURRENT = 5;

export const NOMINAL_CURRENTS = {
  bulb: 0.4,
  motor: 0.4,
  buzzer: 0.25,
  led: 0.04,
  diode: 0.04,
  electromagnet: 0.4,
} as const;

export const EXPECTED_TERMINAL_IDS: Record<ComponentType, readonly string[]> = {
  battery: ['positive', 'negative'],
  bulb: ['a', 'b'],
  switch: ['a', 'b'],
  wire: ['a', 'b'],
  motor: ['a', 'b'],
  buzzer: ['a', 'b'],
  led: ['anode', 'cathode'],
  resistor: ['a', 'b'],
  rheostat: ['a', 'b'],
  material: ['a', 'b'],
  diode: ['anode', 'cathode'],
  electromagnet: ['a', 'b'],
  reed: ['a', 'b'],
  relay: ['coilA', 'coilB', 'contactA', 'contactB'],
  ldr: ['a', 'b'],
  solar: ['positive', 'negative'],
  capacitor: ['a', 'b'],
};

function twoTerminals(): Terminal[] {
  return [
    { id: 'a', offset: { x: -0.6, y: 0 } },
    { id: 'b', offset: { x: 0.6, y: 0 } },
  ];
}

const TERMINAL_LAYOUTS: Record<ComponentType, readonly Terminal[]> = {
  battery: [
    { id: 'positive', label: '+', polarity: 'positive', offset: { x: -0.6, y: 0 } },
    { id: 'negative', label: '−', polarity: 'negative', offset: { x: 0.6, y: 0 } },
  ],
  bulb: twoTerminals(),
  switch: twoTerminals(),
  wire: twoTerminals(),
  motor: twoTerminals(),
  buzzer: twoTerminals(),
  led: [
    { id: 'anode', label: 'A', polarity: 'anode', offset: { x: -0.6, y: 0 } },
    { id: 'cathode', label: 'K', polarity: 'cathode', offset: { x: 0.6, y: 0 } },
  ],
  resistor: twoTerminals(),
  rheostat: twoTerminals(),
  material: twoTerminals(),
  diode: [
    { id: 'anode', label: 'A', polarity: 'anode', offset: { x: -0.6, y: 0 } },
    { id: 'cathode', label: 'K', polarity: 'cathode', offset: { x: 0.6, y: 0 } },
  ],
  electromagnet: twoTerminals(),
  reed: twoTerminals(),
  relay: [
    { id: 'coilA', label: 'B1', offset: { x: -0.6, y: -0.3 } },
    { id: 'coilB', label: 'B2', offset: { x: -0.6, y: 0.3 } },
    { id: 'contactA', label: '1', offset: { x: 0.6, y: -0.3 } },
    { id: 'contactB', label: '2', offset: { x: 0.6, y: 0.3 } },
  ],
  ldr: twoTerminals(),
  solar: [
    { id: 'positive', label: '+', polarity: 'positive', offset: { x: -0.6, y: 0 } },
    { id: 'negative', label: '−', polarity: 'negative', offset: { x: 0.6, y: 0 } },
  ],
  capacitor: twoTerminals(),
};

export interface CreateComponentOptions {
  id: string;
  position?: Vec2;
  rotation?: Rotation;
  closed?: boolean;
  conductive?: boolean;
  resistance?: number;
  voltage?: number;
  internalResistance?: number;
  forwardVoltage?: number;
  minResistance?: number;
  maxResistance?: number;
  wiperPosition?: number;
  turns?: number;
  magnetNear?: boolean;
  normallyOpen?: boolean;
  coilResistance?: number;
  contactResistance?: number;
  threshold?: number;
  normallyClosed?: boolean;
  lightResistance?: number;
  darkResistance?: number;
  lightLevel?: number;
  capacitance?: number;
  initialVoltage?: number;
}

export function isComponentType(value: unknown): value is ComponentType {
  return (
    typeof value === 'string' && (COMPONENT_TYPES as readonly string[]).includes(value)
  );
}

export function createComponent(
  type: ComponentType,
  options: CreateComponentOptions,
): CircuitComponent {
  const id = assertId(options.id, 'component id');
  const position = options.position ? cloneVec2(options.position) : { x: 0, y: 0 };
  const rotation = options.rotation ?? 0;

  if (!ROTATIONS.includes(rotation)) {
    throw new CircuitError('invalid_circuit', `Invalid rotation for component ${id}`);
  }

  const base = {
    id,
    position,
    rotation,
    terminals: TERMINAL_LAYOUTS[type].map(cloneTerminal),
  };

  switch (type) {
    case 'battery':
      return {
        ...base,
        type,
        voltage: positive(options.voltage ?? DEFAULT_BATTERY_VOLTAGE, 'voltage'),
        internalResistance: positive(
          options.internalResistance ?? DEFAULT_BATTERY_INTERNAL_RESISTANCE,
          'internal resistance',
        ),
      };
    case 'bulb':
      return {
        ...base,
        type,
        resistance: positive(options.resistance ?? DEFAULT_BULB_RESISTANCE, 'resistance'),
      };
    case 'switch':
      return {
        ...base,
        type,
        closed: options.closed ?? false,
        resistanceWhenClosed: positive(
          options.resistance ?? DEFAULT_SWITCH_RESISTANCE,
          'closed resistance',
        ),
      };
    case 'wire':
      return { ...base, type };
    case 'motor':
      return {
        ...base,
        type,
        resistance: positive(options.resistance ?? DEFAULT_MOTOR_RESISTANCE, 'resistance'),
      };
    case 'buzzer':
      return {
        ...base,
        type,
        resistance: positive(options.resistance ?? DEFAULT_BUZZER_RESISTANCE, 'resistance'),
      };
    case 'led':
      return {
        ...base,
        type,
        resistance: positive(options.resistance ?? DEFAULT_LED_RESISTANCE, 'resistance'),
        forwardVoltage: nonNegative(
          options.forwardVoltage ?? DEFAULT_LED_FORWARD_VOLTAGE,
          'forward voltage',
        ),
      };
    case 'resistor':
      return {
        ...base,
        type,
        resistance: positive(
          options.resistance ?? DEFAULT_RESISTOR_RESISTANCE,
          'resistance',
        ),
      };
    case 'rheostat': {
      const minResistance = positive(
        options.minResistance ?? DEFAULT_RHEOSTAT_MIN_RESISTANCE,
        'minimum resistance',
      );
      const maxResistance = positive(
        options.maxResistance ?? DEFAULT_RHEOSTAT_MAX_RESISTANCE,
        'maximum resistance',
      );

      if (maxResistance <= minResistance) {
        throw new CircuitError(
          'invalid_circuit',
          `Rheostat ${id} maximum resistance must exceed its minimum`,
        );
      }

      return {
        ...base,
        type,
        minResistance,
        maxResistance,
        wiperPosition: unitInterval(
          options.wiperPosition ?? DEFAULT_RHEOSTAT_WIPER_POSITION,
          'wiper position',
        ),
      };
    }
    case 'material':
      return {
        ...base,
        type,
        conductive: options.conductive ?? false,
        resistanceWhenConductive: positive(
          options.resistance ?? DEFAULT_MATERIAL_RESISTANCE,
          'conductive resistance',
        ),
      };
    case 'diode':
      return {
        ...base,
        type,
        resistance: positive(
          options.resistance ?? DEFAULT_DIODE_RESISTANCE,
          'resistance',
        ),
        forwardVoltage: nonNegative(
          options.forwardVoltage ?? DEFAULT_DIODE_FORWARD_VOLTAGE,
          'forward voltage',
        ),
      };
    case 'electromagnet':
      return {
        ...base,
        type,
        resistance: positive(
          options.resistance ?? DEFAULT_ELECTROMAGNET_RESISTANCE,
          'resistance',
        ),
        turns: positive(
          options.turns ?? DEFAULT_ELECTROMAGNET_TURNS,
          'turns',
        ),
      };
    case 'reed':
      return {
        ...base,
        type,
        magnetNear: options.magnetNear ?? false,
        normallyOpen: options.normallyOpen ?? true,
        resistanceWhenClosed: positive(
          options.resistance ?? DEFAULT_REED_RESISTANCE,
          'closed resistance',
        ),
      };
    case 'relay': {
      const normallyClosed = options.normallyClosed ?? false;

      return {
        ...base,
        type,
        coilResistance: positive(
          options.coilResistance ?? DEFAULT_RELAY_COIL_RESISTANCE,
          'coil resistance',
        ),
        contactResistance: positive(
          options.contactResistance ?? DEFAULT_RELAY_CONTACT_RESISTANCE,
          'contact resistance',
        ),
        threshold: positive(
          options.threshold ?? DEFAULT_RELAY_THRESHOLD,
          'threshold',
        ),
        normallyClosed,
        closed: options.closed ?? normallyClosed,
      };
    }
    case 'ldr': {
      const lightResistance = positive(
        options.lightResistance ?? DEFAULT_LDR_LIGHT_RESISTANCE,
        'light resistance',
      );
      const darkResistance = positive(
        options.darkResistance ?? DEFAULT_LDR_DARK_RESISTANCE,
        'dark resistance',
      );

      if (darkResistance <= lightResistance) {
        throw new CircuitError(
          'invalid_circuit',
          `LDR ${id} dark resistance must exceed its light resistance`,
        );
      }

      return {
        ...base,
        type,
        lightResistance,
        darkResistance,
        lightLevel: unitInterval(
          options.lightLevel ?? DEFAULT_LIGHT_LEVEL,
          'light level',
        ),
      };
    }
    case 'solar':
      return {
        ...base,
        type,
        voltage: positive(options.voltage ?? DEFAULT_SOLAR_VOLTAGE, 'voltage'),
        internalResistance: positive(
          options.internalResistance ?? DEFAULT_SOLAR_INTERNAL_RESISTANCE,
          'internal resistance',
        ),
        lightLevel: unitInterval(
          options.lightLevel ?? DEFAULT_LIGHT_LEVEL,
          'light level',
        ),
      };
    case 'capacitor':
      return {
        ...base,
        type,
        capacitance: positive(
          options.capacitance ?? DEFAULT_CAPACITOR_CAPACITANCE,
          'capacitance',
        ),
        initialVoltage: nonNegative(
          options.initialVoltage ?? DEFAULT_CAPACITOR_INITIAL_VOLTAGE,
          'initial voltage',
        ),
      };
  }
}

export function createWire(
  id: string,
  from: TerminalRef,
  to: TerminalRef,
  points?: Vec2[],
): Wire {
  const wire: Wire = {
    id: assertId(id, 'wire id'),
    from: cloneTerminalRef(from),
    to: cloneTerminalRef(to),
  };

  if (points !== undefined) {
    wire.points = points.map(cloneVec2);
  }

  return wire;
}

export function cloneComponent(component: CircuitComponent): CircuitComponent {
  return {
    ...component,
    position: cloneVec2(component.position),
    terminals: component.terminals.map(cloneTerminal),
  } as CircuitComponent;
}

export function cloneWire(wire: Wire): Wire {
  const clone: Wire = {
    id: wire.id,
    from: cloneTerminalRef(wire.from),
    to: cloneTerminalRef(wire.to),
  };

  if (wire.points !== undefined) {
    clone.points = wire.points.map(cloneVec2);
  }

  return clone;
}

/** Effective resistance of a rheostat between its two terminals. */
export function rheostatResistance(component: RheostatComponent): number {
  return (
    component.minResistance +
    (component.maxResistance - component.minResistance) *
      component.wiperPosition
  );
}

export function getTerminalWorldPosition(
  component: CircuitComponent,
  terminalId: string,
): Vec2 {
  const terminal = component.terminals.find((item) => item.id === terminalId);
  if (!terminal) {
    throw new CircuitError(
      'invalid_circuit',
      `Component ${component.id} has no terminal ${terminalId}`,
    );
  }

  const rotated = rotateOffset(terminal.offset, component.rotation);
  return {
    x: component.position.x + rotated.x,
    y: component.position.y + rotated.y,
  };
}

function rotateOffset(offset: Vec2, rotation: Rotation): Vec2 {
  switch (rotation) {
    case 0:
      return { x: offset.x, y: offset.y };
    case 90:
      return { x: -offset.y, y: offset.x };
    case 180:
      return { x: -offset.x, y: -offset.y };
    case 270:
      return { x: offset.y, y: -offset.x };
  }
}

function cloneTerminal(terminal: Terminal): Terminal {
  const clone: Terminal = {
    id: terminal.id,
    offset: cloneVec2(terminal.offset),
  };

  if (terminal.label !== undefined) {
    clone.label = terminal.label;
  }
  if (terminal.polarity !== undefined) {
    clone.polarity = terminal.polarity;
  }

  return clone;
}

function cloneTerminalRef(ref: TerminalRef): TerminalRef {
  return {
    componentId: assertId(ref.componentId, 'terminal reference component id'),
    terminalId: assertId(ref.terminalId, 'terminal reference terminal id'),
  };
}

function cloneVec2(value: Vec2): Vec2 {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new CircuitError('invalid_circuit', 'Coordinates must be finite numbers');
  }
  return { x: value.x, y: value.y };
}

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CircuitError('invalid_circuit', `${field} must be a positive number`);
  }
  return value;
}

function nonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new CircuitError('invalid_circuit', `${field} must be zero or positive`);
  }
  return value;
}

function unitInterval(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new CircuitError(
      'invalid_circuit',
      `${field} must be between zero and one`,
    );
  }
  return value;
}
