import {
  createComponent,
  serializeCircuit,
  type Circuit,
  type CircuitDocument,
  type CircuitSimulation,
  type PlayerProgress,
} from '@circuits/shared';

import { getText } from '../narration/fr';
import { PALETTE_ITEMS, type PaletteItem } from './paletteItems';

/**
 * The sandbox starts with the two components every child meets in level 1.
 * The other components appear once the matching level has been completed.
 */
const SANDBOX_BASE_KEYS = ['battery', 'bulb'] as const;

const SANDBOX_UNLOCK_RULES: readonly {
  levelId: string;
  keys: readonly string[];
}[] = [
  { levelId: 'light-03', keys: ['switch'] },
  { levelId: 'light-04', keys: ['metal', 'gum'] },
  { levelId: 'light-symbols', keys: ['resistor'] },
  { levelId: 'light-08', keys: ['motor'] },
  { levelId: 'light-09', keys: ['led'] },
];

export interface SandboxWorkMeta {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
}

export function sandboxPaletteItems(
  progress: PlayerProgress | null,
): PaletteItem[] {
  const unlocked = new Set<string>(SANDBOX_BASE_KEYS);

  if (progress !== null) {
    for (const rule of SANDBOX_UNLOCK_RULES) {
      if (progress.levels[rule.levelId]?.status === 'completed') {
        for (const key of rule.keys) {
          unlocked.add(key);
        }
      }
    }
  }

  return PALETTE_ITEMS.filter((item) => unlocked.has(item.key));
}

export function sandboxPaletteIsComplete(progress: PlayerProgress | null): boolean {
  const keys = new Set(
    sandboxPaletteItems(progress).map((item) => item.key),
  );

  return PALETTE_ITEMS.filter(
    (item) => item.key !== 'wire' && item.key !== 'buzzer',
  ).every((item) => keys.has(item.key));
}

export function createSandboxStarter(): CircuitDocument {
  return serializeCircuit({
    components: [
      createComponent('battery', {
        id: 'battery-1',
        position: { x: 3, y: 4 },
      }),
      createComponent('bulb', {
        id: 'bulb-1',
        position: { x: 8, y: 4 },
      }),
    ],
    wires: [],
  });
}

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
 * Curiosity prompts only mention components the child has already unlocked.
 * The short circuit already gets an immediate warning from Zap, so it never
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
