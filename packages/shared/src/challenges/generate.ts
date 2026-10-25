import { simulateCircuit } from '../circuit/simulate';
import type { Circuit } from '../circuit/types';
import { evaluateLevelSuccess } from '../levels/success';
import type { LevelDefinition } from '../levels/types';
import { createRandom, pick, shuffle } from './rng';
import { templatesForTier } from './templates';
import type { GeneratedChallenge, TemplateResult } from './types';

const MAX_ATTEMPTS = 8;

/**
 * Builds a playable challenge from a tier definition and a seed.
 *
 * Templates only rearrange a known-good circuit or inject one known fault,
 * so the result stays solvable and pedagogically predictable. The generator
 * verifies every output against the real simulation before returning it.
 */
export function generateChallenge(
  tier: LevelDefinition,
  seed: number,
): GeneratedChallenge {
  if (tier.challenge === undefined) {
    throw new Error(`Level ${tier.id} is not a challenge tier`);
  }

  const builders = templatesForTier(tier.id);

  if (builders.length === 0) {
    throw new Error(`No challenge templates for ${tier.id}`);
  }

  const normalizedSeed = seed >>> 0;
  const random = createRandom(normalizedSeed);
  const ordered = shuffle(builders, random);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const build = pick(ordered, random);

    try {
      const result = build(random);
      const generated: GeneratedChallenge = {
        level: buildLevel(tier, result),
        seed: normalizedSeed,
        tierId: tier.id,
        templateId: result.id,
        variant: result.variant,
        solution: result.solution,
      };

      validateGeneratedChallenge(generated);
      return generated;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Could not generate a valid challenge for ${tier.id}: ${String(lastError)}`,
  );
}

export function validateGeneratedChallenge(
  generated: GeneratedChallenge,
): void {
  const { level, solution } = generated;
  const budget = level.challenge?.budget;

  if (budget === undefined) {
    throw new Error(`Generated challenge ${level.id} has no budget`);
  }

  const start = circuitFromLevel(level);
  const startSimulation = simulateCircuit(start);

  if (evaluateLevelSuccess(level, start, startSimulation)) {
    throw new Error(`Challenge ${level.id} is already solved at start`);
  }

  const solutionSimulation = simulateCircuit(solution);

  if (!solutionSimulation.ok) {
    throw new Error(`Challenge ${level.id} solution is not a closed circuit`);
  }

  if (solutionSimulation.shortCircuit) {
    throw new Error(`Challenge ${level.id} solution contains a short circuit`);
  }

  if (!evaluateLevelSuccess(level, solution, solutionSimulation)) {
    throw new Error(`Challenge ${level.id} solution does not satisfy the goal`);
  }

  const componentCount =
    level.preplacedComponents.length +
    level.availableComponents.reduce((total, item) => total + item.count, 0);

  if (componentCount !== budget) {
    throw new Error(
      `Challenge ${level.id} uses ${componentCount} components instead of ${budget}`,
    );
  }

  assertDistinctComponents(level.preplacedComponents.map((entry) => entry.component));
  assertDistinctComponents(solution.components);
  assertDistinctPositions(level.preplacedComponents.map((entry) => entry.component));
  assertDistinctPositions(solution.components);
}

export function circuitFromLevel(level: LevelDefinition): Circuit {
  return {
    components: level.preplacedComponents.map((entry) => entry.component),
    wires: level.preplacedWires,
  };
}

function buildLevel(
  tier: LevelDefinition,
  result: TemplateResult,
): LevelDefinition {
  return {
    ...tier,
    preplacedComponents: result.preplacedComponents,
    preplacedWires: result.preplacedWires,
    availableComponents: result.availableComponents,
    success: result.success,
  };
}

function assertDistinctComponents(
  components: Circuit['components'],
): void {
  const ids = components.map((component) => component.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error('Challenge contains duplicate component ids');
  }
}

function assertDistinctPositions(
  components: Circuit['components'],
): void {
  const positions = new Set(
    components.map((component) => `${component.position.x},${component.position.y}`),
  );

  if (positions.size !== components.length) {
    throw new Error('Challenge components overlap on the board');
  }
}
