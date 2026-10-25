import type {
  CircuitComponent,
  ComponentType,
  MeterId,
  QualitativeState,
  Wire,
} from '../circuit';

export type DisplayMode = 'realistic' | 'symbol' | 'overlay';

export type LevelKind = 'circuit' | 'materials' | 'matching';

export interface BoardSize {
  columns: number;
  rows: number;
}

export interface PreplacedComponent {
  component: CircuitComponent;
  locked: boolean;
}

export interface LevelAvailableComponent {
  key: string;
  type: ComponentType;
  count: number;
}

export type SuccessCondition =
  | { type: 'circuit_ok' }
  | { type: 'component_on'; componentId: string }
  | { type: 'component_off'; componentId: string }
  | {
      type: 'component_state';
      componentId: string;
      state: QualitativeState;
    }
  | { type: 'switch_closed'; componentId: string }
  | {
      type: 'switch_isolates';
      switchId: string;
      onComponentId: string;
      unaffectedComponentId: string;
    }
  | {
      type: 'switch_cuts';
      switchId: string;
      componentIds: string[];
    }
  | {
      type: 'components_series';
      componentIds: [string, string];
    }
  | {
      type: 'components_parallel';
      componentIds: [string, string];
    }
  | {
      type: 'brighter_than';
      componentId: string;
      thanComponentId: string;
    };

export type MaterialVisualKind = 'metal' | 'gum' | 'spoon' | 'pencil' | 'aluminum';

export interface MaterialCardDefinition {
  id: string;
  labelTextId: string;
  conductive: boolean;
  visual: MaterialVisualKind;
}

export interface MaterialsChallenge {
  cards: MaterialCardDefinition[];
  conductiveBinTextId: string;
  insulatingBinTextId: string;
}

export interface MatchingPairDefinition {
  id: string;
  type: ComponentType;
  labelTextId: string;
}

export interface MatchingChallenge {
  pairs: MatchingPairDefinition[];
}

export interface ChallengeConfig {
  /** Difficulty tier, one-based. */
  tier: number;
  /** Exact number of electrical components the challenge may use. */
  budget: number;
}

export interface LevelDefinition {
  id: string;
  chapterId: string;
  order: number;
  number: number | null;
  kind: LevelKind;
  titleTextId: string;
  goalTextId: string;
  introTextId: string;
  board: BoardSize;
  displayMode: DisplayMode;
  preplacedComponents: PreplacedComponent[];
  preplacedWires: Wire[];
  availableComponents: LevelAvailableComponent[];
  success: SuccessCondition[];
  hintTextIds: string[];
  vocabularyIds: string[];
  nextLevelId: string | null;
  /** Qualitative gauges shown next to the board. */
  meters?: MeterId[];
  /** Challenge tiers are generated from a seed before they are played. */
  challenge?: ChallengeConfig;
  materialsChallenge?: MaterialsChallenge;
  matchingChallenge?: MatchingChallenge;
}
