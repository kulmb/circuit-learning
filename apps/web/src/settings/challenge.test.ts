import { describe, expect, it } from 'vitest';

import { createParentChallenge } from './challenge';

describe('parent challenge', () => {
  it('offers three distinct answers including the product', () => {
    const challenge = createParentChallenge(() => 0.5);

    expect(challenge.a).toBeGreaterThanOrEqual(3);
    expect(challenge.b).toBeGreaterThanOrEqual(6);
    expect(challenge.answer).toBe(challenge.a * challenge.b);
    expect(challenge.choices).toHaveLength(3);
    expect(new Set(challenge.choices).size).toBe(3);
    expect(challenge.choices).toContain(challenge.answer);
  });

  it('always produces a solvable product', () => {
    for (let index = 0; index < 50; index += 1) {
      const challenge = createParentChallenge();
      expect(challenge.choices).toContain(challenge.a * challenge.b);
    }
  });
});
