export type CircuitErrorCode =
  | 'invalid_circuit'
  | 'invalid_serialized_circuit'
  | 'simulation_error';

export class CircuitError extends Error {
  readonly code: CircuitErrorCode;

  constructor(code: CircuitErrorCode, message: string) {
    super(message);
    this.name = 'CircuitError';
    this.code = code;
  }
}
