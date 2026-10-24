import {
  createComponent,
  evaluateLevelSuccess,
  starsForHints,
  type CircuitComponent,
  type CircuitSimulation,
  type Vec2,
} from '@circuits/shared';
import type { LevelDefinition } from '@circuits/shared/levels';
import { motion, useReducedMotion } from 'framer-motion';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Icon } from '../components/icons';
import { Zap, ZapCharacter, type ZapVariant } from '../components/Zap';
import {
  vibrateShortCircuit,
  vibrateSuccess,
} from '../feedback/haptics';
import { useLayout } from '../layout/LayoutContext';
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
import { boardForLevel, CELL_SIZE } from './constants';
import type { DisplayMode } from './displayMode';
import { PaletteGlyph } from './PaletteGlyph';
import { PALETTE_ITEMS, type PaletteItem } from './paletteItems';
import {
  chooseSandboxCuriosity,
  sandboxCuriosityTips,
} from './sandbox';
import {
  applyTouchOffset,
  clampGridPosition,
  decidePaletteGesture,
  isPointInsideBoard,
  paletteScrollAxis,
  snapToGrid,
  svgToGrid,
  TOUCH_OFFSET_PX,
  type PaletteGesture,
  type Point,
  type ScrollAxis,
} from './pointer';
import { componentOverlaps } from './trashTarget';
import { useBoardViewport } from './useBoardViewport';
import {
  boardScale,
  measureElementRect,
  screenToBoard,
} from './viewport';
import { WorkbenchSvg } from './WorkbenchSvg';
import { useWorkbenchStore } from './workbenchStore';
import './Workbench.css';

export interface SandboxChrome {
  items: PaletteItem[];
  dirty: boolean;
  pauseCuriosity: boolean;
  onOpenWorkshop: () => void;
}

export interface WorkbenchPageProps {
  onBack: () => void;
  level?: LevelDefinition;
  onNextLevel?: () => void;
  sandbox?: SandboxChrome;
}

const CURIOSITY_FIRST_MS = 24_000;
const CURIOSITY_NEXT_MS = 40_000;

interface PaletteDragState {
  item: PaletteItem;
  pointerId: number;
  clientX: number;
  clientY: number;
  startClient: Point;
  pointerType: string;
  gesture: PaletteGesture;
  scrollAxis: ScrollAxis | null;
  scrollStart: number;
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

export const WorkbenchPage = memo(function WorkbenchPage({
  onBack,
  level,
  onNextLevel,
  sandbox,
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
  const layout = useLayout();
  const isCompact = layout.size === 'compact';
  const isMediumPortrait =
    layout.size === 'medium' && layout.orientation === 'portrait';
  const zapVariant: ZapVariant = isCompact
    ? 'compact'
    : isMediumPortrait
      ? 'top'
      : 'default';
  const reduceMotion = useReducedMotion() ?? false;
  const board = useMemo(() => boardForLevel(level?.board), [level]);
  const paletteRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const attachSvg = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node;
    setSvgElement(node);
  }, []);
  const viewport = useBoardViewport(svgElement, board);
  const showZoomControls = viewport.pannable || !viewport.isDefault;
  const showZoomHint = viewport.pannable && viewport.isDefault;
  const boardStyle = {
    '--board-ratio': board.width / board.height,
    '--board-aspect': `${board.width} / ${board.height}`,
  } as CSSProperties;
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
  const [saveError, setSaveError] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const completedRef = useRef(false);
  const levelSession = useLevelSession(level ?? null);

  const status = getStatus(simulation);
  const ghostPoint =
    paletteDrag !== null && paletteDrag.gesture === 'drag'
      ? paletteGhostPoint(paletteDrag)
      : null;
  const modeLabel = getModeLabel(displayMode);
  const hasLitBulb = circuit.components.some(
    (component) =>
      component.type === 'bulb' &&
      simulation.states[component.id]?.state !== 'off',
  );
  const paletteItems = useMemo(() => {
    if (sandbox !== undefined) {
      return sandbox.items;
    }

    if (level === undefined) {
      return PALETTE_ITEMS;
    }

    return level.availableComponents.flatMap((offer) => {
      const item = PALETTE_ITEMS.find((candidate) => candidate.key === offer.key);
      return item === undefined ? [] : [item];
    });
  }, [level, sandbox]);
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

  const sandboxMode = sandbox !== undefined;
  const workbenchPaused = sandbox?.pauseCuriosity ?? false;
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pageRef.current !== null) {
      pageRef.current.inert = workbenchPaused;
    }
  }, [workbenchPaused]);

  useEffect(() => {
    narration.say(
      sandboxMode
        ? 'sandbox.intro'
        : level === undefined
          ? 'zap.welcome'
          : level.introTextId,
    );
  }, [level, narration.say, sandboxMode]);

  const previousCuriosityRef = useRef<string | null>(null);

  useEffect(() => {
    if (sandbox === undefined || sandbox.pauseCuriosity) {
      return;
    }

    const availableKeys = new Set(
      sandbox.items.map((item) => item.key),
    );
    let cancelled = false;
    let timer = 0;

    const schedule = (delay: number): void => {
      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (!document.hidden) {
          const tips = sandboxCuriosityTips(
            circuit,
            simulation,
            availableKeys,
          );
          const choice = chooseSandboxCuriosity(
            tips,
            previousCuriosityRef.current,
          );

          if (choice !== null) {
            previousCuriosityRef.current = choice;
            setHintState(null);
            setHintHighlight(null);
            setExpression(
              choice === 'sandbox.curiosity.photo'
                ? 'surprised'
                : 'thinking',
            );
            narration.say(choice);
          }
        }

        schedule(CURIOSITY_NEXT_MS);
      }, delay);
    };

    schedule(CURIOSITY_FIRST_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [circuit, narration.say, sandbox, simulation]);

  useEffect(() => {
    if (simulation.shortCircuit) {
      if (lastFeedbackRef.current !== 'short') {
        lastFeedbackRef.current = 'short';
        setExpression('alert');
        vibrateShortCircuit();
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
    setSaveError(false);
    playSuccessFanfare();
    vibrateSuccess();
    const fallbackStars = starsForHints(levelSession.hintsUsed);

    void levelSession
      .completeSuccess()
      .then((progress) => {
        if (progress === null) {
          setSaveError(true);
          narration.say('progress.saveError');
        }
        setCompletionStars(
          progress?.levels[level.id]?.stars ?? fallbackStars,
        );
      })
      .catch(() => {
        setSaveError(true);
        narration.say('progress.saveError');
        setCompletionStars(fallbackStars);
      });
  }, [
    achieved,
    level,
    levelSession.completeSuccess,
    levelSession.hintsUsed,
    narration.say,
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

  const acquirePointer = useCallback((pointerId: number): boolean => {
    if (activePointerRef.current !== null) {
      return false;
    }

    activePointerRef.current = pointerId;
    return true;
  }, []);

  const releasePointer = useCallback((pointerId: number): void => {
    if (activePointerRef.current === pointerId) {
      activePointerRef.current = null;
    }
  }, []);

  const isOverTrash = useCallback(
    (clientX: number, clientY: number): boolean => {
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
    },
    [],
  );

  const isComponentOverTrash = useCallback(
    (component: CircuitComponent, position: Vec2): boolean => {
      const svg = svgRef.current;
      const trash = trashRef.current;

      if (svg === null || trash === null) {
        return false;
      }

      return componentOverlaps(
        component,
        position,
        measureElementRect(svg, board),
        viewport.view,
        board,
        trash.getBoundingClientRect(),
      );
    },
    [board, viewport.view],
  );

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

    const rect = measureElementRect(svg, board);
    const svgPoint = screenToBoard(
      { x: clientX, y: clientY },
      rect,
      viewport.view,
      board,
    );
    const scale = boardScale(rect, viewport.view, board);
    const adjustedPoint = applyTouchOffset(
      svgPoint,
      pointerType,
      TOUCH_OFFSET_PX / scale,
    );

    if (!isPointInsideBoard(adjustedPoint, board.width, board.height)) {
      return null;
    }

    const gridPoint = snapToGrid(svgToGrid(adjustedPoint, CELL_SIZE));
    const position = clampGridPosition(gridPoint, board.columns, board.rows);
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

    const palette = paletteRef.current;
    const scrollAxis = paletteScrollAxis(palette);
    const touchScroll = event.pointerType === 'touch' && scrollAxis !== null;
    const scrollStart =
      touchScroll && palette !== null && scrollAxis !== null
        ? scrollAxis === 'x'
          ? palette.scrollLeft
          : palette.scrollTop
        : 0;

    setPaletteDrag({
      item,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startClient: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      gesture: touchScroll ? 'pending' : 'drag',
      scrollAxis: touchScroll ? scrollAxis : null,
      scrollStart,
      placement: touchScroll
        ? null
        : computePlacement(
            event.clientX,
            event.clientY,
            event.pointerType,
            item,
          ),
    });
  }

  function scrollPalette(
    drag: PaletteDragState,
    clientX: number,
    clientY: number,
  ): void {
    const palette = paletteRef.current;
    if (palette === null || drag.scrollAxis === null) {
      return;
    }

    if (drag.scrollAxis === 'x') {
      palette.scrollLeft =
        drag.scrollStart - (clientX - drag.startClient.x);
    } else {
      palette.scrollTop = drag.scrollStart - (clientY - drag.startClient.y);
    }
  }

  function handlePalettePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = paletteDrag;
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;
    let gesture = drag.gesture;

    if (gesture === 'pending') {
      gesture = decidePaletteGesture(
        drag.startClient,
        { x: clientX, y: clientY },
        drag.scrollAxis,
      );

      if (gesture === 'pending') {
        setPaletteDrag({ ...drag, clientX, clientY });
        return;
      }
    }

    if (gesture === 'scroll') {
      scrollPalette(drag, clientX, clientY);
      setPaletteDrag({
        ...drag,
        clientX,
        clientY,
        gesture: 'scroll',
      });
      return;
    }

    const placement = computePlacement(
      clientX,
      clientY,
      drag.pointerType,
      drag.item,
    );

    setPaletteDrag({
      ...drag,
      clientX,
      clientY,
      gesture: 'drag',
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

    if (drag.gesture !== 'drag') {
      setPaletteDrag(null);
      return;
    }

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

  if (isCompact && layout.orientation === 'portrait') {
    return (
      <div
        className="rotate-device"
        onContextMenu={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className="workbench-icon-button rotate-device__back"
          onPointerDown={(event) => activateButton(event, onBack)}
        >
          <Icon name="arrow-left" />
          <span>{fr.workbench.back}</span>
        </button>

        <div className="rotate-device__card">
          <ZapCharacter
            expression="content"
            speaking={false}
            className="rotate-device__zap"
          />
          <div className="rotate-device__phone" aria-hidden="true">
            <span className="rotate-device__screen" />
          </div>
          <p className="rotate-device__text">{fr.workbench.rotateDevice}</p>
          <p className="rotate-device__hint">
            {fr.workbench.rotateDeviceHint}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="workbench-page"
      aria-hidden={workbenchPaused ? true : undefined}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="workbench-header">
        <button
          type="button"
          className="workbench-icon-button"
          onPointerDown={(event) => activateButton(event, onBack)}
        >
          <Icon name="arrow-left" />
          <span>{fr.workbench.back}</span>
        </button>

        <div className="workbench-header__title">
          <h1>
            {sandbox !== undefined
              ? fr.sandbox.title
              : level === undefined
                ? fr.workbench.title
                : getText(level.titleTextId)}
          </h1>
          {isCompact ? null : (
            <p>
              {sandbox !== undefined
                ? fr.sandbox.subtitle
                : level === undefined
                  ? fr.workbench.hint
                  : getText(level.goalTextId)}
            </p>
          )}
        </div>

        {sandbox !== undefined ? (
          <button
            type="button"
            className={`workbench-icon-button workbench-sandbox-button${sandbox.dirty ? ' is-dirty' : ''}`}
            aria-label={fr.sandbox.myWorkshop}
            onPointerDown={(event) =>
              activateButton(event, sandbox.onOpenWorkshop)
            }
          >
            <ToolboxIcon />
            <span className="workbench-sandbox-button__label">
              {fr.sandbox.myWorkshop}
            </span>
            {sandbox.dirty ? (
              <span
                className="workbench-sandbox-button__dot"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ) : null}

        {isCompact && sandbox === undefined ? (
          <button
            type="button"
            className="workbench-icon-button workbench-help-button"
            onPointerDown={(event) =>
              activateButton(event, () =>
                setInstructionsOpen((open) => !open),
              )
            }
            aria-label={fr.workbench.instructions}
            aria-expanded={instructionsOpen}
          >
            <Icon name="help" />
          </button>
        ) : null}

        <button
          type="button"
          className="workbench-icon-button workbench-mode-button"
          onPointerDown={(event) => activateButton(event, cycleDisplayMode)}
          aria-label={`${fr.workbench.displayMode} : ${modeLabel}`}
        >
          <Icon name="eye" />
          <span>{modeLabel}</span>
        </button>

        {isCompact ? null : (
          <button
            type="button"
            className="workbench-icon-button"
            onPointerDown={(event) => activateButton(event, undo)}
            disabled={history.length === 0}
          >
            <Icon name="undo" />
            <span>{fr.workbench.undo}</span>
          </button>
        )}
      </header>

      {isCompact && instructionsOpen ? (
        <div
          className="workbench-instructions"
          role="dialog"
          aria-label={fr.workbench.instructions}
        >
          <p>
            {level === undefined
              ? fr.workbench.hint
              : getText(level.goalTextId)}
          </p>
          <button
            type="button"
            className="workbench-instructions__close"
            onPointerDown={(event) =>
              activateButton(event, () => setInstructionsOpen(false))
            }
          >
            {fr.workbench.close}
          </button>
        </div>
      ) : null}

      <div className="workbench-layout">
        <aside
          ref={paletteRef}
          className="palette"
          aria-label={fr.workbench.paletteTitle}
        >
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
                  aria-label={item.label}
                  onPointerDown={(event) => handlePalettePointerDown(event, item)}
                  onPointerMove={handlePalettePointerMove}
                  onPointerUp={handlePalettePointerUp}
                  onPointerCancel={handlePalettePointerCancel}
                  onLostPointerCapture={handlePaletteLostPointerCapture}
                  disabled={unavailable}
                >
                  <span
                    className="palette-item__swatch"
                    style={{
                      backgroundColor: `${item.color}24`,
                      borderColor: `${item.color}66`,
                    }}
                    aria-hidden="true"
                  >
                    <PaletteGlyph item={item} displayMode={displayMode} />
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
          <div
            className={`workbench-board${showZoomControls ? ' has-zoom-controls' : ''}`}
            style={boardStyle}
          >
            <WorkbenchSvg
              circuit={circuit}
              simulation={simulation}
              selected={selected}
              pendingTerminal={pendingTerminal}
              displayMode={displayMode}
              hintHighlight={hintHighlight}
              lockedComponentIds={lockedComponentIds}
              previewComponent={paletteDrag?.placement?.component ?? null}
              board={board}
              view={viewport.view}
              scale={viewport.scale}
              pannable={viewport.pannable}
              setView={viewport.setView}
              svgRef={attachSvg}
              acquirePointer={acquirePointer}
              releasePointer={releasePointer}
              isComponentOverTrash={isComponentOverTrash}
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

            {showZoomHint ? (
              <p className="workbench-zoom-hint">{fr.workbench.zoomHint}</p>
            ) : null}

            {showZoomControls ? (
              <button
                type="button"
                className="workbench-zoom-reset"
                onPointerDown={(event) =>
                  activateButton(event, viewport.resetView)
                }
              >
                <Icon name="maximize" />
                <span>{fr.workbench.showAll}</span>
              </button>
            ) : null}

            {isCompact ? null : (
              <div
                ref={trashRef}
                className={`trash-zone${trashActive ? ' is-active' : ''}`}
                aria-hidden="true"
              >
                <Icon name="trash" className="trash-icon" />
                <span>{fr.workbench.trash}</span>
              </div>
            )}

            <Zap
              variant={zapVariant}
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

      {isCompact ? (
        <div className="workbench-toolrail">
          <button
            type="button"
            className="workbench-icon-button workbench-toolrail__button"
            onPointerDown={(event) => activateButton(event, undo)}
            disabled={history.length === 0}
            aria-label={fr.workbench.undo}
          >
            <Icon name="undo" />
          </button>
          <div
            ref={trashRef}
            className={`trash-zone trash-zone--rail${trashActive ? ' is-active' : ''}`}
            aria-hidden="true"
          >
            <Icon name="trash" className="trash-icon" />
            <span>{fr.workbench.trash}</span>
          </div>
        </div>
      ) : null}

      {paletteDrag !== null &&
      paletteDrag.gesture === 'drag' &&
      ghostPoint !== null &&
      paletteDrag.placement === null ? (
        <div
          className="palette-ghost"
          aria-hidden="true"
          style={{
            left: ghostPoint.x,
            top: ghostPoint.y,
            borderColor: paletteDrag.item.color,
          }}
        >
          <PaletteGlyph
            item={paletteDrag.item}
            displayMode={displayMode}
            className="palette-ghost__glyph"
          />
        </div>
      ) : null}

      {returningGhost !== null ? (
        <motion.div
          className="palette-ghost palette-ghost--returning"
          aria-hidden="true"
          style={{
            borderColor: returningGhost.item.color,
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
          <PaletteGlyph
            item={returningGhost.item}
            displayMode={displayMode}
            className="palette-ghost__glyph"
          />
        </motion.div>
      ) : null}

      {level !== undefined && completionStars !== null ? (
        <LevelSuccessOverlay
          level={level}
          stars={completionStars}
          hasNext={level.nextLevelId !== null}
          saveError={saveError}
          onNext={onNextLevel ?? onBack}
          onMap={onBack}
        />
      ) : null}
    </div>
  );
});

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

function ToolboxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9h16v10H4zM9 9V6h6v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12h4v3h-4z" fill="currentColor" />
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
