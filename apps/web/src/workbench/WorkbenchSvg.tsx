import {
  getTerminalWorldPosition,
  terminalKey,
  type Circuit,
  type CircuitComponent,
  type CircuitSimulation,
  type TerminalRef,
  type Vec2,
} from '@circuits/shared';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { fr } from '../narration/fr';
import { unlockAudio } from './audio';
import { ComponentBlock } from './ComponentBlock';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CELL_SIZE,
  COMPACT_QUERY,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
  GRID_COLUMNS,
  GRID_ROWS,
} from './constants';
import {
  applyTouchOffset,
  buildWirePath,
  clamp,
  clampGridPosition,
  clientToSvgPoint,
  COMPACT_SNAP_RADIUS_PX,
  findNearestTerminal,
  getSvgScale,
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
import type { DisplayMode } from './displayMode';
import type { Selection } from './workbenchStore';

export interface WorkbenchSvgProps {
  circuit: Circuit;
  simulation: CircuitSimulation;
  selected: Selection | null;
  pendingTerminal: TerminalRef | null;
  displayMode: DisplayMode;
  hintHighlight: HintHighlight | null;
  previewComponent: CircuitComponent | null;
  svgRef: RefObject<SVGSVGElement>;
  acquirePointer: (pointerId: number) => boolean;
  releasePointer: (pointerId: number) => void;
  isOverTrash: (clientX: number, clientY: number) => boolean;
  onTrashHover: (active: boolean) => void;
  onSelect: (selection: Selection | null) => void;
  onSetPendingTerminal: (ref: TerminalRef | null) => void;
  onMoveComponent: (componentId: string, position: Vec2) => void;
  onRotateComponent: (componentId: string) => void;
  onDeleteSelection: () => void;
  onDeleteComponent: (componentId: string) => void;
  onToggleSwitch: (componentId: string) => void;
  onAddWire: (from: TerminalRef, to: TerminalRef) => void;
}

interface BaseGesture {
  pointerId: number;
  startClient: Point;
  pointerType: string;
  dragged: boolean;
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

type BoardGesture = ComponentGesture | TerminalGesture | WireGesture | BlankGesture;

interface DragPreview {
  componentId: string;
  position: Vec2;
}

interface WirePreview {
  from: TerminalRef;
  toPoint: Point;
  target: TerminalRef | null;
}

interface RenderedWire {
  wire: Circuit['wires'][number];
  from: Point;
  to: Point;
  path: string;
}

export function WorkbenchSvg({
  circuit,
  simulation,
  selected,
  pendingTerminal,
  displayMode,
  hintHighlight,
  previewComponent,
  svgRef,
  acquirePointer,
  releasePointer,
  isOverTrash,
  onTrashHover,
  onSelect,
  onSetPendingTerminal,
  onMoveComponent,
  onRotateComponent,
  onDeleteSelection,
  onDeleteComponent,
  onToggleSwitch,
  onAddWire,
}: WorkbenchSvgProps) {
  const isCompact = useCompactLayout();
  const gestureRef = useRef<BoardGesture | null>(null);
  const pendingRef = useRef<TerminalRef | null>(pendingTerminal);
  const trashHoverRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [wirePreview, setWirePreview] = useState<WirePreview | null>(null);

  useEffect(() => {
    pendingRef.current = pendingTerminal;
  }, [pendingTerminal]);

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

  const renderedWires = useMemo(() => {
    const wires: RenderedWire[] = [];

    for (const wire of circuit.wires) {
      const from = terminalPoints.get(terminalKey(wire.from));
      const to = terminalPoints.get(terminalKey(wire.to));

      if (from === undefined || to === undefined) {
        continue;
      }

      wires.push({ wire, from, to, path: buildWirePath(from, to) });
    }

    return wires;
  }, [circuit.wires, terminalPoints]);

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

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    unlockAudio();

    if (gestureRef.current !== null || !acquirePointer(event.pointerId)) {
      return;
    }

    event.preventDefault();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      releasePointer(event.pointerId);
      return;
    }

    const startClient = { x: event.clientX, y: event.clientY };
    const pointerType = event.pointerType;
    const element = event.target instanceof Element ? event.target : null;
    const terminalElement = element?.closest('[data-terminal-component]') ?? null;
    const componentElement = element?.closest('[data-component-id]') ?? null;
    const wireElement = element?.closest('[data-wire-id]') ?? null;

    if (terminalElement !== null) {
      const componentId = terminalElement.getAttribute('data-terminal-component');
      const terminalId = terminalElement.getAttribute('data-terminal-id');

      if (componentId !== null && terminalId !== null) {
        gestureRef.current = {
          kind: 'terminal',
          pointerId: event.pointerId,
          startClient,
          pointerType,
          dragged: false,
          terminal: { componentId, terminalId },
        };
        onSelect(null);
        return;
      }
    }

    if (componentElement !== null) {
      const componentId = componentElement.getAttribute('data-component-id');
      const component = circuit.components.find((item) => item.id === componentId);

      if (component !== undefined) {
        const svgPoint = clientToSvgPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        const center = gridToSvg(component.position, CELL_SIZE);
        const grabOffset = svgPoint
          ? { x: center.x - svgPoint.x, y: center.y - svgPoint.y }
          : { x: 0, y: 0 };

        gestureRef.current = {
          kind: 'component',
          pointerId: event.pointerId,
          startClient,
          pointerType,
          dragged: false,
          componentId: component.id,
          grabOffset,
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
          pointerId: event.pointerId,
          startClient,
          pointerType,
          dragged: false,
          wireId,
        };
        onSelect({ kind: 'wire', id: wireId });
        onSetPendingTerminal(null);
        return;
      }
    }

    gestureRef.current = {
      kind: 'blank',
      pointerId: event.pointerId,
      startClient,
      pointerType,
      dragged: false,
    };
    onSelect(null);
    onSetPendingTerminal(null);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current;

    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return;
    }

    const currentClient = { x: event.clientX, y: event.clientY };
    const dragged =
      gesture.dragged || isDragGesture(gesture.startClient, currentClient);

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
    const svgPoint = clientToSvgPoint(svg, event.clientX, event.clientY);

    if (svgPoint === null) {
      return;
    }

    const scale = getSvgScale(svg);
    const touchOffset = TOUCH_OFFSET_PX / scale;
    const adjustedPoint = applyTouchOffset(svgPoint, gesture.pointerType, touchOffset);

    if (gesture.kind === 'component') {
      const candidate = {
        x: adjustedPoint.x + gesture.grabOffset.x,
        y: adjustedPoint.y + gesture.grabOffset.y,
      };
      const gridPosition = svgToGrid(candidate, CELL_SIZE);

      setDragPreview({ componentId: gesture.componentId, position: gridPosition });
      updateTrashHover(isOverTrash(event.clientX, event.clientY));
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
    const gesture = gestureRef.current;

    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return;
    }

    gestureRef.current = null;
    releaseCapture(event.currentTarget, event.pointerId);
    releasePointer(event.pointerId);
    updateTrashHover(false);

    const wasDragged = gesture.dragged;

    if (gesture.kind === 'component') {
      if (wasDragged) {
        if (isOverTrash(event.clientX, event.clientY)) {
          onDeleteComponent(gesture.componentId);
        } else {
          const svgPoint = clientToSvgPoint(
            event.currentTarget,
            event.clientX,
            event.clientY,
          );

          if (svgPoint !== null) {
            const scale = getSvgScale(event.currentTarget);
            const adjustedPoint = applyTouchOffset(
              svgPoint,
              gesture.pointerType,
              TOUCH_OFFSET_PX / scale,
            );
            const candidate = {
              x: adjustedPoint.x + gesture.grabOffset.x,
              y: adjustedPoint.y + gesture.grabOffset.y,
            };

            if (isPointInsideBoard(candidate, BOARD_WIDTH, BOARD_HEIGHT)) {
              const gridPosition = snapToGrid(svgToGrid(candidate, CELL_SIZE));
              const clamped = clampGridPosition(
                gridPosition,
                GRID_COLUMNS,
                GRID_ROWS,
              );
              onMoveComponent(gesture.componentId, clamped);
              onSelect({ kind: 'component', id: gesture.componentId });
            }
          }
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
      return;
    }

    if (gesture.kind === 'terminal') {
      if (wasDragged) {
        const svgPoint = clientToSvgPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );

        if (svgPoint !== null) {
          const scale = getSvgScale(event.currentTarget);
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
        }

        onSetPendingTerminal(null);
        setWirePreview(null);
        return;
      }

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

      return;
    }

    if (gesture.kind === 'wire' && !wasDragged) {
      onSelect({ kind: 'wire', id: gesture.wireId });
      return;
    }

    if (gesture.kind === 'blank' && !wasDragged) {
      onSelect(null);
      onSetPendingTerminal(null);
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current;

    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return;
    }

    gestureRef.current = null;
    releaseCapture(event.currentTarget, event.pointerId);
    releasePointer(event.pointerId);
    updateTrashHover(false);
    setDragPreview(null);
    setWirePreview(null);
    onSetPendingTerminal(null);
  }

  function handleLostPointerCapture(event: ReactPointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current;

    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return;
    }

    gestureRef.current = null;
    releasePointer(event.pointerId);
    updateTrashHover(false);
    setDragPreview(null);
    setWirePreview(null);
    onSetPendingTerminal(null);
  }

  return (
    <svg
      ref={svgRef}
      className="workbench-svg"
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
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

      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx={18} fill="#f7fbff" />
      <rect
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx={18}
        fill="url(#workbench-grid)"
      />
      <rect
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx={18}
        fill="none"
        stroke="#c7d8e8"
        strokeWidth={3}
      />

      {renderedWires.map(({ wire, path }) => {
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
          <g key={wire.id} data-wire-id={wire.id}>
            <path
              d={path}
              className={isShort ? 'wire--short' : undefined}
              fill="none"
              stroke={isSelected ? '#1d4ed8' : '#355070'}
              strokeWidth={isSelected ? 11 : 8}
              strokeLinecap="round"
            />
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
              pointerEvents="stroke"
            />
          </g>
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
        />
      ))}

      {previewComponent !== null ? (
        <ComponentBlock
          component={previewComponent}
          state={undefined}
          selected={false}
          displayMode={displayMode}
          short={false}
          hinted={false}
          ghost
        />
      ) : null}

      {wirePreview !== null && wirePreviewFromPoint !== undefined ? (
        <path
          d={buildWirePath(wirePreviewFromPoint, wirePreview.toPoint)}
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

      {selected !== null && selectedComponent !== undefined && dragPreview === null ? (
        <SelectionToolbar
          component={selectedComponent}
          components={circuit.components}
          onRotate={() => onRotateComponent(selectedComponent.id)}
          onDelete={onDeleteSelection}
        />
      ) : null}

      {selectedWire !== undefined && dragPreview === null ? (
        <WireDeleteButton
          x={(selectedWire.from.x + selectedWire.to.x) / 2}
          y={(selectedWire.from.y + selectedWire.to.y) / 2}
          onDelete={onDeleteSelection}
        />
      ) : null}

      {circuit.components.length === 0 ? (
        <text
          x={BOARD_WIDTH / 2}
          y={BOARD_HEIGHT / 2}
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
}

interface SelectionToolbarProps {
  component: CircuitComponent;
  components: CircuitComponent[];
  onRotate: () => void;
  onDelete: () => void;
}

function SelectionToolbar({
  component,
  components,
  onRotate,
  onDelete,
}: SelectionToolbarProps) {
  const buttonSize = 72;
  const gap = 8;
  const padding = 6;
  const width = padding * 2 + buttonSize * 2 + gap;
  const height = padding * 2 + buttonSize;
  const { left, top } = chooseToolbarPosition(component, components, width, height);

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
        label={fr.workbench.rotate}
        icon="rotate"
        onActivate={onRotate}
      />
      <ToolbarButton
        x={padding + buttonSize + gap}
        y={padding}
        size={buttonSize}
        label={fr.workbench.delete}
        icon="trash"
        tone="danger"
        onActivate={onDelete}
      />
    </g>
  );
}

interface WireDeleteButtonProps {
  x: number;
  y: number;
  onDelete: () => void;
}

function WireDeleteButton({ x, y, onDelete }: WireDeleteButtonProps) {
  const size = 72;

  return (
    <g
      transform={`translate(${clampToolbarPosition(x - size / 2, size, BOARD_WIDTH)} ${clampToolbarPosition(y - size / 2, size, BOARD_HEIGHT)})`}
      data-toolbar="true"
    >
      <ToolbarButton
        x={0}
        y={0}
        size={size}
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
  label: string;
  icon: 'rotate' | 'trash';
  tone?: 'default' | 'danger';
  onActivate: () => void;
}

function ToolbarButton({ x, y, size, label, icon, tone = 'default', onActivate }: ToolbarButtonProps) {
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
        rx={14}
        fill={tone === 'danger' ? '#fff1f2' : '#f4f8fc'}
        stroke={tone === 'danger' ? '#fecdd3' : '#d7e3ee'}
        strokeWidth={2}
      />
      <g
        transform={`translate(${size / 2} ${size / 2})`}
        fill="none"
        stroke={tone === 'danger' ? '#be123c' : '#24324a'}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon === 'rotate' ? <RotateIcon /> : <TrashIcon />}
      </g>
    </g>
  );
}

function RotateIcon() {
  return (
    <>
      <path d="M 4 -14 A 14 14 0 1 1 -14 10" />
      <path d="M -5 -14 L 4 -14 L 4 -5" />
    </>
  );
}

function TrashIcon() {
  return (
    <>
      <path d="M -14 -8 H 14" />
      <path d="M -7 -8 V -14 H 7 V -8" />
      <path d="M -10 -8 L -7 14 H 7 L 10 -8" />
      <path d="M -2 -2 V 8 M 2 -2 V 8" />
    </>
  );
}

function useCompactLayout(): boolean {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(COMPACT_QUERY).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompact(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isCompact;
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
    left: clamp(candidate.left, 8, BOARD_WIDTH - width - 8),
    top: clamp(candidate.top, 8, BOARD_HEIGHT - height - 8),
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
