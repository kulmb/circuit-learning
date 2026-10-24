import type { CircuitComponent, ComponentState } from '@circuits/shared';

import { RealisticArt, SymbolArt, SymbolBadge } from './ComponentArt';
import {
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
  TERMINAL_HIT_RADIUS,
} from './constants';
import type { DisplayMode } from './displayMode';
import './components.css';

export interface ComponentBlockProps {
  component: CircuitComponent;
  state: ComponentState | undefined;
  selected: boolean;
  displayMode: DisplayMode;
  short: boolean;
  hinted: boolean;
  locked: boolean;
  ghost?: boolean;
  showTerminals?: boolean;
}

export function ComponentBlock({
  component,
  state,
  selected,
  displayMode,
  short,
  hinted,
  locked,
  ghost = false,
  showTerminals = true,
}: ComponentBlockProps) {
  const centerX = component.position.x * CELL_SIZE;
  const centerY = component.position.y * CELL_SIZE;
  const halfWidth = COMPONENT_WIDTH / 2;
  const halfHeight = COMPONENT_HEIGHT / 2;
  const dataComponentId = ghost ? undefined : component.id;

  return (
    <g
      transform={`translate(${centerX} ${centerY}) rotate(${component.rotation})`}
      data-component-id={dataComponentId}
      opacity={ghost ? 0.68 : 1}
      pointerEvents={ghost ? 'none' : undefined}
    >
      <rect
        x={-halfWidth}
        y={-halfHeight}
        width={COMPONENT_WIDTH}
        height={COMPONENT_HEIGHT}
        rx={18}
        fill="transparent"
        pointerEvents={ghost ? 'none' : 'all'}
      />

      {displayMode === 'symbol' ? (
        <SymbolArt component={component} state={state} short={short} />
      ) : (
        <RealisticArt component={component} state={state} short={short} />
      )}

      {displayMode === 'overlay' ? (
        <SymbolBadge component={component} state={state} />
      ) : null}

      {selected || ghost ? (
        <rect
          x={-halfWidth}
          y={-halfHeight}
          width={COMPONENT_WIDTH}
          height={COMPONENT_HEIGHT}
          rx={18}
          fill="none"
          stroke={selected ? '#1d4ed8' : '#94a3b8'}
          strokeWidth={selected ? 4 : 2}
          strokeDasharray={ghost ? '8 8' : undefined}
          pointerEvents="none"
        />
      ) : null}

      {hinted ? (
        <rect
          className="component-hint"
          x={-halfWidth}
          y={-halfHeight}
          width={COMPONENT_WIDTH}
          height={COMPONENT_HEIGHT}
          rx={18}
          fill="none"
          stroke="#f97316"
          strokeWidth={5}
          strokeDasharray="10 7"
          pointerEvents="none"
        />
      ) : null}

      {locked ? (
        <g
          transform={`translate(${-halfWidth + 12} ${-halfHeight + 12})`}
          pointerEvents="none"
        >
          <circle r={9} fill="#ffffff" stroke="#94a3b8" strokeWidth={1.5} />
          <path
            d="M -3 -1 v-2 a3 3 0 0 1 6 0 v2"
            fill="none"
            stroke="#475569"
            strokeWidth={1.8}
          />
          <rect x={-4} y={-1} width={8} height={6} rx={1.5} fill="#475569" />
        </g>
      ) : null}

      {showTerminals
        ? component.terminals.map((terminal) => {
            const terminalX = terminal.offset.x * CELL_SIZE;
            const terminalY = terminal.offset.y * CELL_SIZE;

            return (
              <g
                key={terminal.id}
                data-terminal-component={ghost ? undefined : component.id}
                data-terminal-id={ghost ? undefined : terminal.id}
              >
                <circle
                  cx={terminalX}
                  cy={terminalY}
                  r={TERMINAL_HIT_RADIUS}
                  fill="transparent"
                  pointerEvents={ghost ? 'none' : 'all'}
                />
                <circle
                  cx={terminalX}
                  cy={terminalY}
                  r={10}
                  fill="#ffffff"
                  stroke={selected ? '#1d4ed8' : '#24324a'}
                  strokeWidth={5}
                />
                {terminal.label ? (
                  <g
                    transform={`rotate(${-component.rotation} ${terminalX} ${terminalY})`}
                  >
                    <text
                      x={terminalX}
                      y={terminalY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#24324a"
                      fontSize={13}
                      fontWeight={900}
                    >
                      {terminal.label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })
        : null}
    </g>
  );
}
