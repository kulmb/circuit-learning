export type Random = () => number;

/** Small deterministic PRNG so a challenge seed always rebuilds the same circuit. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], random: Random): T {
  const item = items[Math.floor(random() * items.length)];

  if (item === undefined) {
    throw new Error('Cannot pick from an empty list');
  }

  return item;
}

export function randomInt(
  random: Random,
  minimum: number,
  maximum: number,
): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = result[index];
    const other = result[target];

    if (current !== undefined && other !== undefined) {
      result[index] = other;
      result[target] = current;
    }
  }

  return result;
}
