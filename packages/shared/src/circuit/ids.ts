import { CircuitError } from './errors';
import type { TerminalRef } from './types';

export const ID_SEPARATOR = '\u0000';

export function assertId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CircuitError('invalid_circuit', `${field} must be a non-empty string`);
  }
  if (value.includes(ID_SEPARATOR)) {
    throw new CircuitError('invalid_circuit', `${field} contains a forbidden character`);
  }
  return value;
}

export function terminalKey(ref: TerminalRef): string {
  return `${ref.componentId}${ID_SEPARATOR}${ref.terminalId}`;
}

export function createTerminalRef(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}
