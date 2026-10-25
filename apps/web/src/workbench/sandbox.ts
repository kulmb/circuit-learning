import {
  serializeCircuit,
  type Circuit,
  type CircuitDocument,
  type CircuitSimulation,
} from '@circuits/shared';

import { getText } from '../narration/fr';
import { PALETTE_ITEMS, type PaletteItem } from './paletteItems';

/**
 * The free workshop offers the same components on every device. The buzzer
 * stays in the guided levels, where its sound has a purpose.
 */
const SANDBOX_HIDDEN_KEYS: ReadonlySet<string> = new Set(['buzzer']);

export interface SandboxWorkMeta {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
}

export function sandboxPaletteItems(): PaletteItem[] {
  return PALETTE_ITEMS.filter(
    (item) => !SANDBOX_HIDDEN_KEYS.has(item.key),
  );
}

/**
 * The free workshop opens on a blank board: the child picks every component
 * from the palette. Zap's first curiosity prompt suggests a battery and a bulb
 * for children who do not know where to start.
 */
export function createEmptySandbox(): CircuitDocument {
  return serializeCircuit({ components: [], wires: [] });
}

export function sandboxFingerprint(circuit: Circuit): string {
  return JSON.stringify(serializeCircuit(circuit));
}

export function nextSandboxName(
  works: readonly { name: string }[],
): string {
  const base = getText('sandbox.defaultName');
  const used = new Set(works.map((work) => work.name));

  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${base} ${index}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${base} ${Date.now()}`;
}

/**
 * Curiosity prompts only mention components available in the workshop. The
 * short circuit already gets an immediate warning from Zap, so it never
 * produces an idle prompt on top of it.
 */
export function sandboxCuriosityTips(
  circuit: Circuit,
  simulation: CircuitSimulation,
  availableKeys: ReadonlySet<string>,
): string[] {
  if (simulation.shortCircuit) {
    return [];
  }

  const components = circuit.components;
  if (components.length === 0) {
    return ['sandbox.curiosity.empty'];
  }

  const types = components.map((component) => component.type);
  const count = (type: string): number =>
    types.filter((candidate) => candidate === type).length;
  const hasConsumer =
    types.includes('bulb') || types.includes('motor') || types.includes('led');
  const tips: string[] = [];

  if (count('battery') === 0) {
    tips.push('sandbox.curiosity.battery');
  }
  if (!hasConsumer) {
    tips.push('sandbox.curiosity.bulb');
  }
  if (availableKeys.has('switch') && count('switch') === 0) {
    tips.push('sandbox.curiosity.switch');
  }
  if (count('battery') === 1) {
    tips.push('sandbox.curiosity.secondBattery');
  }
  if (count('bulb') === 1) {
    tips.push('sandbox.curiosity.secondBulb');
  }
  if (availableKeys.has('motor') && count('motor') === 0) {
    tips.push('sandbox.curiosity.motor');
  }
  if (availableKeys.has('led') && count('led') === 0) {
    tips.push('sandbox.curiosity.led');
  }
  if (
    (availableKeys.has('metal') || availableKeys.has('gum')) &&
    count('material') === 0
  ) {
    tips.push('sandbox.curiosity.material');
  }
  if (simulation.ok) {
    tips.push('sandbox.curiosity.photo');
  }
  tips.push('sandbox.curiosity.rotate');

  return tips;
}

export function chooseSandboxCuriosity(
  tips: readonly string[],
  previous: string | null,
): string | null {
  if (tips.length === 0) {
    return null;
  }

  const index = tips.findIndex((tip) => tip !== previous);

  return tips[index === -1 ? 0 : index] ?? null;
}

export function sandboxPhotoFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `circuit-zap-${slug === '' ? 'atelier' : slug}.png`;
}
