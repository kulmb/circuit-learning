import type {
  CapacitorComponent,
  CircuitComponent,
  ComponentState,
  DiodeComponent,
  ElectromagnetComponent,
  LdrComponent,
  MaterialComponent,
  ReedComponent,
  RheostatComponent,
  SolarComponent,
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
    case 'rheostat':
      return <RealisticRheostat component={component} />;
    case 'material':
      return <RealisticMaterial component={component} />;
    case 'diode':
      return <RealisticDiode component={component} />;
    case 'electromagnet':
      return <RealisticElectromagnet component={component} state={state} />;
    case 'reed':
      return <RealisticReed component={component} />;
    case 'relay':
      return <RealisticRelay state={state} />;
    case 'ldr':
      return <RealisticLdr component={component} />;
    case 'solar':
      return <RealisticSolar component={component} />;
    case 'capacitor':
      return <RealisticCapacitor component={component} state={state} />;
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
    case 'rheostat':
      return <SymbolRheostat component={component} />;
    case 'material':
      return <SymbolMaterial component={component} />;
    case 'diode':
      return <SymbolDiode />;
    case 'electromagnet':
      return <SymbolElectromagnet />;
    case 'reed':
      return <SymbolReed component={component} />;
    case 'relay':
      return <SymbolRelay state={state} />;
    case 'ldr':
      return <SymbolLdr />;
    case 'solar':
      return <SymbolSolar component={component} />;
    case 'capacitor':
      return <SymbolCapacitor state={state} />;
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

function RealisticRheostat({ component }: { component: RheostatComponent }) {
  const trackStart = -28;
  const trackEnd = 28;
  const trackY = 10;
  const wiperX =
    trackStart + (trackEnd - trackStart) * component.wiperPosition;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-34} y2={0} stroke="#92400e" strokeWidth={4} />
      <line x1={34} y1={0} x2={LEAD_X} y2={0} stroke="#92400e" strokeWidth={4} />
      <rect
        x={-34}
        y={-18}
        width={68}
        height={26}
        rx={8}
        fill="#e7d3b0"
        stroke="#a16207"
        strokeWidth={2.5}
      />
      {[-24, -16, -8, 0, 8, 16, 24].map((x) => (
        <line
          key={x}
          x1={x}
          y1={-14}
          x2={x}
          y2={4}
          stroke="#b45309"
          strokeWidth={1.6}
          opacity={0.65}
        />
      ))}
      <line
        x1={trackStart}
        y1={trackY}
        x2={trackEnd}
        y2={trackY}
        stroke="#92400e"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <rect
        x={wiperX - 6}
        y={-7}
        width={12}
        height={26}
        rx={4}
        fill="#ffffff"
        stroke="#92400e"
        strokeWidth={2.5}
      />
      <line
        x1={wiperX}
        y1={-7}
        x2={wiperX}
        y2={19}
        stroke="#d97706"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={wiperX} cy={-9} r={4} fill="#f59e0b" stroke="#92400e" strokeWidth={1.5} />
    </>
  );
}

function SymbolRheostat({ component }: { component: RheostatComponent }) {
  const arrowX = -14 + 28 * component.wiperPosition;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <rect
        x={-18}
        y={-8}
        width={36}
        height={16}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={3}
      />
      <line
        x1={arrowX}
        y1={16}
        x2={arrowX}
        y2={-16}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d={`M ${arrowX - 5} -9 L ${arrowX} -16 L ${arrowX + 5} -9`}
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function RealisticDiode({ component }: { component: DiodeComponent }) {
  const reversed = component.rotation === 180;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-20} y2={0} stroke="#7f1d1d" strokeWidth={4} />
      <line x1={20} y1={0} x2={LEAD_X} y2={0} stroke="#7f1d1d" strokeWidth={4} />
      <rect
        x={-20}
        y={-11}
        width={40}
        height={22}
        rx={9}
        fill="#334155"
        stroke="#0f172a"
        strokeWidth={2.5}
      />
      <rect x={reversed ? -20 : 12} y={-11} width={8} height={22} fill="#cbd5e1" />
      <text x={-12} y={1} textAnchor="middle" fontSize={11} fontWeight={900} fill="#e2e8f0">
        A
      </text>
      <text x={12} y={1} textAnchor="middle" fontSize={11} fontWeight={900} fill="#0f172a">
        K
      </text>
    </>
  );
}

function SymbolDiode() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-16} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={10} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <path d="M -16 -13 L -16 13 L 10 0 Z" fill="#ffffff" stroke={INK} strokeWidth={3} />
      <line x1={10} y1={-14} x2={10} y2={14} stroke={INK} strokeWidth={4} />
    </>
  );
}

function RealisticElectromagnet({
  component,
  state,
}: {
  component: ElectromagnetComponent;
  state: ComponentState | undefined;
}) {
  const loops = component.turns >= 100 ? 9 : 5;
  const strength = state?.magneticStrength ?? 0;
  const clipOpacity = strength > 0.05 ? 0.35 + strength * 0.65 : 0;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-26} y2={0} stroke="#92400e" strokeWidth={4} />
      <line x1={26} y1={0} x2={LEAD_X} y2={0} stroke="#92400e" strokeWidth={4} />
      <rect x={-26} y={-12} width={52} height={24} rx={12} fill="#f1f5f9" stroke="#94a3b8" />
      <rect x={-18} y={-6} width={36} height={12} rx={6} fill="#64748b" />
      {Array.from({ length: loops }, (_, index) => (
        <ellipse
          key={index}
          cx={-18 + (36 / Math.max(1, loops - 1)) * index}
          cy={0}
          rx={3}
          ry={13}
          fill="none"
          stroke="#b45309"
          strokeWidth={2.5}
        />
      ))}
      <g opacity={clipOpacity} stroke="#64748b" strokeWidth={2.5} fill="none">
        <path d="M 30 -12 q 6 4 0 8 q -6 4 0 8" />
        <path d="M 37 -8 q 5 4 0 8 q -5 4 0 8" />
        <path d="M 43 -12 q 5 4 0 8 q -5 4 0 8" />
      </g>
    </>
  );
}

function SymbolElectromagnet() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-24} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={24} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={-24} y1={0} x2={24} y2={0} stroke={INK} strokeWidth={3} />
      <g fill="none" stroke={INK} strokeWidth={3}>
        <path d="M -18 -12 q 8 12 0 24" />
        <path d="M -8 -12 q 8 12 0 24" />
        <path d="M 2 -12 q 8 12 0 24" />
        <path d="M 12 -12 q 8 12 0 24" />
      </g>
    </>
  );
}

function RealisticReed({ component }: { component: ReedComponent }) {
  const closed = component.normallyOpen ? component.magnetNear : !component.magnetNear;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-26} y2={0} stroke="#475569" strokeWidth={4} />
      <line x1={26} y1={0} x2={LEAD_X} y2={0} stroke="#475569" strokeWidth={4} />
      <rect
        x={-26}
        y={-11}
        width={52}
        height={22}
        rx={11}
        fill="#e0f2fe"
        stroke="#0284c7"
        strokeWidth={2.5}
        opacity={0.85}
      />
      <line
        x1={-22}
        y1={0}
        x2={closed ? 2 : -4}
        y2={closed ? 0 : -4}
        stroke="#334155"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={22}
        y1={0}
        x2={closed ? -2 : 4}
        y2={closed ? 0 : 4}
        stroke="#334155"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </>
  );
}

function SymbolReed({ component }: { component: ReedComponent }) {
  const closed = component.normallyOpen ? component.magnetNear : !component.magnetNear;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={-18} y1={0} x2={closed ? 0 : -6} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={closed ? 0 : 6} y2={closed ? 0 : -10} stroke={INK} strokeWidth={3} />
    </>
  );
}

function RealisticRelay({ state }: { state: ComponentState | undefined }) {
  const closed = state?.relayClosed === true;

  return (
    <>
      <rect x={-36} y={-22} width={72} height={44} rx={8} fill="#ede9fe" stroke="#6d28d9" strokeWidth={2.5} />
      <rect x={-28} y={-12} width={22} height={24} rx={4} fill="#c4b5fd" stroke="#6d28d9" strokeWidth={2} />
      <text x={-17} y={1} textAnchor="middle" fontSize={10} fontWeight={900} fill="#4c1d95">
        B
      </text>
      <line x1={-6} y1={-12} x2={-6} y2={12} stroke="#6d28d9" strokeWidth={2.5} />
      <line x1={-2} y1={-6} x2={20} y2={closed ? -6 : -18} stroke="#4c1d95" strokeWidth={3} strokeLinecap="round" />
      <circle cx={20} cy={closed ? -6 : -18} r={4} fill="#4c1d95" />
      <circle cx={20} cy={8} r={4} fill="#4c1d95" />
      <line x1={20} y1={8} x2={28} y2={8} stroke="#4c1d95" strokeWidth={2.5} />
      <line x1={-36} y1={-19.2} x2={-LEAD_X} y2={-19.2} stroke="#475569" strokeWidth={3} />
      <line x1={-36} y1={19.2} x2={-LEAD_X} y2={19.2} stroke="#475569" strokeWidth={3} />
      <line x1={36} y1={-19.2} x2={LEAD_X} y2={-19.2} stroke="#475569" strokeWidth={3} />
      <line x1={36} y1={19.2} x2={LEAD_X} y2={19.2} stroke="#475569" strokeWidth={3} />
    </>
  );
}

function SymbolRelay({ state }: { state: ComponentState | undefined }) {
  const closed = state?.relayClosed === true;

  return (
    <>
      <line x1={-LEAD_X} y1={-19.2} x2={-LEAD_X} y2={-19.2} stroke={INK} strokeWidth={3} />
      <line x1={-LEAD_X} y1={19.2} x2={-LEAD_X} y2={19.2} stroke={INK} strokeWidth={3} />
      <rect x={-28} y={-12} width={22} height={24} rx={4} fill="#ffffff" stroke={INK} strokeWidth={2.5} />
      <line x1={-6} y1={-12} x2={-6} y2={12} stroke={INK} strokeWidth={2.5} />
      <line x1={-4} y1={-5} x2={18} y2={closed ? -5 : -16} stroke={INK} strokeWidth={3} />
      <circle cx={18} cy={-5} r={3} fill={INK} />
      <circle cx={18} cy={9} r={3} fill={INK} />
      <line x1={18} y1={9} x2={LEAD_X} y2={9} stroke={INK} strokeWidth={3} />
    </>
  );
}

function RealisticLdr({ component }: { component: LdrComponent }) {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-24} y2={0} stroke="#92400e" strokeWidth={4} />
      <line x1={24} y1={0} x2={LEAD_X} y2={0} stroke="#92400e" strokeWidth={4} />
      <circle cx={0} cy={0} r={20} fill="#ffedd5" stroke="#c2410c" strokeWidth={3} />
      <path
        d="M -10 8 L -4 -8 L 2 8 L 8 -8 M -10 8 L -12 14 M 10 -6 L 12 -12"
        fill="none"
        stroke="#9a3412"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <g opacity={component.lightLevel} stroke="#f59e0b" strokeWidth={2}>
        <circle cx={-24} cy={-18} r={6} fill="#fde68a" stroke="none" />
        <line x1={-24} y1={-28} x2={-24} y2={-26} />
        <line x1={-34} y1={-18} x2={-32} y2={-18} />
      </g>
    </>
  );
}

function SymbolLdr() {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-18} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={18} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <rect x={-18} y={-9} width={36} height={18} fill="#ffffff" stroke={INK} strokeWidth={3} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round">
        <line x1={-10} y1={-16} x2={0} y2={-9} />
        <line x1={-4} y1={-18} x2={6} y2={-11} />
      </g>
    </>
  );
}

function RealisticSolar({ component }: { component: SolarComponent }) {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-28} y2={0} stroke="#475569" strokeWidth={4} />
      <line x1={28} y1={0} x2={LEAD_X} y2={0} stroke="#475569" strokeWidth={4} />
      <rect x={-28} y={-18} width={56} height={36} rx={4} fill="#1d4ed8" stroke="#1e3a8a" strokeWidth={2.5} />
      <g stroke="#93c5fd" strokeWidth={1.5}>
        <line x1={-28} y1={-6} x2={28} y2={-6} />
        <line x1={-28} y1={6} x2={28} y2={6} />
        <line x1={-10} y1={-18} x2={-10} y2={18} />
        <line x1={10} y1={-18} x2={10} y2={18} />
      </g>
      <g opacity={component.lightLevel} stroke="#f59e0b" strokeWidth={2}>
        <circle cx={-32} cy={-20} r={6} fill="#fde68a" stroke="none" />
        <line x1={-32} y1={-30} x2={-32} y2={-28} />
        <line x1={-42} y1={-20} x2={-40} y2={-20} />
      </g>
    </>
  );
}

function SymbolSolar({ component }: { component: SolarComponent }) {
  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-16} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={16} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={-16} y1={-12} x2={-16} y2={12} stroke={INK} strokeWidth={4} />
      <line x1={16} y1={-8} x2={16} y2={8} stroke={INK} strokeWidth={4} />
      <g opacity={component.lightLevel} stroke={INK} strokeWidth={2} strokeLinecap="round">
        <line x1={-6} y1={-16} x2={2} y2={-8} />
        <line x1={0} y1={-16} x2={8} y2={-8} />
      </g>
    </>
  );
}

function RealisticCapacitor({
  component,
  state,
}: {
  component: CapacitorComponent;
  state: ComponentState | undefined;
}) {
  const charge = state?.charge ?? 0;
  const fillHeight = Math.max(0, Math.min(1, charge)) * 30;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-22} y2={0} stroke="#92400e" strokeWidth={4} />
      <line x1={22} y1={0} x2={LEAD_X} y2={0} stroke="#92400e" strokeWidth={4} />
      <rect x={-22} y={-18} width={44} height={36} rx={7} fill="#fffbeb" stroke="#b45309" strokeWidth={2.5} />
      <rect
        x={-19}
        y={18 - fillHeight}
        width={38}
        height={fillHeight}
        rx={5}
        fill="#fbbf24"
        opacity={0.9}
      />
      <text x={0} y={1} textAnchor="middle" fontSize={10} fontWeight={900} fill="#78350f">
        {component.capacitance >= 0.4 ? 'BIG' : 'MICRO'}
      </text>
    </>
  );
}

function SymbolCapacitor({ state }: { state: ComponentState | undefined }) {
  const charge = state?.charge ?? 0;

  return (
    <>
      <line x1={-LEAD_X} y1={0} x2={-8} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={8} y1={0} x2={LEAD_X} y2={0} stroke={INK} strokeWidth={3} />
      <line x1={-6} y1={-15} x2={-6} y2={15} stroke={INK} strokeWidth={4} />
      <line x1={6} y1={-15} x2={6} y2={15} stroke={INK} strokeWidth={4} />
      <rect x={-4} y={-13} width={8} height={26} fill="#fbbf24" opacity={charge * 0.8} />
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
