import type { Circuit } from '../circuit';
import type {
  LevelAvailableComponent,
  LevelDefinition,
  PreplacedComponent,
  SuccessCondition,
} from '../levels/types';
import type { Wire } from '../circuit';

export type ChallengeVariant = 'build' | 'repair';

export interface TemplateResult {
  id: string;
  variant: ChallengeVariant;
  preplacedComponents: PreplacedComponent[];
  preplacedWires: Wire[];
  availableComponents: LevelAvailableComponent[];
  success: SuccessCondition[];
  /** Complete, successful circuit used to prove the puzzle is solvable. */
  solution: Circuit;
}

export interface GeneratedChallenge {
  level: LevelDefinition;
  seed: number;
  tierId: string;
  templateId: string;
  variant: ChallengeVariant;
  solution: Circuit;
}
