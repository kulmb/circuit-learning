import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardDimensions } from './constants';
import {
  boardScale,
  clampView,
  defaultView,
  isDefaultView,
  isTerminalTooSmall,
  type BoardView,
  type Size,
} from './viewport';

export interface BoardViewportState {
  view: BoardView;
  /** CSS pixels per logical board unit at the current zoom. */
  scale: number;
  /** True when terminals are too small for a reliable tap. */
  pannable: boolean;
  isDefault: boolean;
  setView: (update: BoardView | ((current: BoardView) => BoardView)) => void;
  resetView: () => void;
}

/**
 * Measures the rendered SVG and keeps the board view (zoom + center) in
 * logical units. The view survives resizes and rotations: only the fit scale
 * and the letterbox offsets are recomputed.
 */
export function useBoardViewport(
  element: SVGSVGElement | null,
  board: BoardDimensions,
): BoardViewportState {
  const [view, setViewState] = useState<BoardView>(() => defaultView(board));
  const [elementSize, setElementSize] = useState<Size | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;

  useEffect(() => {
    setViewState(defaultView(board));
  }, [board.width, board.height]);

  useEffect(() => {
    if (element === null) {
      setElementSize(null);
      return;
    }

    function update(): void {
      if (element === null) {
        return;
      }

      const rect = element.getBoundingClientRect();
      setElementSize(
        rect.width > 0 && rect.height > 0
          ? { width: rect.width, height: rect.height }
          : null,
      );
    }

    update();

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(element);
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [element]);

  const setView = useCallback(
    (update: BoardView | ((current: BoardView) => BoardView)) => {
      setViewState((current) => {
        const candidate =
          typeof update === 'function' ? update(current) : update;

        return clampView(candidate, boardRef.current);
      });
    },
    [],
  );

  const resetView = useCallback(() => {
    setViewState(defaultView(boardRef.current));
  }, []);

  const scale =
    elementSize === null ? 1 : boardScale(elementSize, view, board);

  return {
    view,
    scale,
    pannable: isTerminalTooSmall(scale),
    isDefault: isDefaultView(view, board),
    setView,
    resetView,
  };
}
