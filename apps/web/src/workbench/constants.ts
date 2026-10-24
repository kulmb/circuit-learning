export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;
export const CELL_SIZE = 64;
export const BOARD_WIDTH = GRID_COLUMNS * CELL_SIZE;
export const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;

export const COMPONENT_HALF_WIDTH = 0.7;
export const COMPONENT_HALF_HEIGHT = 0.4;
export const COMPONENT_WIDTH = COMPONENT_HALF_WIDTH * 2 * CELL_SIZE;
export const COMPONENT_HEIGHT = COMPONENT_HALF_HEIGHT * 2 * CELL_SIZE;

/** Radius of the invisible terminal hit area, in SVG units. */
export const TERMINAL_HIT_RADIUS = 32;

export interface BoardDimensions {
  columns: number;
  rows: number;
  width: number;
  height: number;
}

export function createBoardDimensions(
  columns: number,
  rows: number,
): BoardDimensions {
  const safeColumns = Math.max(1, Math.round(columns));
  const safeRows = Math.max(1, Math.round(rows));

  return {
    columns: safeColumns,
    rows: safeRows,
    width: safeColumns * CELL_SIZE,
    height: safeRows * CELL_SIZE,
  };
}

export const DEFAULT_BOARD: BoardDimensions = createBoardDimensions(
  GRID_COLUMNS,
  GRID_ROWS,
);

/** Levels carry their own grid; the sandbox falls back to the default board. */
export function boardForLevel(
  board?: { columns: number; rows: number },
): BoardDimensions {
  return board === undefined
    ? DEFAULT_BOARD
    : createBoardDimensions(board.columns, board.rows);
}
