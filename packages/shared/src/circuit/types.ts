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
  | 'material';

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

export interface MaterialComponent extends BaseComponent {
  type: 'material';
  conductive: boolean;
  resistanceWhenConductive: number;
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
  | MaterialComponent;

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
  intensity: number;
  state: QualitativeState;
  on: boolean;
  reverseBiased: boolean;
}

export type DiagnosticCode =
  | 'missing_battery'
  | 'open_circuit'
  | 'short_circuit'
  | 'bulb_one_side'
  | 'switch_open'
  | 'insulating_material'
  | 'led_reversed'
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
  bulbOneSide: boolean;
  switchOpen: boolean;
  insulatingMaterial: boolean;
  ledReversed: boolean;
  danglingTerminals: TerminalRef[];
  diagnostics: CircuitDiagnostic[];
  shortCircuitInfo: ShortCircuitInfo | null;
}

export interface CircuitSimulation extends CircuitDescription {
  states: Record<string, ComponentState>;
  /** Signed current for each loose wire, positive from wire.from to wire.to. */
  wireCurrents: Record<string, number>;
}
