import type {
  CircuitComponent,
  ComponentType,
  CreateComponentOptions,
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

export type PaletteComponentOptions = Omit<
  CreateComponentOptions,
  'id' | 'position'
>;

export interface LevelAvailableComponent {
  key: string;
  type: ComponentType;
  count: number;
  /** Variant options merged into the created component. */
  options?: PaletteComponentOptions;
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
    }
  | { type: 'capacitor_filled'; componentId: string }
  | { type: 'capacitor_empty'; componentId: string }
  | {
      type: 'lamp_stays_on_after_open';
      componentId: string;
      minDurationMs: number;
    }
  | { type: 'flash_seen'; componentId: string }
  | {
      type: 'magnet_attracts';
      componentId: string;
      amount: 'some' | 'all';
    }
  | { type: 'reed_state'; componentId: string; closed: boolean }
  | {
      type: 'reed_controls';
      reedId: string;
      componentId: string;
      stateNear: QualitativeState;
      stateFar: QualitativeState;
    }
  | { type: 'relay_state'; componentId: string; closed: boolean }
  | {
      type: 'relay_controls';
      relayId: string;
      componentId: string;
      stateOn: QualitativeState;
      stateOff: QualitativeState;
    }
  | {
      type: 'light_response';
      componentId: string;
      litState: QualitativeState;
      darkState: QualitativeState;
    }
  | { type: 'diode_conducts'; componentId: string }
  | { type: 'diode_blocks'; componentId: string }
  | { type: 'every_source_powers'; componentId: string };

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
  /** Run a time-based simulation for capacitor levels. */
  transient?: {
    stepMs?: number;
  };
  /** Show a draggable magnet accessory for reed levels. */
  magnet?: boolean;
  /** Challenge tiers are generated from a seed before they are played. */
  challenge?: ChallengeConfig;
  materialsChallenge?: MaterialsChallenge;
  matchingChallenge?: MatchingChallenge;
}
