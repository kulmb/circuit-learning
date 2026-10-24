import type {
  CircuitComponent,
  ComponentState,
  MaterialComponent,
  SwitchComponent,
} from '@circuits/shared';

import {
  BOARD_WIDTH,
  CELL_SIZE,
  COMPONENT_HEIGHT,
  COMPONENT_WIDTH,
} from './constants';

const LEAD_X = 0.6 * CELL_SIZE;
const HALF_WIDTH = COMPONENT_WIDTH / 2;
const HALF_HEIGHT = COMPONENT_HEIGHT / 2;
const INK = '#24324a';
const LEAD = '#64748b';

export interface ComponentArtProps {
  component: CircuitComponent;
  state: ComponentState | undefined;
  short: boolean;
}

export function RealisticArt({ component, state, short }: ComponentArtProps) {
  switch (component.type) {
    case 'battery':
      return <RealisticBattery short={short} />;
    case 'bulb':
      return <RealisticBulb state={state} />;
    case 'switch':
      return <RealisticSwitch component={component} />;
    case 'motor':
      return <RealisticMotor state={state} />;
    case 'buzzer':
      return <RealisticBuzzer state={state} />;
    case 'led':
      return <RealisticLed state={state} />;
    case 'resistor':
      return <RealisticResistor />;
    case 'material':
      return <RealisticMaterial component={component} />;
    case 'wire':
      return <RealisticWire />;
  }
}

export function SymbolArt({ component, state, short }: ComponentArtProps) {
  switch (component.type) {
    case 'battery':
      return <SymbolBattery short={short} />;
    case 'bulb':
      return <SymbolBulb state={state} />;
    case 'switch':
      return <SymbolSwitch component={component} />;
    case 'motor':
      return <SymbolMotor state={state} />;
    case 'buzzer':
      return <SymbolBuzzer state={state} />;
    case 'led':
      return <SymbolLed state={state} />;
    case 'resistor':
      return <SymbolResistor />;
    case 'material':
      return <SymbolMaterial component={component} />;
    case 'wire':
      return <SymbolWire />;
  }
}

export function SymbolBadge({
  component,
  state,
}: {
  component: CircuitComponent;
  state: ComponentState | undefined;
}) {
  const width = 54;
  const height = 34;
  const x =
    component.position.x * CELL_SIZE > BOARD_WIDTH - 100 ? -18 - width : 18;
  const y = -HALF_HEIGHT - 36;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={9}
        fill="#ffffff"
        stroke="#c7d8e8"
        strokeWidth={2}
      />
      <svg
        x={x + 3}
        y={y + 3}
        width={width - 6}
        height={height - 6}
        viewBox={`${-HALF_WIDTH} ${-HALF_HEIGHT} ${COMPONENT_WIDTH} ${COMPONENT_HEIGHT}`}
        overflow="hidden"
      >
        <SymbolArt component={component} state={state} short={false} />
      </svg>
    </g>
  );
}

function RealisticBattery({ short }: { short: boolean }) {
  return (
    <>
      <g className={short ? 'short-shake' : undefined}>
        <line
          x1={-LEAD_X}
          y1={0}
          x2={-32}
          y2={0}
          stroke="#92400e"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={32}
          y1={0}
          x2={LEAD_X}
          y2={0}
          stroke="#92400e"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <rect
          x={-32}
          y={-16}
          width={64}
          height={32}
          rx={9}
          fill={short ? '#ef4444' : '#f4a261'}
          stroke="#b45309"
          strokeWidth={3}
        />
        <rect x={-38} y={-7} width={7} height={14} rx={3} fill="#d97706" />
        <rect
          x={-26}
          y={-12}
          width={52}
          height={4}
          rx={2}
          fill="#fff7ed"
          opacity={0.4}
        />
        <text
          x={-19}
          y={1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight={900}
          fill="#3b2a1a"
        >
          +
        </text>
        <text
          x={19}
          y={1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight={900}
          fill="#3b2a1a"
        >
          −
        </text>
      </g>
      {short ? <HeatWaves /> : null}
    </>
  );
}

function SymbolBattery({ short }: { short: boolean }) {
  const color = short ? '#ef4444' : INK;

  return (
    <>
      <g className={short ? 'short-shake' : undefined}>
        <line x1={-LEAD_X} y1={0} x2={-8} y2={0} stroke={color} strokeWidth={3} />
        <line x1={8} y1={0} x2={LEAD_X} y2={0} stroke={color} strokeWidth={3} />
        <line x1={-8} y1={-18} x2={-8} y2={18} stroke={color} strokeWidth={4} />
        <line x1={8} y1={-10} x2={8} y2={10} stroke={color} strokeWidth={8} />
      </g>
      {short ? <HeatWaves /> : null}
    </>
  );
}

function RealisticBulb({ state }: { state: ComponentState | undefined }) {
  const brightness = brightnessOf(state);
  const on = brightness > 0;

  return (
    <>
      {on ? (
        <circle
          className="component-glow"
          cx={0}
          cy={-5}
          r={26 + brightness * 10}
          fill="#ffd166"
          opacity={0.16 + brightness * 0.24}
        />
      ) : null}
      <path
        d={`M ${-LEAD_X} 0 L -14 0 L -10 12`}
        fill="none"
        stroke={LEAD}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d={`M ${LEAD_X} 0 L 14 0 L 10 12`}
        fill="none"
        stroke={LEAD}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle
        cx={0}
        cy={-5}
        r={19}
        fill={on ? '#ffe8a3' : '#e2e8f0'}
        fillOpacity={on ? 0.55 + brightness * 0.4 : 1}
        stroke="#94a3b8"
        strokeWidth={2.5}
      />
      <path
        d="M -9 4 L -5 -8 L 0 4 L 5 -8 L 9 4"
        fill="none"
        stroke={on ? '#fff7c2' : '#94a3b8'}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={-9} y={11} width={18} height={12} rx={3} fill="#64748b" />
      <line x1={-6} y1={15} x2={6} y2={15} stroke="#cbd5e1" strokeWidth={2} />
      <line x1={-6} y1={19} x2={6} y2={19} stroke="#cbd5e1" strokeWidth={2} />
    </>
  );
}

function SymbolBulb({ state }: { state: ComponentState | undefined }) {
  const brightness = brightnessOf(state);
  const on = brightness > 0;

  return (
    <>
      {on ? (
        <circle
          className="component-glow"
          cx={0}
          cy={0}
          r={22 + brightness * 7}
          fill="#ffd166"
          opacity={0.18 + brightness * 0.24}
        />
      ) : null}
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <circle
        cx={0}
        cy={0}
        r={18}
        fill={on ? '#ffe08a' : '#ffffff'}
        fillOpacity={on ? 0.85 : 1}
        stroke={INK}
        strokeWidth={3}
      />
      <line x1={-12} y1={-12} x2={12} y2={12} stroke={INK} strokeWidth={2.5} />
      <line x1={-12} y1={12} x2={12} y2={-12} stroke={INK} strokeWidth={2.5} />
    </>
  );
}

function RealisticSwitch({ component }: { component: SwitchComponent }) {
  const freeX = component.closed ? 26 : 22;
  const freeY = component.closed ? 0 : -16;

  return (
    <>
      <line
        x1={-LEAD_X}
        y1={0}
        x2={-26}
        y2={0}
        stroke="#115e59"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={26}
        y1={0}
        x2={LEAD_X}
        y2={0}
        stroke="#115e59"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <rect
        x={-34}
        y={-13}
        width={68}
        height={26}
        rx={10}
        fill="#d1faf4"
        stroke="#2a9d8f"
        strokeWidth={2.5}
      />
      <circle cx={-26} cy={0} r={5} fill="#115e59" />
      <circle cx={26} cy={0} r={5} fill="#115e59" />
      <line
        x1={-26}
        y1={0}
        x2={freeX}
        y2={freeY}
        stroke="#115e59"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx={freeX} cy={freeY} r={6} fill="#0f766e" />
    </>
  );
}

function SymbolSwitch({ component }: { component: SwitchComponent }) {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-16} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={16} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <circle cx={-16} cy={0} r={4} fill={INK} />
      <circle cx={16} cy={0} r={4} fill={INK} />
      {component.closed ? (
        <line x1={-16} y1={0} x2={16} y2={0} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      ) : (
        <line x1={-16} y1={0} x2={12} y2={-14} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      )}
    </>
  );
}

function RealisticMotor({ state }: { state: ComponentState | undefined }) {
  const intensity = state?.state === 'off' ? 0 : Math.max(state?.intensity ?? 0, 0.1);
  const duration = Math.min(Math.max(1.6 / intensity, 0.35), 3);
  const on = intensity > 0;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke="#1e40af" strokeWidth={4} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke="#1e40af" strokeWidth={4} />
      <circle cx={0} cy={0} r={18} fill="#4d96ff" stroke="#1e40af" strokeWidth={2.5} />
      <circle cx={0} cy={0} r={14} fill="#dbeafe" />
      <g>
        {on ? (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        ) : null}
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <rect x={-2.5} y={-13} width={5} height={11} rx={2.5} fill="#1d4ed8" />
          </g>
        ))}
        <circle cx={0} cy={0} r={4} fill="#1e40af" />
      </g>
    </>
  );
}

function SymbolMotor({ state }: { state: ComponentState | undefined }) {
  const on = state?.state !== 'off';

  return (
    <>
      {on ? (
        <circle
          className="component-glow"
          cx={0}
          cy={0}
          r={23}
          fill="#93c5fd"
          opacity={0.25}
        />
      ) : null}
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <circle
        cx={0}
        cy={0}
        r={18}
        fill={on ? '#dbeafe' : '#ffffff'}
        stroke={INK}
        strokeWidth={3}
      />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={18}
        fontWeight={900}
        fill={INK}
      >
        M
      </text>
    </>
  );
}

function RealisticBuzzer({ state }: { state: ComponentState | undefined }) {
  const on = state?.state !== 'off';

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke="#6d28d9" strokeWidth={4} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke="#6d28d9" strokeWidth={4} />
      <circle cx={0} cy={0} r={18} fill="#9b5de5" stroke="#6d28d9" strokeWidth={2.5} />
      <circle cx={0} cy={0} r={9} fill="#4c1d95" />
      <circle cx={0} cy={0} r={4} fill="#ddd6fe" />
      {on ? (
        <>
          <path
            d="M 21 -9 Q 28 0 21 9"
            className="buzzer-wave"
            fill="none"
            stroke="#c084fc"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d="M 27 -15 Q 37 0 27 15"
            className="buzzer-wave buzzer-wave--delayed"
            fill="none"
            stroke="#c084fc"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </>
  );
}

function SymbolBuzzer({ state }: { state: ComponentState | undefined }) {
  const on = state?.state !== 'off';

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-14} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={10} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <rect
        x={-14}
        y={-8}
        width={10}
        height={16}
        rx={2}
        fill={on ? '#f3e8ff' : '#ffffff'}
        stroke={INK}
        strokeWidth={3}
      />
      <path
        d="M -4 -8 L 8 -16 L 8 16 L -4 8 Z"
        fill={on ? '#f3e8ff' : '#ffffff'}
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {on ? (
        <>
          <path
            d="M 13 -7 Q 18 0 13 7"
            className="buzzer-wave"
            fill="none"
            stroke={INK}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path
            d="M 18 -12 Q 26 0 18 12"
            className="buzzer-wave buzzer-wave--delayed"
            fill="none"
            stroke={INK}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </>
  );
}

function RealisticLed({ state }: { state: ComponentState | undefined }) {
  const brightness = brightnessOf(state);
  const on = brightness > 0;

  return (
    <>
      {on ? (
        <circle
          className="component-glow"
          cx={0}
          cy={-4}
          r={22 + brightness * 7}
          fill="#ff4d6d"
          opacity={0.18 + brightness * 0.24}
        />
      ) : null}
      <line x1={-LEAD_X} y1={0} x2={-12} y2={0} stroke="#7f1d1d" strokeWidth={4} />
      <line x1={12} y1={0} x2={LEAD_X} y2={0} stroke="#7f1d1d" strokeWidth={4} />
      <path
        d="M -12 0 Q -12 -18 0 -18 Q 12 -18 12 0 Z"
        fill={on ? '#ff4d6d' : '#9f1239'}
        stroke="#7f1d1d"
        strokeWidth={2.5}
      />
      <rect x={-14} y={0} width={28} height={5} rx={2} fill="#7f1d1d" />
      <line x1={-6} y1={5} x2={-6} y2={14} stroke="#7f1d1d" strokeWidth={3} />
      <line x1={6} y1={5} x2={6} y2={14} stroke="#7f1d1d" strokeWidth={3} />
    </>
  );
}

function SymbolLed({ state }: { state: ComponentState | undefined }) {
  const on = state?.state !== 'off';

  return (
    <>
      {on ? (
        <circle
          className="component-glow"
          cx={0}
          cy={0}
          r={24}
          fill="#ef476f"
          opacity={0.18}
        />
      ) : null}
      <line x1={-LEAD_X} y1={0} x2={-14} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={8} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <path
        d="M -14 -12 L -14 12 L 8 0 Z"
        fill={on ? '#ef476f' : '#ffffff'}
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <line x1={8} y1={-14} x2={8} y2={14} stroke={INK} strokeWidth={4} />
      <g fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0 -16 L 8 -24" />
        <path d="M 5 -14 L 13 -22" />
        <path d="M 8 -24 L 4 -22 M 8 -24 L 6 -20" />
        <path d="M 13 -22 L 9 -20 M 13 -22 L 11 -18" />
      </g>
    </>
  );
}

function RealisticResistor() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-26} y2={0} stroke="#92400e" strokeWidth={4} />
      <line x1={26} y1={0} x2={LEAD_X} y2={0} stroke="#92400e" strokeWidth={4} />
      <rect
        x={-26}
        y={-10}
        width={52}
        height={20}
        rx={8}
        fill="#e7d3b0"
        stroke="#a16207"
        strokeWidth={2.5}
      />
      <rect x={-12} y={-10} width={6} height={20} fill="#7c2d12" />
      <rect x={-3} y={-10} width={6} height={20} fill="#dc2626" />
      <rect x={6} y={-10} width={6} height={20} fill="#d97706" />
    </>
  );
}

function SymbolResistor() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <rect x={-18} y={-8} width={36} height={16} fill="#ffffff" stroke={INK} strokeWidth={3} />
    </>
  );
}

function RealisticMaterial({ component }: { component: MaterialComponent }) {
  if (component.conductive) {
    return (
      <>
        <line x1={-LEAD_X} y1={0} x2={-22} y2={0} stroke="#607d8b" strokeWidth={4} />
        <line x1={22} y1={0} x2={LEAD_X} y2={0} stroke="#607d8b" strokeWidth={4} />
        <circle cx={-10} cy={-4} r={10} fill="#cfd8dc" stroke="#607d8b" strokeWidth={2.5} />
        <rect
          x={-2}
          y={-2}
          width={24}
          height={6}
          rx={3}
          fill="#b0bec5"
          stroke="#607d8b"
          strokeWidth={2}
        />
        <rect x={12} y={2} width={5} height={8} fill="#b0bec5" stroke="#607d8b" strokeWidth={1.5} />
        <rect x={18} y={2} width={5} height={10} fill="#b0bec5" stroke="#607d8b" strokeWidth={1.5} />
      </>
    );
  }

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-20} y2={0} stroke="#2e7d32" strokeWidth={4} />
      <line x1={20} y1={0} x2={LEAD_X} y2={0} stroke="#2e7d32" strokeWidth={4} />
      <rect
        x={-20}
        y={-12}
        width={40}
        height={24}
        rx={5}
        fill="#a5d6a7"
        stroke="#2e7d32"
        strokeWidth={2.5}
      />
      <rect x={-8} y={-12} width={16} height={24} fill="#f9a8d4" opacity={0.9} />
    </>
  );
}

function SymbolMaterial({ component }: { component: MaterialComponent }) {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <rect
        x={-18}
        y={-12}
        width={36}
        height={24}
        rx={4}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={3}
        strokeDasharray={component.conductive ? undefined : '6 4'}
      />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight={900}
        fill={INK}
      >
        {component.conductive ? 'M' : 'G'}
      </text>
    </>
  );
}

function RealisticWire() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-26} y2={0} stroke="#78909c" strokeWidth={4} />
      <line x1={26} y1={0} x2={LEAD_X} y2={0} stroke="#78909c" strokeWidth={4} />
      <path
        d="M -26 0 q 6 -10 12 0 q 6 10 12 0 q 6 -10 12 0 q 6 10 12 0"
        fill="none"
        stroke="#78909c"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  );
}

function SymbolWire() {
  return <line x1={-LEAD_X} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />;
}

function HeatWaves() {
  return (
    <g className="heat-waves" fill="none" stroke="#ef4444" strokeWidth={3} strokeLinecap="round">
      <path className="heat-wave" d="M -20 -30 Q -14 -36 -8 -30 T 4 -30" />
      <path className="heat-wave heat-wave--delayed" d="M -4 -36 Q 2 -42 8 -36 T 20 -36" />
      <path className="heat-wave heat-wave--late" d="M 8 -28 Q 14 -34 20 -28 T 32 -28" />
    </g>
  );
}

function brightnessOf(state: ComponentState | undefined): number {
  if (state === undefined || state.state === 'off') {
    return 0;
  }

  return Math.min(Math.max(state.intensity, 0), 1.6) / 1.6;
}
