import {
  createComponent,
  evaluateLevelSuccess,
  starsForHints,
  type CircuitComponent,
  type CircuitSimulation,
  type LevelDefinition,
  type Vec2,
} from '@circuits/shared';
import { motion, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Zap } from '../components/Zap';
import { LevelSuccessOverlay } from '../levels/LevelSuccessOverlay';
import { useLevelSession } from '../levels/useLevelSession';
import { fr, getText } from '../narration/fr';
import {
  buildHintPlan,
  hintExpression,
  type HintCode,
  type HintHighlight,
  type ZapExpression,
} from '../narration/hints';
import { unlockNarration } from '../narration/narrationService';
import { useNarration } from '../narration/useNarration';
import { playBuzzerBeep, playSuccessFanfare, unlockAudio } from './audio';
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
  level?: LevelDefinition;
  onNextLevel?: () => void;
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

export function WorkbenchPage({
  onBack,
  level,
  onNextLevel,
}: WorkbenchPageProps) {
  const {
    circuit,
    simulation,
    selected,
    pendingTerminal,
    displayMode,
    levelId,
    lockedComponentIds,
    availableCounts,
    history,
    loadLevel,
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

  const narration = useNarration();
  const reduceMotion = useReducedMotion() ?? false;
  const svgRef = useRef<SVGSVGElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const previousBuzzingRef = useRef<Set<string>>(new Set());
  const lastFeedbackRef = useRef('');
  const [paletteDrag, setPaletteDrag] = useState<PaletteDragState | null>(null);
  const [returningGhost, setReturningGhost] = useState<ReturningGhost | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [expression, setExpression] = useState<ZapExpression>('content');
  const [hintState, setHintState] = useState<{
    code: HintCode;
    level: number;
  } | null>(null);
  const [hintHighlight, setHintHighlight] = useState<HintHighlight | null>(null);
  const [levelHintIndex, setLevelHintIndex] = useState(0);
  const [completionStars, setCompletionStars] = useState<number | null>(null);
  const completedRef = useRef(false);
  const levelSession = useLevelSession(level ?? null);

  const status = getStatus(simulation);
  const ghostPoint = paletteDrag !== null ? paletteGhostPoint(paletteDrag) : null;
  const modeLabel = getModeLabel(displayMode);
  const hasLitBulb = circuit.components.some(
    (component) =>
      component.type === 'bulb' &&
      simulation.states[component.id]?.state !== 'off',
  );
  const paletteItems = useMemo(() => {
    if (level === undefined) {
      return PALETTE_ITEMS;
    }

    return level.availableComponents.flatMap((offer) => {
      const item = PALETTE_ITEMS.find((candidate) => candidate.key === offer.key);
      return item === undefined ? [] : [item];
    });
  }, [level]);
  const levelSuccess = useMemo(
    () =>
      level === undefined
        ? simulation.ok
        : evaluateLevelSuccess(level, circuit, simulation),
    [circuit, level, simulation],
  );
  const levelReady = level === undefined || levelId === level.id;
  const achieved = levelReady && levelSuccess;

  useEffect(() => {
    if (level !== undefined) {
      loadLevel(level);
    }
  }, [level, loadLevel]);
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

  useEffect(() => {
    narration.say(level === undefined ? 'zap.welcome' : level.introTextId);
  }, [level, narration.say]);

  useEffect(() => {
    if (simulation.shortCircuit) {
      if (lastFeedbackRef.current !== 'short') {
        lastFeedbackRef.current = 'short';
        setExpression('alert');
        narration.say('zap.short');
      }
      return;
    }

    if (achieved) {
      if (lastFeedbackRef.current !== 'ok') {
        lastFeedbackRef.current = 'ok';
        setExpression('content');
        narration.say(hasLitBulb ? 'zap.successBulb' : 'zap.successGeneric');
      }
      return;
    }

    lastFeedbackRef.current = '';
  }, [achieved, hasLitBulb, narration.say, simulation.shortCircuit]);

  useEffect(() => {
    setHintState(null);
    setHintHighlight(null);
    setLevelHintIndex(0);
  }, [circuit]);

  useEffect(() => {
    if (level !== undefined && levelReady) {
      levelSession.recordDiagnostics(
        simulation.diagnostics.map((diagnostic) => diagnostic.code),
      );
    }
  }, [
    level,
    levelReady,
    levelSession.recordDiagnostics,
    simulation.diagnostics,
  ]);

  useEffect(() => {
    if (level === undefined || !achieved || completedRef.current) {
      return;
    }

    completedRef.current = true;
    playSuccessFanfare();
    const fallbackStars = starsForHints(levelSession.hintsUsed);

    void levelSession
      .completeSuccess()
      .then((progress) => {
        setCompletionStars(
          progress?.levels[level.id]?.stars ?? fallbackStars,
        );
      })
      .catch(() => setCompletionStars(fallbackStars));
  }, [
    achieved,
    level,
    levelSession.completeSuccess,
    levelSession.hintsUsed,
  ]);

  function requestHint(): void {
    unlockNarration();
    unlockAudio();

    if (level !== undefined) {
      levelSession.recordHint();
    }

    const plan = buildHintPlan(simulation, circuit);

    if (level !== undefined && level.kind === 'circuit') {
      if (achieved) {
        setExpression('content');
        narration.say(hasLitBulb ? 'zap.successBulb' : 'zap.successGeneric');
        return;
      }

      if (plan.code === 'success' || plan.code === 'open_circuit') {
        const maxIndex = Math.max(0, level.hintTextIds.length - 1);
        const hintIndex = Math.min(levelHintIndex, maxIndex);
        const textId = level.hintTextIds[hintIndex] ?? 'zap.hint.open.1';

        setLevelHintIndex(Math.min(hintIndex + 1, maxIndex));
        setHintState(null);
        setHintHighlight(null);
        setExpression(hintIndex >= 2 ? 'surprised' : 'thinking');
        narration.say(textId);
        return;
      }
    }

    if (plan.code === 'success') {
      setHintState(null);
      setHintHighlight(null);
      setExpression('content');
      narration.say(plan.texts[0] ?? 'zap.successGeneric');
      return;
    }

    const nextLevel =
      hintState?.code === plan.code ? Math.min(hintState.level + 1, 3) : 1;

    setHintState({ code: plan.code, level: nextLevel });
    setExpression(hintExpression(plan, nextLevel));
    setHintHighlight(nextLevel === 3 ? plan.highlight : null);
    narration.say(
      plan.texts[nextLevel - 1] ?? plan.texts[0] ?? 'zap.hint.open.1',
    );
  }

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

    if (availableCounts !== null && (availableCounts[item.key] ?? 0) <= 0) {
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
      addComponent(
        drag.item.type,
        drag.item.options ?? {},
        drag.placement.position,
        drag.item.key,
      );
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
          <h1>
            {level === undefined
              ? fr.workbench.title
              : getText(level.titleTextId)}
          </h1>
          <p>
            {level === undefined
              ? fr.workbench.hint
              : getText(level.goalTextId)}
          </p>
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
            {level !== undefined && paletteItems.length === 0 ? (
              <p className="palette__empty">{getText('level.noComponents')}</p>
            ) : null}
            {paletteItems.map((item) => {
              const remaining =
                availableCounts === null
                  ? null
                  : (availableCounts[item.key] ?? 0);
              const unavailable = remaining !== null && remaining <= 0;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`palette-item${hintHighlight?.paletteKey === item.key ? ' is-hinted' : ''}`}
                  data-palette-key={item.key}
                  onPointerDown={(event) => handlePalettePointerDown(event, item)}
                  onPointerMove={handlePalettePointerMove}
                  onPointerUp={handlePalettePointerUp}
                  onPointerCancel={handlePalettePointerCancel}
                  onLostPointerCapture={handlePaletteLostPointerCapture}
                  disabled={unavailable}
                >
                  <span
                    className="palette-item__swatch"
                    style={{ backgroundColor: item.color, color: item.textColor }}
                    aria-hidden="true"
                  >
                    {item.shortLabel}
                  </span>
                  <span className="palette-item__label">{item.label}</span>
                  {remaining !== null ? (
                    <span className="palette-item__count" aria-hidden="true">
                      {remaining}
                    </span>
                  ) : null}
                </button>
              );
            })}
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
              hintHighlight={hintHighlight}
              lockedComponentIds={lockedComponentIds}
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

            <Zap
              expression={expression}
              message={narration.text}
              speaking={narration.speaking}
              muted={narration.muted}
              onHint={requestHint}
              onReplay={narration.replay}
              onToggleMute={narration.toggleMute}
            />
          </div>

          <div className={`workbench-status workbench-status--${status.tone}`}>
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

      {level !== undefined && completionStars !== null ? (
        <LevelSuccessOverlay
          level={level}
          stars={completionStars}
          hasNext={level.nextLevelId !== null}
          onNext={onNextLevel ?? onBack}
          onMap={onBack}
        />
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
