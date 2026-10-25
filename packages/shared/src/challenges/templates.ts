import {
  createComponent,
  createWire,
  type Circuit,
  type CircuitComponent,
  type ComponentType,
  type CreateComponentOptions,
  type TerminalRef,
  type Wire,
} from '../circuit';
import type {
  LevelAvailableComponent,
  PreplacedComponent,
  SuccessCondition,
} from '../levels/types';
import { pick, randomInt, type Random } from './rng';
import type { TemplateResult } from './types';

type PartOptions = Partial<
  Omit<CreateComponentOptions, 'id' | 'position'>
>;

function ref(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}

function part(
  type: ComponentType,
  id: string,
  x: number,
  y: number,
  options: PartOptions = {},
): CircuitComponent {
  return createComponent(type, {
    ...options,
    id,
    position: { x, y },
  });
}

function locked(component: CircuitComponent): PreplacedComponent {
  return { component, locked: true };
}

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }

  return item;
}

function row(random: Random): number {
  // Zap's bubble covers the top of a compact board and the lower-left corner
  // of a large one. Rows three and four stay clear on every layout.
  return pick([3, 4], random);
}

function mirrorX(x: number): number {
  return 11 - x;
}

function successForBulb(componentId: string): SuccessCondition[] {
  return [
    { type: 'circuit_ok' },
    { type: 'component_on', componentId },
  ];
}

function availableBulbs(count: number): LevelAvailableComponent[] {
  return count === 0 ? [] : [{ key: 'bulb', type: 'bulb', count }];
}

function solution(
  components: CircuitComponent[],
  wires: Wire[],
): Circuit {
  return { components, wires };
}

// ---------------------------------------------------------------------------
// Tier 1: one battery and one bulb.
// ---------------------------------------------------------------------------

function tier1Build(random: Random): TemplateResult {
  const y = row(random);
  const mirrored = random() < 0.5;
  const battery = part(
    'battery',
    'battery-1',
    mirrored ? 9 : 2,
    y,
  );
  const bulb = part('bulb', 'bulb-1', mirrored ? 2 : 9, y);
  const wires = [
    createWire('defi-01-w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
    createWire('defi-01-w2', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
  ];

  return {
    id: 'tier1-build',
    variant: 'build',
    preplacedComponents: [locked(battery)],
    preplacedWires: [],
    availableComponents: availableBulbs(1),
    success: successForBulb('bulb-1'),
    solution: solution([battery, bulb], wires),
  };
}

function tier1Repair(random: Random): TemplateResult {
  const y = row(random);
  const mirrored = random() < 0.5;
  const battery = part(
    'battery',
    'battery-1',
    mirrored ? 9 : 2,
    y,
  );
  const bulb = part('bulb', 'bulb-1', mirrored ? 2 : 9, y);
  const wires = [
    createWire('defi-01-w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
    createWire('defi-01-w2', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
  ];
  const missing = randomInt(random, 0, wires.length - 1);

  return {
    id: 'tier1-repair',
    variant: 'repair',
    preplacedComponents: [locked(battery), locked(bulb)],
    preplacedWires: wires.filter((_, index) => index !== missing),
    availableComponents: [],
    success: successForBulb('bulb-1'),
    solution: solution([battery, bulb], wires),
  };
}

// ---------------------------------------------------------------------------
// Tier 2: two bulbs in series.
// ---------------------------------------------------------------------------

function seriesBulbComponents(
  random: Random,
): [CircuitComponent, CircuitComponent, CircuitComponent] {
  const y = row(random);
  const mirrored = random() < 0.5;
  const xs = mirrored ? [10, 7, 3] : [1, 4, 8];

  return [
    part('battery', 'battery-1', at(xs, 0), y),
    part('bulb', 'bulb-1', at(xs, 1), y),
    part('bulb', 'bulb-2', at(xs, 2), y),
  ];
}

function seriesWires(): Wire[] {
  return [
    createWire('defi-02-w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
    createWire('defi-02-w2', ref('bulb-1', 'b'), ref('bulb-2', 'a')),
    createWire('defi-02-w3', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
  ];
}

function seriesSuccess(): SuccessCondition[] {
  return [
    { type: 'circuit_ok' },
    {
      type: 'components_series',
      componentIds: ['bulb-1', 'bulb-2'],
    },
    { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    { type: 'component_state', componentId: 'bulb-2', state: 'dim' },
  ];
}

function tier2Build(random: Random): TemplateResult {
  const [battery, firstBulb, secondBulb] = seriesBulbComponents(random);
  const wires = seriesWires();

  return {
    id: 'tier2-build',
    variant: 'build',
    preplacedComponents: [locked(battery), locked(firstBulb)],
    preplacedWires: [],
    availableComponents: availableBulbs(1),
    success: seriesSuccess(),
    solution: solution([battery, firstBulb, secondBulb], wires),
  };
}

function tier2Repair(random: Random): TemplateResult {
  const [battery, firstBulb, secondBulb] = seriesBulbComponents(random);
  const wires = seriesWires();
  const missing = randomInt(random, 0, wires.length - 1);

  return {
    id: 'tier2-repair',
    variant: 'repair',
    preplacedComponents: [
      locked(battery),
      locked(firstBulb),
      locked(secondBulb),
    ],
    preplacedWires: wires.filter((_, index) => index !== missing),
    availableComponents: [],
    success: seriesSuccess(),
    solution: solution([battery, firstBulb, secondBulb], wires),
  };
}

// ---------------------------------------------------------------------------
// Tier 3: two bulbs in parallel, one branch with a switch.
// ---------------------------------------------------------------------------

interface ParallelParts {
  battery: CircuitComponent;
  openSwitch: CircuitComponent;
  closedSwitch: CircuitComponent;
  firstBulb: CircuitComponent;
  secondBulb: CircuitComponent;
}

function parallelParts(random: Random): ParallelParts {
  const mirrored = random() < 0.5;
  const x = (value: number): number => (mirrored ? mirrorX(value) : value);

  return {
    battery: part('battery', 'battery-1', x(1), 4),
    openSwitch: part('switch', 'switch-1', x(4), 3, { closed: false }),
    closedSwitch: part('switch', 'switch-1', x(4), 3, { closed: true }),
    firstBulb: part('bulb', 'bulb-1', x(8), 4),
    secondBulb: part('bulb', 'bulb-2', x(8), 3),
  };
}

function parallelWires(): Wire[] {
  return [
    createWire('defi-03-w1', ref('battery-1', 'positive'), ref('bulb-1', 'a')),
    createWire('defi-03-w2', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
    createWire('defi-03-w3', ref('battery-1', 'positive'), ref('switch-1', 'a')),
    createWire('defi-03-w4', ref('switch-1', 'b'), ref('bulb-2', 'a')),
    createWire('defi-03-w5', ref('bulb-2', 'b'), ref('battery-1', 'negative')),
  ];
}

function parallelSuccess(): SuccessCondition[] {
  return [
    { type: 'circuit_ok' },
    { type: 'switch_closed', componentId: 'switch-1' },
    {
      type: 'components_parallel',
      componentIds: ['bulb-1', 'bulb-2'],
    },
    { type: 'component_state', componentId: 'bulb-1', state: 'normal' },
    { type: 'component_state', componentId: 'bulb-2', state: 'normal' },
    {
      type: 'switch_isolates',
      switchId: 'switch-1',
      onComponentId: 'bulb-2',
      unaffectedComponentId: 'bulb-1',
    },
  ];
}

function tier3Build(random: Random): TemplateResult {
  const parts = parallelParts(random);
  const wires = parallelWires();

  return {
    id: 'tier3-build',
    variant: 'build',
    preplacedComponents: [
      locked(parts.battery),
      locked(parts.openSwitch),
      locked(parts.firstBulb),
      locked(parts.secondBulb),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: parallelSuccess(),
    solution: solution(
      [
        parts.battery,
        parts.closedSwitch,
        parts.firstBulb,
        parts.secondBulb,
      ],
      wires,
    ),
  };
}

function tier3Repair(random: Random): TemplateResult {
  const parts = parallelParts(random);
  const targetWires = parallelWires();
  const fault = pick(['switch', 'wire', 'short'] as const, random);
  let startSwitch = parts.closedSwitch;
  let startWires = targetWires;

  if (fault === 'switch') {
    startSwitch = parts.openSwitch;
  } else if (fault === 'wire') {
    const missing = randomInt(random, 0, targetWires.length - 1);
    startWires = targetWires.filter((_, index) => index !== missing);
  } else {
    startWires = [
      ...targetWires,
      createWire(
        'defi-03-short',
        ref('battery-1', 'positive'),
        ref('battery-1', 'negative'),
      ),
    ];
  }

  return {
    id: `tier3-repair-${fault}`,
    variant: 'repair',
    preplacedComponents: [
      locked(parts.battery),
      locked(startSwitch),
      locked(parts.firstBulb),
      locked(parts.secondBulb),
    ],
    preplacedWires: startWires,
    availableComponents: [],
    success: parallelSuccess(),
    solution: solution(
      [
        parts.battery,
        parts.closedSwitch,
        parts.firstBulb,
        parts.secondBulb,
      ],
      targetWires,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tier 4: a motor branch and a dimmed bulb branch.
// ---------------------------------------------------------------------------

interface MixedParts {
  battery: CircuitComponent;
  openSwitch: CircuitComponent;
  closedSwitch: CircuitComponent;
  motor: CircuitComponent;
  lowRheostat: CircuitComponent;
  highRheostat: CircuitComponent;
  bulb: CircuitComponent;
}

function mixedParts(random: Random): MixedParts {
  const mirrored = random() < 0.5;
  const x = (value: number): number => (mirrored ? mirrorX(value) : value);

  return {
    battery: part('battery', 'battery-1', x(1), 3),
    openSwitch: part('switch', 'switch-1', x(4), 3, { closed: false }),
    closedSwitch: part('switch', 'switch-1', x(4), 3, { closed: true }),
    motor: part('motor', 'motor-1', x(8), 3),
    lowRheostat: part('rheostat', 'rheostat-1', x(4), 4, {
      minResistance: 2,
      maxResistance: 20,
      wiperPosition: 0,
    }),
    highRheostat: part('rheostat', 'rheostat-1', x(4), 4, {
      minResistance: 2,
      maxResistance: 20,
      wiperPosition: 1,
    }),
    bulb: part('bulb', 'bulb-1', x(8), 4),
  };
}

function mixedWires(): Wire[] {
  return [
    createWire('defi-04-w1', ref('battery-1', 'positive'), ref('switch-1', 'a')),
    createWire('defi-04-w2', ref('switch-1', 'b'), ref('motor-1', 'a')),
    createWire('defi-04-w3', ref('motor-1', 'b'), ref('battery-1', 'negative')),
    createWire('defi-04-w4', ref('battery-1', 'positive'), ref('rheostat-1', 'a')),
    createWire('defi-04-w5', ref('rheostat-1', 'b'), ref('bulb-1', 'a')),
    createWire('defi-04-w6', ref('bulb-1', 'b'), ref('battery-1', 'negative')),
  ];
}

function mixedSuccess(): SuccessCondition[] {
  return [
    { type: 'circuit_ok' },
    { type: 'switch_closed', componentId: 'switch-1' },
    { type: 'component_on', componentId: 'motor-1' },
    { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    {
      type: 'switch_isolates',
      switchId: 'switch-1',
      onComponentId: 'motor-1',
      unaffectedComponentId: 'bulb-1',
    },
  ];
}

function tier4Build(random: Random): TemplateResult {
  const parts = mixedParts(random);
  const wires = mixedWires();

  return {
    id: 'tier4-build',
    variant: 'build',
    preplacedComponents: [
      locked(parts.battery),
      locked(parts.openSwitch),
      locked(parts.motor),
      locked(parts.lowRheostat),
      locked(parts.bulb),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: mixedSuccess(),
    solution: solution(
      [
        parts.battery,
        parts.closedSwitch,
        parts.motor,
        parts.highRheostat,
        parts.bulb,
      ],
      wires,
    ),
  };
}

function tier4Repair(random: Random): TemplateResult {
  const parts = mixedParts(random);
  const targetWires = mixedWires();
  const fault = pick(['switch', 'rheostat', 'wire', 'short'] as const, random);
  let startSwitch = parts.closedSwitch;
  let startRheostat = parts.highRheostat;
  let startWires = targetWires;

  if (fault === 'switch') {
    startSwitch = parts.openSwitch;
  } else if (fault === 'rheostat') {
    startRheostat = parts.lowRheostat;
  } else if (fault === 'wire') {
    const missing = randomInt(random, 0, targetWires.length - 1);
    startWires = targetWires.filter((_, index) => index !== missing);
  } else {
    startWires = [
      ...targetWires,
      createWire(
        'defi-04-short',
        ref('battery-1', 'positive'),
        ref('battery-1', 'negative'),
      ),
    ];
  }

  return {
    id: `tier4-repair-${fault}`,
    variant: 'repair',
    preplacedComponents: [
      locked(parts.battery),
      locked(startSwitch),
      locked(parts.motor),
      locked(startRheostat),
      locked(parts.bulb),
    ],
    preplacedWires: startWires,
    availableComponents: [],
    success: mixedSuccess(),
    solution: solution(
      [
        parts.battery,
        parts.closedSwitch,
        parts.motor,
        parts.highRheostat,
        parts.bulb,
      ],
      targetWires,
    ),
  };
}

export function templatesForTier(tierId: string): Array<(random: Random) => TemplateResult> {
  switch (tierId) {
    case 'defi-01':
      return [tier1Build, tier1Repair];
    case 'defi-02':
      return [tier2Build, tier2Repair];
    case 'defi-03':
      return [tier3Build, tier3Repair];
    case 'defi-04':
      return [tier4Build, tier4Repair];
    default:
      return [];
  }
}
