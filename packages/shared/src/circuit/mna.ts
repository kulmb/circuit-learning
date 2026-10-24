import { CircuitError } from './errors';

/**
 * Solves A * x = b with Gaussian elimination and partial pivoting.
 * Both the matrix and the right-hand side are modified in place.
 */
export function solveLinearSystem(
  matrix: Float64Array,
  rightHandSide: Float64Array,
  size: number,
): Float64Array {
  if (size <= 0) {
    return new Float64Array(0);
  }

  if (matrix.length !== size * size || rightHandSide.length !== size) {
    throw new CircuitError('simulation_error', 'Invalid linear system dimensions');
  }

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    let pivotValue = Math.abs(matrix[column * size + column]!);

    for (let row = column + 1; row < size; row += 1) {
      const candidate = Math.abs(matrix[row * size + column]!);
      if (candidate > pivotValue) {
        pivotValue = candidate;
        pivotRow = row;
      }
    }

    if (pivotValue < 1e-14) {
      throw new CircuitError('simulation_error', 'Singular circuit matrix');
    }

    if (pivotRow !== column) {
      for (let index = column; index < size; index += 1) {
        const current = matrix[column * size + index]!;
        matrix[column * size + index] = matrix[pivotRow * size + index]!;
        matrix[pivotRow * size + index] = current;
      }

      const currentRightHandSide = rightHandSide[column]!;
      rightHandSide[column] = rightHandSide[pivotRow]!;
      rightHandSide[pivotRow] = currentRightHandSide;
    }

    const pivot = matrix[column * size + column]!;

    for (let row = column + 1; row < size; row += 1) {
      const factor = matrix[row * size + column]! / pivot;
      if (factor === 0) {
        continue;
      }

      matrix[row * size + column] = 0;

      for (let index = column + 1; index < size; index += 1) {
        matrix[row * size + index] =
          matrix[row * size + index]! - factor * matrix[column * size + index]!;
      }

      rightHandSide[row] = rightHandSide[row]! - factor * rightHandSide[column]!;
    }
  }

  const solution = new Float64Array(size);

  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = rightHandSide[row]!;

    for (let column = row + 1; column < size; column += 1) {
      sum -= matrix[row * size + column]! * solution[column]!;
    }

    solution[row] = sum / matrix[row * size + row]!;
  }

  return solution;
}
