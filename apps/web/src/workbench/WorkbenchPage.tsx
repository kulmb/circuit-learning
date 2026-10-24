import {
  createComponent,
  type CircuitComponent,
  type CircuitSimulation,
  type Vec2,
} from '@circuits/shared';
import { motion, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { fr } from '../narration/fr';
import { playBuzzerBeep, unlockAudio } from './audio';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CELL_SIZE,
  GRID_COLUMNS,
  GRID_ROWS,
} from './constants';
import type { DisplayMode } from './displayMode';
import { PALETTE_ITEMS, type PaletteItem } from './paletteItems';
import {
  applyTouchOffset,
  clampGridPosition,
  clientToSvgPoint,
  getSvgScale,
  isDragGesture,
  isPointInsideBoard,
  snapToGrid,
  svgToGrid,
  TOUCH_OFFSET_PX,
  type Point,
} from './pointer';
import { WorkbenchSvg } from './WorkbenchSvg';
import { useWorkbenchStore } from './workbenchStore';
import './Workbench.css';

export interface WorkbenchPageProps {
  onBack: () => void;
}

interface PaletteDragState {
  item: PaletteItem;
  pointerId: number;
  clientX: number;
  clientY: number;
  startClient: Point;
  pointerType: string;
  moved: boolean;
  placement: { position: Vec2; component: CircuitComponent } | null;
}

interface ReturningGhost {
  item: PaletteItem;
  from: Point;
  to: Point;
}

interface Status {
  text: string;
  tone: 'success' | 'danger' | 'info' | 'neutral';
}

export function WorkbenchPage({ onBack }: WorkbenchPageProps) {
  const {
    circuit,
    simulation,
    selected,
    pendingTerminal,
    displayMode,
    history,
    addComponent,
    moveComponent,
    rotateComponent,
    toggleSwitch,
    deleteComponent,
    deleteSelection,
    addWire,
    select,
    setPendingTerminal,
    cycleDisplayMode,
    undo,
  } = useWorkbenchStore();

  const reduceMotion = useReducedMotion() ?? false;
  const svgRef = useRef<SVGSVGElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const previousBuzzingRef = useRef<Set<string>>(new Set());
  const [paletteDrag, setPaletteDrag] = useState<PaletteDragState | null>(null);
  const [returningGhost, setReturningGhost] = useState<ReturningGhost | null>(null);
  const [trashActive, setTrashActive] = useState(false);

  const status = getStatus(simulation);
  const ghostPoint = paletteDrag !== null ? paletteGhostPoint(paletteDrag) : null;
  const modeLabel = getModeLabel(displayMode);
  const buzzingKey = circuit.components
    .filter(
      (component) =>
        component.type === 'buzzer' &&
        simulation.states[component.id]?.state !== 'off',
    )
    .map((component) => component.id)
    .sort()
    .join('|');

  useEffect(() => {
    const next = new Set(buzzingKey === '' ? [] : buzzingKey.split('|'));
    let started = false;

    for (const id of next) {
      if (!previousBuzzingRef.current.has(id)) {
        started = true;
      }
    }

    previousBuzzingRef.current = next;

    if (started) {
      playBuzzerBeep();
    }
  }, [buzzingKey]);

  function acquirePointer(pointerId: number): boolean {
    if (activePointerRef.current !== null) {
      return false;
    }

    activePointerRef.current = pointerId;
    return true;
  }

  function releasePointer(pointerId: number): void {
    if (activePointerRef.current === pointerId) {
      activePointerRef.current = null;
    }
  }

  function isOverTrash(clientX: number, clientY: number): boolean {
    const rect = trashRef.current?.getBoundingClientRect();
    if (!rect) {
      return false;
    }

    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function computePlacement(
    clientX: number,
    clientY: number,
    pointerType: string,
    item: PaletteItem,
  ): { position: Vec2; component: CircuitComponent } | null {
    const svg = svgRef.current;
    if (!svg || isOverTrash(clientX, clientY)) {
      return null;
    }

    const svgPoint = clientToSvgPoint(svg, clientX, clientY);
    if (!svgPoint) {
      return null;
    }

    const scale = getSvgScale(svg);
    const adjustedPoint = applyTouchOffset(
      svgPoint,
      pointerType,
      TOUCH_OFFSET_PX / scale,
    );

    if (!isPointInsideBoard(adjustedPoint, BOARD_WIDTH, BOARD_HEIGHT)) {
      return null;
    }

    const gridPoint = snapToGrid(svgToGrid(adjustedPoint, CELL_SIZE));
    const position = clampGridPosition(gridPoint, GRID_COLUMNS, GRID_ROWS);
    const component = createComponent(item.type, {
      id: 'palette-preview',
      position,
      ...(item.options ?? {}),
    });

    return { position, component };
  }

  function handlePalettePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: PaletteItem,
  ): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    unlockAudio();

    if (!acquirePointer(event.pointerId)) {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      releasePointer(event.pointerId);
      return;
    }

    select(null);
    setPendingTerminal(null);

    setPaletteDrag({
      item,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startClient: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      moved: false,
      placement: computePlacement(
        event.clientX,
        event.clientY,
        event.pointerType,
        item,
      ),
    });
  }

  function handlePalettePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = paletteDrag;
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    const moved =
      drag.moved ||
      isDragGesture(drag.startClient, { x: event.clientX, y: event.clientY });
    const placement = computePlacement(
      event.clientX,
      event.clientY,
      drag.pointerType,
      drag.item,
    );

    setPaletteDrag({
      ...drag,
      clientX: event.clientX,
      clientY: event.clientY,
      moved,
      placement,
    });
  }

  function handlePalettePointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = paletteDrag;
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    releasePointer(event.pointerId);

    if (drag.placement !== null) {
      addComponent(drag.item.type, drag.item.options ?? {}, drag.placement.position);
      setPaletteDrag(null);
      return;
    }

    const from = paletteGhostPoint(drag);
    const to = getPaletteItemCenter(drag.item.key);
    setReturningGhost({ item: drag.item, from, to });
    setPaletteDrag(null);
  }

  function handlePalettePointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (paletteDrag?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.pointerId);
    setPaletteDrag(null);
  }

  function handlePaletteLostPointerCapture(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (paletteDrag?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.pointerId);
    setPaletteDrag(null);
  }

  return (
    <div
      className="workbench-page"
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="workbench-header">
        <button
          type="button"
          className="workbench-icon-button"
          onPointerDown={(event) => activateButton(event, onBack)}
        >
          <span aria-hidden="true">←</span>
          <span>{fr.workbench.back}</span>
        </button>

        <div className="workbench-header__title">
          <h1>{fr.workbench.title}</h1>
          <p>{fr.workbench.hint}</p>
        </div>

        <button
          type="button"
          className="workbench-icon-button workbench-mode-button"
          onPointerDown={(event) => activateButton(event, cycleDisplayMode)}
          aria-label={`${fr.workbench.displayMode} : ${modeLabel}`}
        >
          <ViewIcon />
          <span>{modeLabel}</span>
        </button>

        <button
          type="button"
          className="workbench-icon-button"
          onPointerDown={(event) => activateButton(event, undo)}
          disabled={history.length === 0}
        >
          <span aria-hidden="true">↶</span>
          <span>{fr.workbench.undo}</span>
        </button>
      </header>

      <div className="workbench-layout">
        <aside className="palette" aria-label={fr.workbench.paletteTitle}>
          <h2>{fr.workbench.paletteTitle}</h2>
          <div className="palette__items">
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="palette-item"
                data-palette-key={item.key}
                onPointerDown={(event) => handlePalettePointerDown(event, item)}
                onPointerMove={handlePalettePointerMove}
                onPointerUp={handlePalettePointerUp}
                onPointerCancel={handlePalettePointerCancel}
                onLostPointerCapture={handlePaletteLostPointerCapture}
              >
                <span
                  className="palette-item__swatch"
                  style={{ backgroundColor: item.color, color: item.textColor }}
                  aria-hidden="true"
                >
                  {item.shortLabel}
                </span>
                <span className="palette-item__label">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="workbench-board-wrap">
          <div className="workbench-board">
            <WorkbenchSvg
              circuit={circuit}
              simulation={simulation}
              selected={selected}
              pendingTerminal={pendingTerminal}
              displayMode={displayMode}
              previewComponent={paletteDrag?.placement?.component ?? null}
              svgRef={svgRef}
              acquirePointer={acquirePointer}
              releasePointer={releasePointer}
              isOverTrash={isOverTrash}
              onTrashHover={setTrashActive}
              onSelect={select}
              onSetPendingTerminal={setPendingTerminal}
              onMoveComponent={moveComponent}
              onRotateComponent={rotateComponent}
              onDeleteSelection={deleteSelection}
              onDeleteComponent={deleteComponent}
              onToggleSwitch={toggleSwitch}
              onAddWire={addWire}
            />

            <div
              ref={trashRef}
              className={`trash-zone${trashActive ? ' is-active' : ''}`}
              aria-hidden="true"
            >
              <TrashGlyph />
              <span>{fr.workbench.trash}</span>
            </div>
          </div>

          <div
            className={`workbench-status workbench-status--${status.tone}`}
            role="status"
            aria-live="polite"
          >
            <span className="workbench-status__dot" aria-hidden="true" />
            <span>{status.text}</span>
          </div>
        </div>
      </div>

      {paletteDrag !== null && ghostPoint !== null && paletteDrag.placement === null ? (
        <div
          className="palette-ghost"
          aria-hidden="true"
          style={{
            left: ghostPoint.x,
            top: ghostPoint.y,
            backgroundColor: paletteDrag.item.color,
            color: paletteDrag.item.textColor,
          }}
        >
          {paletteDrag.item.shortLabel}
        </div>
      ) : null}

      {returningGhost !== null ? (
        <motion.div
          className="palette-ghost palette-ghost--returning"
          aria-hidden="true"
          style={{
            backgroundColor: returningGhost.item.color,
            color: returningGhost.item.textColor,
          }}
          initial={{
            left: returningGhost.from.x,
            top: returningGhost.from.y,
            opacity: 0.9,
            scale: 1,
          }}
          animate={{
            left: returningGhost.to.x,
            top: returningGhost.to.y,
            opacity: 0,
            scale: 0.55,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
          onAnimationComplete={() => setReturningGhost(null)}
        >
          {returningGhost.item.shortLabel}
        </motion.div>
      ) : null}
    </div>
  );
}

function activateButton(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}

function paletteGhostPoint(drag: PaletteDragState): Point {
  return {
    x: drag.clientX,
    y: drag.clientY - (drag.pointerType === 'touch' ? TOUCH_OFFSET_PX : 0),
  };
}

function getPaletteItemCenter(key: string): Point {
  const element = document.querySelector<HTMLElement>(
    `[data-palette-key="${key}"]`,
  );

  if (element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function getModeLabel(mode: DisplayMode): string {
  switch (mode) {
    case 'realistic':
      return fr.workbench.displayRealistic;
    case 'symbol':
      return fr.workbench.displaySymbol;
    case 'overlay':
      return fr.workbench.displayOverlay;
  }
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

function getStatus(simulation: CircuitSimulation): Status {
  if (simulation.diagnostics.some((diagnostic) => diagnostic.code === 'simulation_error')) {
    return { text: fr.workbench.statusError, tone: 'danger' };
  }
  if (simulation.shortCircuit) {
    return { text: fr.workbench.statusShort, tone: 'danger' };
  }
  if (simulation.missingBattery) {
    return { text: fr.workbench.statusMissingBattery, tone: 'info' };
  }
  if (simulation.ok) {
    return { text: fr.workbench.statusClosed, tone: 'success' };
  }
  if (simulation.switchOpen) {
    return { text: fr.workbench.statusSwitchOpen, tone: 'info' };
  }
  if (simulation.insulatingMaterial) {
    return { text: fr.workbench.statusInsulator, tone: 'info' };
  }
  if (simulation.ledReversed) {
    return { text: fr.workbench.statusLedReversed, tone: 'info' };
  }
  if (simulation.bulbOneSide) {
    return { text: fr.workbench.statusBulbOneSide, tone: 'info' };
  }

  return { text: fr.workbench.statusOpen, tone: 'neutral' };
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="trash-icon">
      <path
        d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
