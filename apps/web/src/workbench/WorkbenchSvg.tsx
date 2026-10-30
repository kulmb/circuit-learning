import {
  getTerminalWorldPosition,
  terminalKey,
  type Circuit,
  type CircuitComponent,
  type CircuitSimulation,
  type RheostatComponent,
  type TerminalRef,
  type Vec2,
} from '@circuits/shared';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { IconPaths } from '../components/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { fr } from '../narration/fr';
import { unlockAudio } from './audio';
import { useLayout } from '../layout/LayoutContext';
import { ComponentBlock } from './ComponentBlock';
import {
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
  type BoardDimensions,
} from './constants';
import { isInsideBodyHitZone } from './hitTarget';
import {
  applyTouchOffset,
  buildStraightWirePath,
  clamp,
  clampGridPosition,
  COMPACT_SNAP_RADIUS_PX,
  distance,
  findNearestTerminal,
  gridToSvg,
  isDragGesture,
  isPointInsideBoard,
  SNAP_RADIUS_PX,
  snapToGrid,
  svgToGrid,
  TOUCH_OFFSET_PX,
  type Point,
  type TerminalCandidate,
} from './pointer';
import type { HintHighlight } from '../narration/hints';
import {
  boardScale,
  formatViewBox,
  measureElementRect,
  screenToBoard,
  viewBoxFor,
  viewForAnchor,
  wheelZoomFactor,
  zoomAt,
  type BoardView,
} from './viewport';
import {
  renderAllWires,
  terminalPointMap,
} from './wireLayout';
import type { DisplayMode } from './displayMode';
import {
  toolbarButtonSize,
  toolbarIconSize,
  toolbarSliderHeight,
  toolbarSliderWidth,
} from './toolbarLayout';
import type { Selection } from './workbenchStore';

export interface WorkbenchSvgProps {
  circuit: Circuit;
  simulation: CircuitSimulation;
  selected: Selection | null;
  pendingTerminal: TerminalRef | null;
  displayMode: DisplayMode;
  hintHighlight: HintHighlight | null;
  lockedComponentIds: string[];
  previewComponent: CircuitComponent | null;
  /** Wire that will be split if the palette component is dropped here. */
  spliceWireId: string | null;
  board: BoardDimensions;
  view: BoardView;
  scale: number;
  pannable: boolean;
  setView: (update: BoardView | ((current: BoardView) => BoardView)) => void;
  svgRef: (node: SVGSVGElement | null) => void;
  acquirePointer: (pointerId: number) => boolean;
  releasePointer: (pointerId: number) => void;
  isComponentOverTrash: (
    component: CircuitComponent,
    position: Vec2,
  ) => boolean;
  onTrashHover: (active: boolean) => void;
  onSelect: (selection: Selection | null) => void;
  onSetPendingTerminal: (ref: TerminalRef | null) => void;
  onMoveComponent: (componentId: string, position: Vec2) => void;
  onRotateComponent: (componentId: string) => void;
  onDeleteSelection: () => void;
  onDeleteComponent: (componentId: string) => void;
  onToggleSwitch: (componentId: string) => void;
  onSetRheostatWiper: (
    componentId: string,
    wiperPosition: number,
    recordHistory: boolean,
  ) => void;
  onSetReedMagnet: (componentId: string, magnetNear: boolean) => void;
  onEmptyCapacitor: (componentId: string) => void;
  showMagnet: boolean;
  onAddWire: (from: TerminalRef, to: TerminalRef) => void;
}

interface BaseGesture {
  pointerId: number;
  startClient: Point;
  pointerType: string;
  dragged: boolean;
  /** View captured when the gesture starts, so zooming never skews it. */
  view: BoardView;
}

interface ComponentGesture extends BaseGesture {
  kind: 'component';
  componentId: string;
  grabOffset: Point;
}

interface TerminalGesture extends BaseGesture {
  kind: 'terminal';
  terminal: TerminalRef;
}

interface WireGesture extends BaseGesture {
  kind: 'wire';
  wireId: string;
}

interface BlankGesture extends BaseGesture {
  kind: 'blank';
}

interface PanGesture extends BaseGesture {
  kind: 'pan';
  anchorBoard: Point;
}

interface RheostatGesture extends BaseGesture {
  kind: 'rheostat';
  componentId: string;
  sliderLeft: number;
  sliderWidth: number;
  historyPushed: boolean;
}

interface MagnetGesture extends BaseGesture {
  kind: 'magnet';
  grabOffset: Point;
}

type BoardGesture =
  | ComponentGesture
  | TerminalGesture
  | WireGesture
  | BlankGesture
  | PanGesture
  | RheostatGesture
  | MagnetGesture;

interface PinchGesture {
  startView: BoardView;
  anchorBoard: Point;
  startDistance: number;
  lastView: BoardView;
}

interface DragPreview {
  componentId: string;
  position: Vec2;
}

interface WirePreview {
  from: TerminalRef;
  toPoint: Point;
  target: TerminalRef | null;
}

export const WorkbenchSvg = memo(function WorkbenchSvg({
  circuit,
  simulation,
  selected,
  pendingTerminal,
  displayMode,
  hintHighlight,
  lockedComponentIds,
  previewComponent,
  spliceWireId,
  board,
  view,
  scale,
  pannable,
  setView,
  svgRef,
  acquirePointer,
  releasePointer,
  isComponentOverTrash,
  onTrashHover,
  onSelect,
  onSetPendingTerminal,
  onMoveComponent,
  onRotateComponent,
  onDeleteSelection,
  onDeleteComponent,
  onToggleSwitch,
  onSetRheostatWiper,
  onSetReedMagnet,
  onEmptyCapacitor,
  showMagnet,
  onAddWire,
}: WorkbenchSvgProps) {
  useLanguage();
  const isCompact = useLayout().size === 'compact';
  const gestureRef = useRef<BoardGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const pointerPositionsRef = useRef<Map<number, Point>>(new Map());
  const acquiredPointerRef = useRef<number | null>(null);
  const viewRef = useRef(view);
  const pendingRef = useRef<TerminalRef | null>(pendingTerminal);
  const trashHoverRef = useRef(false);
  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [wirePreview, setWirePreview] = useState<WirePreview | null>(null);
  const [magnet, setMagnet] = useState<Point>({
    x: CELL_SIZE * 1.4,
    y: board.height - CELL_SIZE * 1.4,
  });

  const panEnabled = pannable || view.zoom > 1.0001;

  const updateReedProximity = (point: Point): void => {
    for (const component of circuit.components) {
      if (component.type !== 'reed') {
        continue;
      }

      const distanceToReed = Math.hypot(
        point.x - component.position.x * CELL_SIZE,
        point.y - component.position.y * CELL_SIZE,
      );
      onSetReedMagnet(component.id, distanceToReed <= CELL_SIZE * 1.4);
    }
  };

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    pendingRef.current = pendingTerminal;
  }, [pendingTerminal]);

  const attachNode = useCallback(
    (node: SVGSVGElement | null) => {
      localSvgRef.current = node;
      svgRef(node);
    },
    [svgRef],
  );

  useEffect(() => {
    const svg = localSvgRef.current;

    if (svg === null) {
      return;
    }

    function handleWheel(event: WheelEvent): void {
      event.preventDefault();

      if (gestureRef.current !== null || pinchRef.current !== null || svg === null) {
        return;
      }

      const factor = wheelZoomFactor(event.deltaY, event.deltaMode);
      const client = { x: event.clientX, y: event.clientY };
      const rect = measureElementRect(svg, board);

      setView((current) =>
        zoomAt(
          current,
          current.zoom * factor,
          screenToBoard(client, rect, current, board),
          board,
        ),
      );
    }

    svg.addEventListener('wheel', handleWheel, { passive: false });

    return () => svg.removeEventListener('wheel', handleWheel);
  }, [board, setView]);

  const displayComponents = useMemo(() => {
    if (dragPreview === null) {
      return circuit.components;
    }

    return circuit.components.map((component) =>
      component.id === dragPreview.componentId
        ? ({ ...component, position: dragPreview.position } as CircuitComponent)
        : component,
    );
  }, [circuit.components, dragPreview]);

  const terminalEntries = useMemo(() => {
    const entries: TerminalCandidate[] = [];

    for (const component of displayComponents) {
      for (const terminal of component.terminals) {
        const world = getTerminalWorldPosition(component, terminal.id);
        entries.push({
          ref: { componentId: component.id, terminalId: terminal.id },
          point: gridToSvg(world, CELL_SIZE),
        });
      }
    }

    return entries;
  }, [displayComponents]);

  const terminalPoints = useMemo(() => {
    const points = new Map<string, Point>();

    for (const entry of terminalEntries) {
      points.set(terminalKey(entry.ref), entry.point);
    }

    return points;
  }, [terminalEntries]);

  const settledTerminalPoints = useMemo(
    () => terminalPointMap(circuit.components),
    [circuit.components],
  );

  const settledWires = useMemo(
    () =>
      renderAllWires(
        circuit.wires,
        circuit.components,
        settledTerminalPoints,
        board,
      ),
    [board, circuit.components, circuit.wires, settledTerminalPoints],
  );

  const renderedWires = useMemo(() => {
    if (dragPreview === null) {
      return settledWires;
    }

    const draggedId = dragPreview.componentId;

    return settledWires.map((rendered) => {
      const connected =
        rendered.wire.from.componentId === draggedId ||
        rendered.wire.to.componentId === draggedId;

      if (!connected) {
        return rendered;
      }

      const from = terminalPoints.get(terminalKey(rendered.wire.from));
      const to = terminalPoints.get(terminalKey(rendered.wire.to));

      if (from === undefined || to === undefined) {
        return rendered;
      }

      return {
        ...rendered,
        from,
        to,
        path: buildStraightWirePath(from, to),
        mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
      };
    });
  }, [dragPreview, settledWires, terminalPoints]);

  const orderedWires = useMemo(() => {
    if (selected?.kind !== 'wire') {
      return renderedWires;
    }

    // Draw the selected wire last so its thicker stroke and white casing are
    // never covered by a crossing wire.
    return [
      ...renderedWires.filter((item) => item.wire.id !== selected.id),
      ...renderedWires.filter((item) => item.wire.id === selected.id),
    ];
  }, [renderedWires, selected]);

  const selectedComponent =
    selected?.kind === 'component'
      ? circuit.components.find((component) => component.id === selected.id)
      : undefined;
  const selectedWire =
    selected?.kind === 'wire'
      ? renderedWires.find((item) => item.wire.id === selected.id)
      : undefined;

  const pendingPoint = pendingTerminal
    ? terminalPoints.get(terminalKey(pendingTerminal))
    : undefined;
  const wirePreviewFromPoint = wirePreview
    ? terminalPoints.get(terminalKey(wirePreview.from))
    : undefined;
  const snapPoint = wirePreview?.target
    ? terminalPoints.get(terminalKey(wirePreview.target))
    : undefined;
  const shortWireIds = new Set(simulation.shortCircuitInfo?.wireIds ?? []);

  function updateTrashHover(active: boolean): void {
    if (trashHoverRef.current !== active) {
      trashHoverRef.current = active;
      onTrashHover(active);
    }
  }

  function releaseAcquiredPointerIfDone(): void {
    if (pointerPositionsRef.current.size > 0) {
      return;
    }

    const acquired = acquiredPointerRef.current;

    if (acquired === null) {
      return;
    }

    acquiredPointerRef.current = null;
    releasePointer(acquired);
  }

  function beginPinch(): void {
    const entries = Array.from(pointerPositionsRef.current.entries());
    const first = entries[0];
    const second = entries[1];

    if (first === undefined || second === undefined) {
      return;
    }

    const svg = localSvgRef.current;
    const rect =
      svg === null
        ? { left: 0, top: 0, width: board.width, height: board.height }
        : measureElementRect(svg, board);
    const midpoint = {
      x: (first[1].x + second[1].x) / 2,
      y: (first[1].y + second[1].y) / 2,
    };
    const currentView = viewRef.current;

    // A pinch always wins over the single-finger gesture it interrupted.
    gestureRef.current = null;
    setDragPreview(null);
    setWirePreview(null);
    updateTrashHover(false);
    onSetPendingTerminal(null);

    pinchRef.current = {
      startView: currentView,
      anchorBoard: screenToBoard(midpoint, rect, currentView, board),
      startDistance: Math.max(distance(first[1], second[1]), 1),
      lastView: currentView,
    };
  }

  function updatePinch(): void {
    const pinch = pinchRef.current;
    const svg = localSvgRef.current;

    if (pinch === null || svg === null) {
      return;
    }

    const entries = Array.from(pointerPositionsRef.current.values());
    const first = entries[0];
    const second = entries[1];

    if (first === undefined || second === undefined) {
      return;
    }

    const midpoint = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
    const ratio =
      Math.max(distance(first, second), 1) / pinch.startDistance;
    const zoom = pinch.startView.zoom * ratio;
    const rect = measureElementRect(svg, board);
    const next = viewForAnchor(
      pinch.anchorBoard,
      midpoint,
      zoom,
      rect,
      board,
    );

    pinch.lastView = next;
    setView(next);
  }

  function endPinch(): void {
    const pinch = pinchRef.current;
    pinchRef.current = null;

    if (pinch === null) {
      return;
    }

    const remaining = Array.from(pointerPositionsRef.current.entries())[0];
    const svg = localSvgRef.current;

    if (remaining === undefined || svg === null) {
      gestureRef.current = null;
      return;
    }

    const [pointerId, client] = remaining;
    const rect = measureElementRect(svg, board);

    // Lifting one finger of a pinch hands over to one-finger panning.
    gestureRef.current = {
      kind: 'pan',
      pointerId,
      startClient: client,
      pointerType: 'touch',
      dragged: false,
      view: pinch.lastView,
      anchorBoard: screenToBoard(client, rect, pinch.lastView, board),
    };
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    unlockAudio();

    const pointerId = event.pointerId;
    const positions = pointerPositionsRef.current;

    if (positions.has(pointerId)) {
      return;
    }

    const client = { x: event.clientX, y: event.clientY };

    // The second finger starts a pinch and cancels the gesture in progress.
    if (positions.size > 0) {
      if (event.pointerType !== 'touch' || positions.size >= 2) {
        return;
      }

      event.preventDefault();

      if (!capturePointer(event.currentTarget, pointerId)) {
        return;
      }

      positions.set(pointerId, client);
      beginPinch();
      return;
    }

    if (!acquirePointer(pointerId)) {
      return;
    }

    event.preventDefault();

    if (!capturePointer(event.currentTarget, pointerId)) {
      releasePointer(pointerId);
      return;
    }

    acquiredPointerRef.current = pointerId;
    positions.set(pointerId, client);

    const startClient = client;
    const startView = viewRef.current;
    const startPoint = screenToBoard(
      startClient,
      measureElementRect(event.currentTarget, board),
      startView,
      board,
    );
    const pointerType = event.pointerType;
    const element = event.target instanceof Element ? event.target : null;
    const terminalElement =
      element?.closest('[data-terminal-component]') ?? null;
    const componentElement = element?.closest('[data-component-id]') ?? null;
    const wireElement = element?.closest('[data-wire-id]') ?? null;
    const rheostatElement =
      element?.closest('[data-rheostat-slider]') ?? null;
    const magnetElement = element?.closest('[data-magnet-id]') ?? null;

    if (magnetElement !== null) {
      gestureRef.current = {
        kind: 'magnet',
        pointerId,
        startClient,
        pointerType,
        dragged: false,
        view: startView,
        grabOffset: {
          x: magnet.x - startPoint.x,
          y: magnet.y - startPoint.y,
        },
      };
      onSelect(null);
      onSetPendingTerminal(null);
      return;
    }

    if (rheostatElement !== null) {
      const componentId = rheostatElement.getAttribute(
        'data-rheostat-slider',
      );
      const rheostat =
        componentId === null
          ? undefined
          : circuit.components.find(
              (item) => item.id === componentId,
            );

      if (rheostat?.type === 'rheostat' && componentId !== null) {
        const sliderRect = rheostatElement.getBoundingClientRect();

        if (sliderRect.width > 0) {
          const position = clamp(
            (client.x - sliderRect.left) / sliderRect.width,
            0,
            1,
          );
          const changed =
            Math.abs(rheostat.wiperPosition - position) >= 1e-9;

          gestureRef.current = {
            kind: 'rheostat',
            pointerId,
            startClient,
            pointerType,
            dragged: false,
            view: startView,
            componentId,
            sliderLeft: sliderRect.left,
            sliderWidth: sliderRect.width,
            historyPushed: changed,
          };
          onSelect({ kind: 'component', id: componentId });
          onSetPendingTerminal(null);

          if (changed) {
            onSetRheostatWiper(componentId, position, true);
          }

          return;
        }
      }
    }

    if (terminalElement !== null) {
      const componentId = terminalElement.getAttribute('data-terminal-component');
      const terminalId = terminalElement.getAttribute('data-terminal-id');

      if (componentId !== null && terminalId !== null) {
        const component = circuit.components.find(
          (item) => item.id === componentId,
        );
        const isBodyTap =
          component !== undefined &&
          isInsideBodyHitZone(component, startPoint);

        if (!isBodyTap) {
          gestureRef.current = {
            kind: 'terminal',
            pointerId,
            startClient,
            pointerType,
            dragged: false,
            view: startView,
            terminal: { componentId, terminalId },
          };
          onSelect(null);
          return;
        }
      }
    }

    if (componentElement !== null) {
      const componentId = componentElement.getAttribute('data-component-id');
      const component = circuit.components.find(
        (item) => item.id === componentId,
      );

      if (component !== undefined) {
        const center = gridToSvg(component.position, CELL_SIZE);

        gestureRef.current = {
          kind: 'component',
          pointerId,
          startClient,
          pointerType,
          dragged: false,
          view: startView,
          componentId: component.id,
          grabOffset: {
            x: center.x - startPoint.x,
            y: center.y - startPoint.y,
          },
        };
        onSetPendingTerminal(null);
        return;
      }
    }

    if (wireElement !== null) {
      const wireId = wireElement.getAttribute('data-wire-id');

      if (wireId !== null) {
        gestureRef.current = {
          kind: 'wire',
          pointerId,
          startClient,
          pointerType,
          dragged: false,
          view: startView,
          wireId,
        };
        onSelect({ kind: 'wire', id: wireId });
        onSetPendingTerminal(null);
        return;
      }
    }

    gestureRef.current = panEnabled
      ? {
          kind: 'pan',
          pointerId,
          startClient,
          pointerType,
          dragged: false,
          view: startView,
          anchorBoard: startPoint,
        }
      : {
          kind: 'blank',
          pointerId,
          startClient,
          pointerType,
          dragged: false,
          view: startView,
        };
    onSelect(null);
    onSetPendingTerminal(null);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const positions = pointerPositionsRef.current;

    if (!positions.has(event.pointerId)) {
      return;
    }

    const client = { x: event.clientX, y: event.clientY };
    positions.set(event.pointerId, client);

    if (pinchRef.current !== null) {
      updatePinch();
      return;
    }

    const gesture = gestureRef.current;

    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return;
    }

    if (gesture.kind === 'rheostat') {
      if (gesture.sliderWidth <= 0) {
        return;
      }

      const position = clamp(
        (client.x - gesture.sliderLeft) / gesture.sliderWidth,
        0,
        1,
      );
      const rheostat = circuit.components.find(
        (item) => item.id === gesture.componentId,
      );

      if (
        rheostat?.type === 'rheostat' &&
        Math.abs(rheostat.wiperPosition - position) >= 1e-9
      ) {
        onSetRheostatWiper(
          gesture.componentId,
          position,
          !gesture.historyPushed,
        );
        gesture.historyPushed = true;
      }

      return;
    }

    const dragged =
      gesture.dragged || isDragGesture(gesture.startClient, client);
    if (dragged && !gesture.dragged) {
      gesture.dragged = true;
      if (gesture.kind === 'terminal') {
        onSetPendingTerminal(null);
      }
    }

    if (!gesture.dragged) {
      return;
    }

    const svg = event.currentTarget;
    const rect = measureElementRect(svg, board);
    const scale = boardScale(rect, gesture.view, board);
    const touchOffset = TOUCH_OFFSET_PX / scale;

    if (gesture.kind === 'pan') {
      const next = viewForAnchor(
        gesture.anchorBoard,
        client,
        gesture.view.zoom,
        rect,
        board,
      );

      setView(next);
      return;
    }

    const svgPoint = screenToBoard(client, rect, gesture.view, board);
    const adjustedPoint = applyTouchOffset(
      svgPoint,
      gesture.pointerType,
      touchOffset,
    );

    if (gesture.kind === 'magnet') {
      const next = {
        x: clamp(
          adjustedPoint.x + gesture.grabOffset.x,
          CELL_SIZE * 0.6,
          board.width - CELL_SIZE * 0.6,
        ),
        y: clamp(
          adjustedPoint.y + gesture.grabOffset.y,
          CELL_SIZE * 0.6,
          board.height - CELL_SIZE * 0.6,
        ),
      };
      setMagnet(next);
      updateReedProximity(next);
      return;
    }

    if (gesture.kind === 'component') {
      if (lockedComponentIds.includes(gesture.componentId)) {
        return;
      }

      const candidate = {
        x: adjustedPoint.x + gesture.grabOffset.x,
        y: adjustedPoint.y + gesture.grabOffset.y,
      };
      const gridPosition = svgToGrid(candidate, CELL_SIZE);
      const dragged = circuit.components.find(
        (item) => item.id === gesture.componentId,
      );

      setDragPreview({ componentId: gesture.componentId, position: gridPosition });
      updateTrashHover(
        dragged !== undefined &&
          isComponentOverTrash(dragged, gridPosition),
      );
      return;
    }

    if (gesture.kind === 'terminal') {
      const snapRadiusPx = isCompact ? COMPACT_SNAP_RADIUS_PX : SNAP_RADIUS_PX;
      const snapRadius = snapRadiusPx / scale;
      const candidates = terminalEntries.filter(
        (entry) =>
          !(
            entry.ref.componentId === gesture.terminal.componentId &&
            entry.ref.terminalId === gesture.terminal.terminalId
          ),
      );
      const nearest = findNearestTerminal(adjustedPoint, candidates, snapRadius);

      setWirePreview({
        from: gesture.terminal,
        toPoint: nearest?.point ?? adjustedPoint,
        target: nearest?.ref ?? null,
      });
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>): void {
    const pointerId = event.pointerId;
    const positions = pointerPositionsRef.current;

    if (!positions.has(pointerId)) {
      return;
    }

    // Drop the tracked pointer before releasing capture: a synchronous
    // lostpointercapture must not cancel the gesture we are finalizing.
    positions.delete(pointerId);
    releaseCapture(event.currentTarget, pointerId);

    if (pinchRef.current !== null) {
      endPinch();
      releaseAcquiredPointerIfDone();
      return;
    }

    const gesture = gestureRef.current;

    if (gesture === null || gesture.pointerId !== pointerId) {
      releaseAcquiredPointerIfDone();
      return;
    }

    gestureRef.current = null;
    updateTrashHover(false);

    if (gesture.kind === 'rheostat') {
      releaseAcquiredPointerIfDone();
      return;
    }

    const wasDragged = gesture.dragged;
    const rect = measureElementRect(event.currentTarget, board);
    const scale = boardScale(rect, gesture.view, board);

    if (gesture.kind === 'component') {
      if (wasDragged) {
        const svgPoint = screenToBoard(
          { x: event.clientX, y: event.clientY },
          rect,
          gesture.view,
          board,
        );
        const adjustedPoint = applyTouchOffset(
          svgPoint,
          gesture.pointerType,
          TOUCH_OFFSET_PX / scale,
        );
        const candidate = {
          x: adjustedPoint.x + gesture.grabOffset.x,
          y: adjustedPoint.y + gesture.grabOffset.y,
        };
        const gridPosition = snapToGrid(svgToGrid(candidate, CELL_SIZE));
        const clamped = clampGridPosition(
          gridPosition,
          board.columns,
          board.rows,
        );
        const dragged = circuit.components.find(
          (item) => item.id === gesture.componentId,
        );
        // Check the body where it is drawn, before grid snapping, so the
        // trash reacts to the visible component and not to its landing cell.
        const overTrash =
          dragged !== undefined &&
          isComponentOverTrash(dragged, gridPosition);

        if (overTrash) {
          onDeleteComponent(gesture.componentId);
        } else if (isPointInsideBoard(candidate, board.width, board.height)) {
          onMoveComponent(gesture.componentId, clamped);
          onSelect({ kind: 'component', id: gesture.componentId });
        }
      } else {
        const component = circuit.components.find(
          (item) => item.id === gesture.componentId,
        );
        onSelect({ kind: 'component', id: gesture.componentId });
        if (component?.type === 'switch') {
          onToggleSwitch(component.id);
        }
      }

      setDragPreview(null);
      releaseAcquiredPointerIfDone();
      return;
    }

    if (gesture.kind === 'terminal') {
      if (wasDragged) {
        const svgPoint = screenToBoard(
          { x: event.clientX, y: event.clientY },
          rect,
          gesture.view,
          board,
        );
        const adjustedPoint = applyTouchOffset(
          svgPoint,
          gesture.pointerType,
          TOUCH_OFFSET_PX / scale,
        );
        const snapRadiusPx = isCompact ? COMPACT_SNAP_RADIUS_PX : SNAP_RADIUS_PX;
        const candidates = terminalEntries.filter(
          (entry) =>
            !(
              entry.ref.componentId === gesture.terminal.componentId &&
              entry.ref.terminalId === gesture.terminal.terminalId
            ),
        );
        const nearest = findNearestTerminal(
          adjustedPoint,
          candidates,
          snapRadiusPx / scale,
        );

        if (nearest !== null) {
          onAddWire(gesture.terminal, nearest.ref);
        }
      } else {
        const pending = pendingRef.current;

        if (pending === null) {
          onSetPendingTerminal(gesture.terminal);
        } else if (
          pending.componentId === gesture.terminal.componentId &&
          pending.terminalId === gesture.terminal.terminalId
        ) {
          onSetPendingTerminal(null);
        } else {
          onAddWire(pending, gesture.terminal);
          onSetPendingTerminal(null);
        }
      }

      setWirePreview(null);
      releaseAcquiredPointerIfDone();
      return;
    }

    if (gesture.kind === 'wire' && !wasDragged) {
      onSelect({ kind: 'wire', id: gesture.wireId });
    }

    if (gesture.kind === 'blank' && !wasDragged) {
      onSelect(null);
      onSetPendingTerminal(null);
    }

    releaseAcquiredPointerIfDone();
  }

  function handlePointerCancel(event: ReactPointerEvent<SVGSVGElement>): void {
    if (!pointerPositionsRef.current.has(event.pointerId)) {
      return;
    }

    pointerPositionsRef.current.delete(event.pointerId);
    releaseCapture(event.currentTarget, event.pointerId);
    pinchRef.current = null;
    gestureRef.current = null;
    setDragPreview(null);
    setWirePreview(null);
    updateTrashHover(false);
    onSetPendingTerminal(null);
    releaseAcquiredPointerIfDone();
  }

  function handleLostPointerCapture(
    event: ReactPointerEvent<SVGSVGElement>,
  ): void {
    if (!pointerPositionsRef.current.has(event.pointerId)) {
      return;
    }

    pointerPositionsRef.current.delete(event.pointerId);
    pinchRef.current = null;
    gestureRef.current = null;
    setDragPreview(null);
    setWirePreview(null);
    updateTrashHover(false);
    onSetPendingTerminal(null);
    releaseAcquiredPointerIfDone();
  }

  return (
    <svg
      ref={attachNode}
      className="workbench-svg"
      viewBox={formatViewBox(viewBoxFor(view, board))}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label={fr.workbench.title}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onContextMenu={(event) => event.preventDefault()}
    >
      <defs>
        <pattern
          id="workbench-grid"
          width={CELL_SIZE}
          height={CELL_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
            fill="none"
            stroke="#d7e3ee"
            strokeWidth={1.5}
          />
        </pattern>
      </defs>

      <rect width={board.width} height={board.height} rx={18} fill="#f7fbff" />
      <rect
        width={board.width}
        height={board.height}
        rx={18}
        fill="url(#workbench-grid)"
      />
      <rect
        width={board.width}
        height={board.height}
        rx={18}
        fill="none"
        stroke="#c7d8e8"
        strokeWidth={3}
      />

      {orderedWires.map(({ wire, path }) => {
        const isSelected = selected?.kind === 'wire' && selected.id === wire.id;
        const current = simulation.wireCurrents[wire.id] ?? 0;
        const isShort =
          simulation.shortCircuit &&
          (shortWireIds.size === 0 || shortWireIds.has(wire.id));
        const showCurrent = !simulation.shortCircuit && Math.abs(current) > 0.015;
        const isHinted = hintHighlight?.wireIds.includes(wire.id) ?? false;
        const duration = clamp(
          1.6 - Math.min(Math.abs(current), 1.2) * 1.1,
          0.5,
          1.6,
        );

        return (
          <WirePath
            key={wire.id}
            wireId={wire.id}
            path={path}
            selected={isSelected}
            current={current}
            showCurrent={showCurrent}
            isShort={isShort}
            isHinted={isHinted}
            spliceTarget={wire.id === spliceWireId}
            duration={duration}
          />
        );
      })}

      {displayComponents.map((component) => (
        <ComponentBlock
          key={component.id}
          component={component}
          state={simulation.states[component.id]}
          selected={
            selected?.kind === 'component' &&
            selected.id === component.id &&
            dragPreview === null
          }
          displayMode={displayMode}
          short={simulation.shortCircuit}
          hinted={hintHighlight?.componentIds.includes(component.id) ?? false}
          locked={lockedComponentIds.includes(component.id)}
        />
      ))}

      {showMagnet ? (
        <g
          data-magnet-id="magnet"
          role="img"
          aria-label={fr.workbench.magnetAria}
          transform={`translate(${magnet.x} ${magnet.y})`}
          pointerEvents="all"
        >
          <rect
            x={-28}
            y={-30}
            width={56}
            height={60}
            rx={14}
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth={3}
          />
          <path
            d="M -16 -20 v22 a16 16 0 0 0 32 0 v-22"
            fill="none"
            stroke="#dc2626"
            strokeWidth={12}
            strokeLinecap="square"
          />
          <path
            d="M -16 -20 v10 M 16 -20 v10"
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={12}
            strokeLinecap="square"
          />
        </g>
      ) : null}

      {previewComponent !== null ? (
        <ComponentBlock
          component={previewComponent}
          state={undefined}
          selected={false}
          displayMode={displayMode}
          short={false}
          hinted={false}
          locked={false}
          ghost
        />
      ) : null}

      {wirePreview !== null && wirePreviewFromPoint !== undefined ? (
        <path
          d={buildStraightWirePath(wirePreviewFromPoint, wirePreview.toPoint)}
          fill="none"
          stroke="#0f9d8c"
          strokeWidth={6}
          strokeDasharray="10 10"
          strokeLinecap="round"
          opacity={0.85}
          pointerEvents="none"
        />
      ) : null}

      {pendingPoint !== undefined ? (
        <g pointerEvents="none">
          <circle
            cx={pendingPoint.x}
            cy={pendingPoint.y}
            r={20}
            fill="none"
            stroke="#0f9d8c"
            strokeWidth={5}
          />
          <circle
            cx={pendingPoint.x}
            cy={pendingPoint.y}
            r={29}
            fill="none"
            stroke="#0f9d8c"
            strokeWidth={2}
            opacity={0.45}
          />
        </g>
      ) : null}

      {snapPoint !== undefined ? (
        <circle
          cx={snapPoint.x}
          cy={snapPoint.y}
          r={24}
          fill="rgba(29, 78, 216, 0.12)"
          stroke="#1d4ed8"
          strokeWidth={5}
          pointerEvents="none"
        />
      ) : null}

      {hintHighlight !== null
        ? hintHighlight.terminalRefs.map((ref) => {
            const point = terminalPoints.get(terminalKey(ref));
            if (point === undefined) {
              return null;
            }

            return (
              <g
                key={`hint-${terminalKey(ref)}`}
                className="hint-terminal"
                pointerEvents="none"
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={26}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={5}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={34}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={2}
                  opacity={0.55}
                />
              </g>
            );
          })
        : null}

      {selected !== null &&
      selectedComponent !== undefined &&
      dragPreview === null &&
      (selectedComponent.type === 'rheostat' ||
        !lockedComponentIds.includes(selectedComponent.id)) ? (
        selectedComponent.type === 'rheostat' ? (
          <RheostatToolbar
            component={selectedComponent}
            components={circuit.components}
            board={board}
            compact={isCompact}
            viewportScale={scale}
            locked={lockedComponentIds.includes(selectedComponent.id)}
            onDelete={onDeleteSelection}
          />
        ) : (
          <SelectionToolbar
            component={selectedComponent}
            components={circuit.components}
            board={board}
            compact={isCompact}
            viewportScale={scale}
            onRotate={() => onRotateComponent(selectedComponent.id)}
            onDelete={onDeleteSelection}
            onEmpty={
              selectedComponent.type === 'capacitor'
                ? () => onEmptyCapacitor(selectedComponent.id)
                : undefined
            }
            emptyLabel={fr.workbench.emptyCapacitor}
          />
        )
      ) : null}

      {selectedWire !== undefined && dragPreview === null ? (
        <WireDeleteButton
          x={selectedWire.mid.x}
          y={selectedWire.mid.y}
          board={board}
          compact={isCompact}
          viewportScale={scale}
          onDelete={onDeleteSelection}
        />
      ) : null}

      {circuit.components.length === 0 ? (
        <text
          x={board.width / 2}
          y={board.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#7b8aa3"
          fontSize={28}
          fontWeight={800}
          pointerEvents="none"
        >
          {fr.workbench.empty}
        </text>
      ) : null}
    </svg>
  );
});

interface WirePathProps {
  wireId: string;
  path: string;
  selected: boolean;
  current: number;
  showCurrent: boolean;
  isShort: boolean;
  isHinted: boolean;
  spliceTarget: boolean;
  duration: number;
}

/**
 * Memoized wire keeps every unchanged wire out of the drag render path.
 * All props are primitives, so a shallow comparison is exact.
 */
const WirePath = memo(function WirePath({
  wireId,
  path,
  selected,
  current,
  showCurrent,
  isShort,
  isHinted,
  spliceTarget,
  duration,
}: WirePathProps) {
  return (
    <g data-wire-id={wireId}>
      {/* A light casing keeps the wire readable over the grid and separates
          crossing wires without hiding the component drawings. */}
      <path
        d={path}
        fill="none"
        stroke="#f7fbff"
        strokeWidth={selected ? 18 : 15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        className={isShort ? 'wire--short' : undefined}
        fill="none"
        stroke={selected ? '#1d4ed8' : '#355070'}
        strokeWidth={selected ? 11 : 8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {spliceTarget ? (
        <path
          d={path}
          fill="none"
          stroke="#f97316"
          strokeWidth={16}
          strokeDasharray="12 10"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ) : null}
      {showCurrent ? (
        <path
          d={path}
          className="wire-current"
          style={{
            animationDuration: `${duration}s`,
            animationDirection: current < 0 ? 'reverse' : 'normal',
          }}
        />
      ) : null}
      {isHinted ? (
        <path
          d={path}
          className="wire--hint"
          fill="none"
          stroke="#f97316"
          strokeWidth={14}
          strokeDasharray="10 9"
          strokeLinecap="round"
          pointerEvents="none"
        />
      ) : null}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
      />
    </g>
  );
});

interface SelectionToolbarProps {
  component: CircuitComponent;
  components: CircuitComponent[];
  board: BoardDimensions;
  compact: boolean;
  viewportScale: number;
  onRotate: () => void;
  onDelete: () => void;
  onEmpty?: (() => void) | undefined;
  emptyLabel?: string | undefined;
}

function SelectionToolbar({
  component,
  components,
  board,
  compact,
  viewportScale,
  onRotate,
  onDelete,
  onEmpty,
  emptyLabel,
}: SelectionToolbarProps) {
  const buttonSize = toolbarButtonSize(compact, viewportScale);
  const visualScale = buttonSize / 72;
  const gap = 8 * visualScale;
  const padding = 6 * visualScale;
  const buttonCount = onEmpty === undefined ? 2 : 3;
  const width = padding * 2 + buttonSize * buttonCount + gap * (buttonCount - 1);
  const height = padding * 2 + buttonSize;
  const { left, top } = chooseToolbarPosition(
    component,
    components,
    width,
    height,
    board,
  );

  return (
    <g transform={`translate(${left} ${top})`} data-toolbar="true">
      <rect
        width={width}
        height={height}
        rx={18}
        fill="#ffffff"
        stroke="#c7d8e8"
        strokeWidth={2}
        pointerEvents="none"
      />
      <ToolbarButton
        x={padding}
        y={padding}
        size={buttonSize}
        viewportScale={viewportScale}
        label={fr.workbench.rotate}
        icon="rotate"
        onActivate={onRotate}
      />
      {onEmpty === undefined ? null : (
        <ToolbarButton
          x={padding + buttonSize + gap}
          y={padding}
          size={buttonSize}
          viewportScale={viewportScale}
          label={emptyLabel ?? fr.workbench.emptyCapacitor}
          icon="empty"
          onActivate={onEmpty}
        />
      )}
      <ToolbarButton
        x={padding + (buttonSize + gap) * (buttonCount - 1)}
        y={padding}
        size={buttonSize}
        viewportScale={viewportScale}
        label={fr.workbench.delete}
        icon="trash"
        tone="danger"
        onActivate={onDelete}
      />
    </g>
  );
}

interface RheostatToolbarProps {
  component: RheostatComponent;
  components: CircuitComponent[];
  board: BoardDimensions;
  compact: boolean;
  viewportScale: number;
  locked: boolean;
  onDelete: () => void;
}

function RheostatToolbar({
  component,
  components,
  board,
  compact,
  viewportScale,
  locked,
  onDelete,
}: RheostatToolbarProps) {
  const buttonSize = toolbarButtonSize(compact, viewportScale);
  const sliderWidth = toolbarSliderWidth(viewportScale);
  const sliderHeight = toolbarSliderHeight(viewportScale);
  const visualScale = buttonSize / 56;
  const gap = 8 * visualScale;
  const padding = 6 * visualScale;
  const width =
    padding * 2 + sliderWidth + (locked ? 0 : gap + buttonSize);
  const height = padding * 2 + Math.max(sliderHeight, buttonSize);
  const { left, top } = chooseToolbarPosition(
    component,
    components,
    width,
    height,
    board,
  );
  const trackPadding = sliderHeight * 0.22;
  const trackX = padding + trackPadding;
  const trackWidth = sliderWidth - trackPadding * 2;
  const trackY = padding + sliderHeight / 2;
  const trackHeight = Math.max(4, sliderHeight * 0.14);
  const thumbRadius = sliderHeight * 0.22;
  const thumbX = trackX + trackWidth * component.wiperPosition;
  const buttonY = padding + (sliderHeight - buttonSize) / 2;

  return (
    <g transform={`translate(${left} ${top})`} data-toolbar="true">
      <rect
        width={width}
        height={height}
        rx={18}
        fill="#ffffff"
        stroke="#c7d8e8"
        strokeWidth={2}
        pointerEvents="none"
      />

      <g
        data-rheostat-slider={component.id}
        role="slider"
        aria-label={fr.components.rheostat.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(component.wiperPosition * 100)}
      >
        <rect
          x={padding}
          y={padding}
          width={sliderWidth}
          height={sliderHeight}
          fill="transparent"
          pointerEvents="all"
        />
        <rect
          x={trackX}
          y={trackY - trackHeight / 2}
          width={trackWidth}
          height={trackHeight}
          rx={trackHeight / 2}
          fill="#e2e8f0"
          pointerEvents="none"
        />
        <rect
          x={trackX}
          y={trackY - trackHeight / 2}
          width={Math.max(0, thumbX - trackX)}
          height={trackHeight}
          rx={trackHeight / 2}
          fill="#f59e0b"
          pointerEvents="none"
        />
        <circle
          cx={thumbX}
          cy={trackY}
          r={thumbRadius}
          fill="#ffffff"
          stroke="#b45309"
          strokeWidth={2.5}
          pointerEvents="none"
        />
        <line
          x1={thumbX}
          y1={trackY - thumbRadius * 0.45}
          x2={thumbX}
          y2={trackY + thumbRadius * 0.45}
          stroke="#b45309"
          strokeWidth={2}
          strokeLinecap="round"
          pointerEvents="none"
        />
        <line
          x1={thumbX - thumbRadius * 0.28}
          y1={trackY - thumbRadius * 0.45}
          x2={thumbX - thumbRadius * 0.28}
          y2={trackY + thumbRadius * 0.45}
          stroke="#b45309"
          strokeWidth={1.4}
          strokeLinecap="round"
          pointerEvents="none"
          opacity={0.55}
        />
        <line
          x1={thumbX + thumbRadius * 0.28}
          y1={trackY - thumbRadius * 0.45}
          x2={thumbX + thumbRadius * 0.28}
          y2={trackY + thumbRadius * 0.45}
          stroke="#b45309"
          strokeWidth={1.4}
          strokeLinecap="round"
          pointerEvents="none"
          opacity={0.55}
        />
      </g>

      {locked ? null : (
        <g transform={`translate(${padding + sliderWidth + gap} ${buttonY})`}>
          <ToolbarButton
            x={0}
            y={0}
            size={buttonSize}
            viewportScale={viewportScale}
            label={fr.workbench.delete}
            icon="trash"
            tone="danger"
            onActivate={onDelete}
          />
        </g>
      )}
    </g>
  );
}

interface WireDeleteButtonProps {
  x: number;
  y: number;
  board: BoardDimensions;
  compact: boolean;
  viewportScale: number;
  onDelete: () => void;
}

function WireDeleteButton({
  x,
  y,
  board,
  compact,
  viewportScale,
  onDelete,
}: WireDeleteButtonProps) {
  const size = toolbarButtonSize(compact, viewportScale);

  return (
    <g
      transform={`translate(${clampToolbarPosition(x - size / 2, size, board.width)} ${clampToolbarPosition(y - size / 2, size, board.height)})`}
      data-toolbar="true"
    >
      <ToolbarButton
        x={0}
        y={0}
        size={size}
        viewportScale={viewportScale}
        label={fr.workbench.delete}
        icon="trash"
        tone="danger"
        onActivate={onDelete}
      />
    </g>
  );
}

interface ToolbarButtonProps {
  x: number;
  y: number;
  size: number;
  viewportScale: number;
  label: string;
  icon: 'rotate' | 'trash' | 'empty';
  tone?: 'default' | 'danger';
  onActivate: () => void;
}

function ToolbarButton({
  x,
  y,
  size,
  viewportScale,
  label,
  icon,
  tone = 'default',
  onActivate,
}: ToolbarButtonProps) {
  const iconSize = toolbarIconSize(size, viewportScale);

  return (
    <g
      transform={`translate(${x} ${y})`}
      role="button"
      aria-label={label}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }

        event.stopPropagation();
        event.preventDefault();
        onActivate();
      }}
    >
      <rect
        width={size}
        height={size}
        rx={size * 0.19}
        fill={tone === 'danger' ? '#fff1f2' : '#f4f8fc'}
        stroke={tone === 'danger' ? '#fecdd3' : '#d7e3ee'}
        strokeWidth={2}
      />
      <g
        transform={`translate(${size / 2} ${size / 2}) scale(${iconSize / 24}) translate(-12 -12)`}
        fill="none"
        stroke={tone === 'danger' ? '#be123c' : '#24324a'}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <IconPaths name={icon} />
      </g>
    </g>
  );
}

function capturePointer(svg: SVGSVGElement, pointerId: number): boolean {
  try {
    svg.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}

function releaseCapture(svg: SVGSVGElement, pointerId: number): void {
  try {
    if (svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }
  } catch {
    // Pointer capture may already be gone after a browser-level cancellation.
  }
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function chooseToolbarPosition(
  component: CircuitComponent,
  components: CircuitComponent[],
  width: number,
  height: number,
  board: BoardDimensions,
): { left: number; top: number } {
  const toolbarGap = 40;
  const obstaclePadding = 36;
  const centerX = component.position.x * CELL_SIZE;
  const centerY = component.position.y * CELL_SIZE;
  const halfWidth = COMPONENT_WIDTH / 2;
  const halfHeight = COMPONENT_HEIGHT / 2;

  const candidates = [
    { left: centerX + halfWidth + toolbarGap, top: centerY - height / 2 },
    { left: centerX - halfWidth - toolbarGap - width, top: centerY - height / 2 },
    { left: centerX - width / 2, top: centerY - halfHeight - toolbarGap - height },
    { left: centerX - width / 2, top: centerY + halfHeight + toolbarGap },
  ].map((candidate) => ({
    left: clamp(candidate.left, 8, board.width - width - 8),
    top: clamp(candidate.top, 8, board.height - height - 8),
  }));

  const obstacles: Rect[] = components.map((item) => {
    const itemX = item.position.x * CELL_SIZE;
    const itemY = item.position.y * CELL_SIZE;

    return {
      left: itemX - halfWidth - obstaclePadding,
      right: itemX + halfWidth + obstaclePadding,
      top: itemY - halfHeight - obstaclePadding,
      bottom: itemY + halfHeight + obstaclePadding,
    };
  });

  const first = candidates[0];
  if (first === undefined) {
    return { left: 8, top: 8 };
  }

  let best = first;
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const rectangle: Rect = {
      left: candidate.left,
      top: candidate.top,
      right: candidate.left + width,
      bottom: candidate.top + height,
    };
    const overlap = obstacles.reduce(
      (total, obstacle) => total + intersectionArea(rectangle, obstacle),
      0,
    );

    if (overlap < bestOverlap) {
      best = candidate;
      bestOverlap = overlap;
    }

    if (overlap === 0) {
      break;
    }
  }

  return best;
}

function intersectionArea(left: Rect, right: Rect): number {
  const width = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const height = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);

  return width > 0 && height > 0 ? width * height : 0;
}

function clampToolbarPosition(value: number, size: number, limit: number): number {
  return Math.min(Math.max(8, value), limit - size - 8);
}
