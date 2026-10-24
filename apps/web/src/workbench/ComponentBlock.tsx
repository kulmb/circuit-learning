import type { CircuitComponent, ComponentState } from '@circuits/shared';

import {
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
} from './constants';
import { getComponentVisual } from './paletteItems';

export interface ComponentBlockProps {
  component: CircuitComponent;
  state: ComponentState | undefined;
  selected: boolean;
  ghost?: boolean;
}

export function ComponentBlock({
  component,
  state,
  selected,
  ghost = false,
}: ComponentBlockProps) {
  const visual = getComponentVisual(component);
  const centerX = component.position.x * CELL_SIZE;
  const centerY = component.position.y * CELL_SIZE;
  const halfWidth = COMPONENT_WIDTH / 2;
  const halfHeight = COMPONENT_HEIGHT / 2;
  const isLit =
    state !== undefined && state.state !== 'off' && (component.type === 'bulb' || component.type === 'led');
  const dataComponentId = ghost ? undefined : component.id;

  return (
    <g
      transform={`translate(${centerX} ${centerY}) rotate(${component.rotation})`}
      data-component-id={dataComponentId}
      opacity={ghost ? 0.68 : 1}
      pointerEvents={ghost ? 'none' : undefined}
    >
      {isLit ? (
        <ellipse
          cx={0}
          cy={0}
          rx={halfWidth * 1.35}
          ry={halfHeight * 1.45}
          fill={component.type === 'led' ? '#ff5c8a' : '#ffd166'}
          opacity={0.32}
        />
      ) : null}

      <rect
        x={-halfWidth}
        y={-halfHeight}
        width={COMPONENT_WIDTH}
        height={COMPONENT_HEIGHT}
        rx={18}
        fill={visual.color}
        stroke={selected ? '#1d4ed8' : 'rgba(36, 50, 74, 0.28)'}
        strokeWidth={selected ? 5 : 2}
        strokeDasharray={ghost ? '8 8' : undefined}
      />

      <g transform={`rotate(${-component.rotation})`}>
        <text
          x={0}
          y={component.type === 'switch' ? -7 : 0}
          textAnchor="middle"
          dominantBaseline="central"
          fill={visual.textColor}
          fontSize={16}
          fontWeight={900}
        >
          {visual.shortLabel}
        </text>

        {component.type === 'switch' ? <SwitchIndicator closed={component.closed} /> : null}
      </g>

      {component.terminals.map((terminal) => {
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
              r={32}
              fill="transparent"
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
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function SwitchIndicator({ closed }: { closed: boolean }) {
  return (
    <g transform="translate(0 15)">
      <rect
        x={-23}
        y={-11}
        width={46}
        height={22}
        rx={11}
        fill={closed ? '#d9fbf6' : '#e2e8f0'}
        stroke={closed ? '#0f766e' : '#64748b'}
        strokeWidth={2}
      />
      <circle cx={closed ? 12 : -12} cy={0} r={8} fill={closed ? '#0f766e' : '#64748b'} />
    </g>
  );
}
