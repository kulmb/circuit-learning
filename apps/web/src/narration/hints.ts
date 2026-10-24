import type {
  Circuit,
  CircuitSimulation,
  DiagnosticCode,
  TerminalRef,
} from '@circuits/shared';

import type { TextId } from './fr';

export type ZapExpression = 'content' | 'thinking' | 'surprised' | 'alert';

export type HintCode =
  | 'short_circuit'
  | 'missing_battery'
  | 'switch_open'
  | 'insulating_material'
  | 'bulb_one_side'
  | 'led_reversed'
  | 'open_circuit'
  | 'success'
  | 'error';

export interface HintHighlight {
  terminalRefs: TerminalRef[];
  componentIds: string[];
  wireIds: string[];
  paletteKey: string | null;
}

export interface HintPlan {
  code: HintCode;
  texts: readonly TextId[];
  highlight: HintHighlight | null;
}

const HINTS: Record<Exclude<HintCode, 'success'>, readonly [TextId, TextId, TextId]> = {
  short_circuit: ['zap.hint.short.1', 'zap.hint.short.2', 'zap.hint.short.3'],
  missing_battery: [
    'zap.hint.battery.1',
    'zap.hint.battery.2',
    'zap.hint.battery.3',
  ],
  switch_open: ['zap.hint.switch.1', 'zap.hint.switch.2', 'zap.hint.switch.3'],
  insulating_material: [
    'zap.hint.insulator.1',
    'zap.hint.insulator.2',
    'zap.hint.insulator.3',
  ],
  bulb_one_side: ['zap.hint.bulb.1', 'zap.hint.bulb.2', 'zap.hint.bulb.3'],
  led_reversed: ['zap.hint.led.1', 'zap.hint.led.2', 'zap.hint.led.3'],
  open_circuit: ['zap.hint.open.1', 'zap.hint.open.2', 'zap.hint.open.3'],
  error: ['zap.hint.error.1', 'zap.hint.error.2', 'zap.hint.error.3'],
};

const DIAGNOSTIC_ORDER: readonly DiagnosticCode[] = [
  'short_circuit',
  'missing_battery',
  'switch_open',
  'insulating_material',
  'bulb_one_side',
  'led_reversed',
  'open_circuit',
  'simulation_error',
];

export function buildHintPlan(
  simulation: CircuitSimulation,
  circuit: Circuit,
): HintPlan {
  if (simulation.ok) {
    const hasLitBulb = circuit.components.some(
      (component) =>
        component.type === 'bulb' &&
        simulation.states[component.id]?.state !== 'off',
    );

    return {
      code: 'success',
      texts: [hasLitBulb ? 'zap.successBulb' : 'zap.successGeneric'],
      highlight: null,
    };
  }

  const diagnostic = findPrimaryDiagnostic(simulation);
  const code = diagnosticCodeToHintCode(diagnostic?.code);
  const texts = HINTS[code];

  return {
    code,
    texts,
    highlight: buildHighlight(code, diagnostic),
  };
}

export function hintExpression(plan: HintPlan, level: number): ZapExpression {
  if (plan.code === 'success') {
    return 'content';
  }

  if (plan.code === 'short_circuit') {
    return 'alert';
  }

  if (level >= 3) {
    return 'surprised';
  }

  return 'thinking';
}

function findPrimaryDiagnostic(simulation: CircuitSimulation) {
  for (const code of DIAGNOSTIC_ORDER) {
    const diagnostic = simulation.diagnostics.find((item) => item.code === code);
    if (diagnostic !== undefined) {
      return diagnostic;
    }
  }

  return undefined;
}

function diagnosticCodeToHintCode(
  code: DiagnosticCode | undefined,
): Exclude<HintCode, 'success'> {
  if (code === undefined) {
    return 'open_circuit';
  }

  if (code === 'simulation_error') {
    return 'error';
  }

  return code;
}

function buildHighlight(
  code: Exclude<HintCode, 'success'>,
  diagnostic:
    | {
        componentIds: string[];
        terminalRefs: TerminalRef[];
        wireIds: string[];
      }
    | undefined,
): HintHighlight | null {
  if (code === 'missing_battery') {
    return {
      terminalRefs: [],
      componentIds: [],
      wireIds: [],
      paletteKey: 'battery',
    };
  }

  if (diagnostic === undefined) {
    return null;
  }

  return {
    terminalRefs: diagnostic.terminalRefs,
    componentIds: diagnostic.componentIds,
    wireIds: diagnostic.wireIds,
    paletteKey: null,
  };
}
