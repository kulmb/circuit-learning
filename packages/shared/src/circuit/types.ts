export interface Vec2 {
  x: number;
  y: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export type TerminalPolarity = 'positive' | 'negative' | 'anode' | 'cathode';

export interface Terminal {
  id: string;
  label?: string;
  polarity?: TerminalPolarity;
  offset: Vec2;
}

export interface TerminalRef {
  componentId: string;
  terminalId: string;
}

export type ComponentType =
  | 'battery'
  | 'bulb'
  | 'switch'
  | 'wire'
  | 'motor'
  | 'buzzer'
  | 'led'
  | 'resistor'
  | 'rheostat'
  | 'material'
  | 'diode'
  | 'electromagnet'
  | 'reed'
  | 'relay'
  | 'ldr'
  | 'solar'
  | 'capacitor';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  position: Vec2;
  rotation: Rotation;
  terminals: Terminal[];
}

export interface BatteryComponent extends BaseComponent {
  type: 'battery';
  voltage: number;
  internalResistance: number;
}

export interface BulbComponent extends BaseComponent {
  type: 'bulb';
  resistance: number;
}

export interface SwitchComponent extends BaseComponent {
  type: 'switch';
  closed: boolean;
  resistanceWhenClosed: number;
}

export interface WireComponent extends BaseComponent {
  type: 'wire';
}

export interface MotorComponent extends BaseComponent {
  type: 'motor';
  resistance: number;
}

export interface BuzzerComponent extends BaseComponent {
  type: 'buzzer';
  resistance: number;
}

export interface LedComponent extends BaseComponent {
  type: 'led';
  resistance: number;
  forwardVoltage: number;
}

export interface ResistorComponent extends BaseComponent {
  type: 'resistor';
  resistance: number;
}

export interface RheostatComponent extends BaseComponent {
  type: 'rheostat';
  minResistance: number;
  maxResistance: number;
  /** 0 = minResistance, 1 = maxResistance. */
  wiperPosition: number;
}

export interface MaterialComponent extends BaseComponent {
  type: 'material';
  conductive: boolean;
  resistanceWhenConductive: number;
}

export interface DiodeComponent extends BaseComponent {
  type: 'diode';
  resistance: number;
  forwardVoltage: number;
}

export interface ElectromagnetComponent extends BaseComponent {
  type: 'electromagnet';
  resistance: number;
  turns: number;
}

export interface ReedComponent extends BaseComponent {
  type: 'reed';
  magnetNear: boolean;
  normallyOpen: boolean;
  resistanceWhenClosed: number;
}

export interface RelayComponent extends BaseComponent {
  type: 'relay';
  coilResistance: number;
  contactResistance: number;
  threshold: number;
  normallyClosed: boolean;
  closed: boolean;
}

export interface LdrComponent extends BaseComponent {
  type: 'ldr';
  lightResistance: number;
  darkResistance: number;
  /** 0 = dark, 1 = bright light. */
  lightLevel: number;
}

export interface SolarComponent extends BaseComponent {
  type: 'solar';
  voltage: number;
  internalResistance: number;
  /** 0 = dark, 1 = bright light. */
  lightLevel: number;
}

export interface CapacitorComponent extends BaseComponent {
  type: 'capacitor';
  capacitance: number;
  initialVoltage: number;
}

export type CircuitComponent =
  | BatteryComponent
  | BulbComponent
  | SwitchComponent
  | WireComponent
  | MotorComponent
  | BuzzerComponent
  | LedComponent
  | ResistorComponent
  | RheostatComponent
  | MaterialComponent
  | DiodeComponent
  | ElectromagnetComponent
  | ReedComponent
  | RelayComponent
  | LdrComponent
  | SolarComponent
  | CapacitorComponent;

export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  points?: Vec2[];
}

export interface Circuit {
  components: CircuitComponent[];
  wires: Wire[];
}

export type QualitativeState = 'off' | 'dim' | 'normal' | 'bright';

export interface ComponentState {
  current: number;
  voltage: number;
  /** Absolute electrical power consumed or supplied, in watts. */
  power: number;
  intensity: number;
  state: QualitativeState;
  on: boolean;
  reverseBiased: boolean;
  /** Capacitor charge, 0 = empty, 1 = full. */
  charge?: number;
  /** Electromagnet strength, 0 = none, 1 = strong. */
  magneticStrength?: number;
  /** Reed switch closed by a nearby magnet. */
  magnetNear?: boolean;
  /** Relay contact closed. */
  relayClosed?: boolean;
  /** Branch currents for multi-terminal components, from first to second terminal. */
  branchCurrents?: Record<string, number>;
}

export type DiagnosticCode =
  | 'missing_battery'
  | 'missing_source'
  | 'open_circuit'
  | 'short_circuit'
  | 'bulb_one_side'
  | 'switch_open'
  | 'insulating_material'
  | 'led_reversed'
  | 'diode_reversed'
  | 'simulation_error';

export type DiagnosticSeverity = 'info' | 'warning' | 'danger';

export interface CircuitDiagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  componentIds: string[];
  terminalRefs: TerminalRef[];
  wireIds: string[];
}

export interface ShortCircuitInfo {
  wireIds: string[];
  componentIds: string[];
  current: number | null;
}

export interface CircuitDescription {
  ok: boolean;
  closed: boolean;
  shortCircuit: boolean;
  openCircuit: boolean;
  missingBattery: boolean;
  missingSource: boolean;
  bulbOneSide: boolean;
  switchOpen: boolean;
  insulatingMaterial: boolean;
  ledReversed: boolean;
  diodeReversed: boolean;
  danglingTerminals: TerminalRef[];
  diagnostics: CircuitDiagnostic[];
  shortCircuitInfo: ShortCircuitInfo | null;
}

export interface CircuitSimulation extends CircuitDescription {
  states: Record<string, ComponentState>;
  /** Signed current for each loose wire, positive from wire.from to wire.to. */
  wireCurrents: Record<string, number>;
}
