import type {
  BatteryComponent,
  Circuit,
  CircuitSimulation,
  SolarComponent,
} from './types';

export const METER_IDS = [
  'tension',
  'courant',
  'resistance',
  'puissance',
  'charge',
  'aimant',
] as const;

export type MeterId = (typeof METER_IDS)[number];

export type MeterStatus = 'low' | 'medium' | 'high' | 'off' | 'alert';

export interface MeterReading {
  id: MeterId;
  status: MeterStatus;
  /** Raw value, kept for tests and adults. Never shown to the child. */
  value: number | null;
}

export type CircuitMeters = Record<MeterId, MeterReading>;

const ACTIVE_CURRENT = 1e-3;

/**
 * Qualitative thresholds. The game never displays volts, amps, ohms or watts;
 * these limits only decide how many segments the Zap-mètre lights up.
 */
const VOLTAGE_LOW = 3;
const VOLTAGE_HIGH = 7.5;
const CURRENT_LOW = 0.3;
const CURRENT_HIGH = 0.6;
const RESISTANCE_LOW = 8;
const RESISTANCE_HIGH = 18;
const POWER_LOW = 1.5;
const POWER_HIGH = 4;
const CHARGE_LOW = 0.4;
const CHARGE_HIGH = 0.8;
const MAGNET_LOW = 0.35;
const MAGNET_HIGH = 0.7;

type ExtraReadings = Pick<CircuitMeters, 'charge' | 'aimant'>;

export function readCircuitMeters(
  circuit: Circuit,
  simulation: CircuitSimulation,
): CircuitMeters {
  const sources = circuit.components.filter(isSourceComponent);
  const extras = extraReadings(simulation);

  if (sources.length === 0) {
    return allReadings('off', extras);
  }

  if (
    simulation.shortCircuit ||
    simulation.diagnostics.some(
      (diagnostic) => diagnostic.code === 'simulation_error',
    )
  ) {
    return allReadings('alert', extras);
  }

  const nominalVoltage = sources.reduce(
    (total, source) => total + sourceVoltage(source),
    0,
  );
  const tension = reading(
    'tension',
    nominalVoltage,
    VOLTAGE_LOW,
    VOLTAGE_HIGH,
  );

  if (!simulation.closed) {
    return {
      tension,
      courant: offReading('courant'),
      resistance: offReading('resistance'),
      puissance: offReading('puissance'),
      ...extras,
    };
  }

  let maxCurrent = 0;

  for (const source of sources) {
    const state = simulation.states[source.id];

    if (state !== undefined) {
      maxCurrent = Math.max(maxCurrent, Math.abs(state.current));
    }
  }

  if (maxCurrent <= ACTIVE_CURRENT) {
    return {
      tension,
      courant: offReading('courant'),
      resistance: offReading('resistance'),
      puissance: offReading('puissance'),
      ...extras,
    };
  }

  return {
    tension,
    courant: reading('courant', maxCurrent, CURRENT_LOW, CURRENT_HIGH),
    resistance: reading(
      'resistance',
      nominalVoltage / maxCurrent,
      RESISTANCE_LOW,
      RESISTANCE_HIGH,
    ),
    puissance: reading(
      'puissance',
      nominalVoltage * maxCurrent,
      POWER_LOW,
      POWER_HIGH,
    ),
    ...extras,
  };
}

function extraReadings(simulation: CircuitSimulation): ExtraReadings {
  let maxCharge = 0;
  let maxMagnet = 0;

  for (const state of Object.values(simulation.states)) {
    maxCharge = Math.max(maxCharge, state.charge ?? 0);
    maxMagnet = Math.max(maxMagnet, state.magneticStrength ?? 0);
  }

  return {
    charge:
      maxCharge <= 0.02
        ? offReading('charge')
        : reading('charge', maxCharge, CHARGE_LOW, CHARGE_HIGH),
    aimant:
      maxMagnet <= 0.02
        ? offReading('aimant')
        : reading('aimant', maxMagnet, MAGNET_LOW, MAGNET_HIGH),
  };
}

function reading(
  id: MeterId,
  value: number,
  low: number,
  high: number,
): MeterReading {
  if (!Number.isFinite(value)) {
    return offReading(id);
  }

  return {
    id,
    status: value < low ? 'low' : value < high ? 'medium' : 'high',
    value,
  };
}

function offReading(id: MeterId): MeterReading {
  return { id, status: 'off', value: null };
}

function allReadings(status: MeterStatus, extras: ExtraReadings): CircuitMeters {
  return {
    tension: { id: 'tension', status, value: null },
    courant: { id: 'courant', status, value: null },
    resistance: { id: 'resistance', status, value: null },
    puissance: { id: 'puissance', status, value: null },
    charge: extras.charge,
    aimant: extras.aimant,
  };
}

function sourceVoltage(source: BatteryComponent | SolarComponent): number {
  return source.type === 'battery'
    ? source.voltage
    : source.voltage * source.lightLevel;
}

function isSourceComponent(
  component: Circuit['components'][number],
): component is BatteryComponent | SolarComponent {
  return component.type === 'battery' || component.type === 'solar';
}
