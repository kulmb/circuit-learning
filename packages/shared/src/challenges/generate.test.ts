import { describe, expect, it } from 'vitest';

import { getLevelById } from '../levels/registry';
import { generateChallenge } from './generate';

const TIERS = ['defi-01', 'defi-02', 'defi-03', 'defi-04'] as const;
const SEEDS = 200;
const MAX_SEEDS = Array.from({ length: SEEDS }, (_, index) => index);

function tier(id: (typeof TIERS)[number]) {
  const level = getLevelById(id);

  if (level === undefined) {
    throw new Error(`Missing challenge tier ${id}`);
  }

  return level;
}

function fingerprint(seed: number, id: (typeof TIERS)[number]): string {
  const generated = generateChallenge(tier(id), seed);

  return JSON.stringify({
    templateId: generated.templateId,
    components: generated.level.preplacedComponents.map((entry) => ({
      id: entry.component.id,
      type: entry.component.type,
      position: entry.component.position,
      rotation: entry.component.rotation,
      closed: 'closed' in entry.component ? entry.component.closed : undefined,
      wiperPosition:
        'wiperPosition' in entry.component
          ? entry.component.wiperPosition
          : undefined,
    })),
    wires: generated.level.preplacedWires.map((wire) => ({
      from: wire.from,
      to: wire.to,
    })),
    available: generated.level.availableComponents,
    success: generated.level.success,
  });
}

describe('generated challenges', () => {
  it.each(TIERS)('%s is valid for two hundred seeds', (id) => {
    const seen = new Set<string>();
    const variants = new Set<string>();

    for (const seed of MAX_SEEDS) {
      const generated = generateChallenge(tier(id), seed);
      const budget = generated.level.challenge?.budget;

      expect(generated.tierId).toBe(id);
      expect(generated.level.id).toBe(id);
      expect(budget).toBeDefined();
      expect(generated.level.preplacedComponents.length).toBeLessThanOrEqual(
        budget ?? 0,
      );

      const componentCount =
        generated.level.preplacedComponents.length +
        generated.level.availableComponents.reduce(
          (total, item) => total + item.count,
          0,
        );

      expect(componentCount).toBe(budget);
      expect(generated.solution.components.length).toBe(budget);

      seen.add(fingerprint(seed, id));
      variants.add(generated.variant);
    }

    expect(variants).toEqual(new Set(['build', 'repair']));
    expect(seen.size).toBeGreaterThan(10);
  });

  it('is deterministic for the same seed', () => {
    for (const id of TIERS) {
      for (const seed of [0, 1, 2, 17, 199]) {
        expect(fingerprint(seed, id)).toBe(fingerprint(seed, id));
      }
    }
  });

  it('keeps the concept of each tier', () => {
    const series = generateChallenge(tier('defi-02'), 3);
    const parallel = generateChallenge(tier('defi-03'), 5);
    const mixed = generateChallenge(tier('defi-04'), 7);

    expect(series.level.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'components_series' }),
      ]),
    );
    expect(parallel.level.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'components_parallel' }),
      ]),
    );
    expect(mixed.level.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'switch_isolates' }),
      ]),
    );
  });

  it('rejects a level that is not a challenge tier', () => {
    const level = getLevelById('current-01');

    if (level === undefined) {
      throw new Error('Missing current-01');
    }

    expect(() => generateChallenge(level, 1)).toThrow();
  });
});
