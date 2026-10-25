import { createComponent, createWire } from '../circuit';
import type {
  CircuitComponent,
  TerminalRef,
} from '../circuit';
import type {
  LevelDefinition,
  PreplacedComponent,
} from './types';

const BOARD = { columns: 12, rows: 8 };

function preplaced(
  component: CircuitComponent,
  locked = true,
): PreplacedComponent {
  return { component, locked };
}

function ref(componentId: string, terminalId: string): TerminalRef {
  return { componentId, terminalId };
}

const batteryAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('battery', { id, position: { x, y } });

const bulbAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('bulb', { id, position: { x, y } });

const switchAt = (
  id: string,
  x: number,
  y: number,
  closed = false,
): CircuitComponent =>
  createComponent('switch', { id, position: { x, y }, closed });

export const CHAPTER_1_ID = 'light';
export const CHAPTER_1_TITLE_ID = 'chapter.light.title';

export const CHAPTER_1_LEVELS: LevelDefinition[] = [
  {
    id: 'light-01',
    chapterId: CHAPTER_1_ID,
    order: 1,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.01.title',
    goalTextId: 'level.01.goal',
    introTextId: 'level.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 3, 4)),
      preplaced(bulbAt('bulb-1', 8, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.01.hint.1',
      'level.01.hint.2',
      'level.01.hint.3',
    ],
    vocabularyIds: ['circuitFerme', 'fil'],
    nextLevelId: 'light-02',
  },
  {
    id: 'light-02',
    chapterId: CHAPTER_1_ID,
    order: 2,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.02.title',
    goalTextId: 'level.02.goal',
    introTextId: 'level.02.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 3, 4)),
      preplaced(bulbAt('bulb-1', 8, 4)),
    ],
    preplacedWires: [
      createWire(
        'light-02-wire-1',
        ref('battery-1', 'positive'),
        ref('bulb-1', 'a'),
      ),
    ],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.02.hint.1',
      'level.02.hint.2',
      'level.02.hint.3',
    ],
    vocabularyIds: ['circuitOuvert', 'circuitFerme'],
    nextLevelId: 'light-03',
  },
  {
    id: 'light-03',
    chapterId: CHAPTER_1_ID,
    order: 3,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.03.title',
    goalTextId: 'level.03.goal',
    introTextId: 'level.03.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 5, 4)),
      preplaced(bulbAt('bulb-1', 9, 4)),
    ],
    preplacedWires: [
      createWire(
        'light-03-wire-1',
        ref('battery-1', 'positive'),
        ref('switch-1', 'a'),
      ),
      createWire(
        'light-03-wire-2',
        ref('switch-1', 'b'),
        ref('bulb-1', 'a'),
      ),
      createWire(
        'light-03-wire-3',
        ref('bulb-1', 'b'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
    ],
    hintTextIds: [
      'level.03.hint.1',
      'level.03.hint.2',
      'level.03.hint.3',
    ],
    vocabularyIds: ['interrupteur', 'circuitFerme'],
    nextLevelId: 'light-04',
  },
  {
    id: 'light-04',
    chapterId: CHAPTER_1_ID,
    order: 4,
    number: 4,
    kind: 'materials',
    titleTextId: 'level.04.title',
    goalTextId: 'level.04.goal',
    introTextId: 'level.04.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [],
    hintTextIds: [
      'level.04.hint.1',
      'level.04.hint.2',
      'level.04.hint.3',
    ],
    vocabularyIds: ['conducteur', 'isolant'],
    nextLevelId: 'light-05',
    materialsChallenge: {
      cards: [
        {
          id: 'key',
          labelTextId: 'material.key',
          conductive: true,
          visual: 'metal',
        },
        {
          id: 'gum',
          labelTextId: 'material.gum',
          conductive: false,
          visual: 'gum',
        },
        {
          id: 'spoon',
          labelTextId: 'material.spoon',
          conductive: true,
          visual: 'spoon',
        },
        {
          id: 'pencil',
          labelTextId: 'material.pencil',
          conductive: false,
          visual: 'pencil',
        },
        {
          id: 'aluminum',
          labelTextId: 'material.aluminum',
          conductive: true,
          visual: 'aluminum',
        },
      ],
      conductiveBinTextId: 'materials.conductiveBin',
      insulatingBinTextId: 'materials.insulatingBin',
    },
  },
  {
    id: 'light-05',
    chapterId: CHAPTER_1_ID,
    order: 5,
    number: 5,
    kind: 'circuit',
    titleTextId: 'level.05.title',
    goalTextId: 'level.05.goal',
    introTextId: 'level.05.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 6, 4)),
    ],
    preplacedWires: [],
    availableComponents: [{ key: 'bulb', type: 'bulb', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
      { type: 'component_state', componentId: 'bulb-2', state: 'dim' },
    ],
    hintTextIds: [
      'level.05.hint.1',
      'level.05.hint.2',
      'level.05.hint.3',
    ],
    vocabularyIds: ['serie'],
    nextLevelId: 'light-06',
  },
  {
    id: 'light-06',
    chapterId: CHAPTER_1_ID,
    order: 6,
    number: 6,
    kind: 'circuit',
    titleTextId: 'level.06.title',
    goalTextId: 'level.06.goal',
    introTextId: 'level.06.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 6, 4)),
    ],
    preplacedWires: [],
    availableComponents: [{ key: 'bulb', type: 'bulb', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'bulb-1', state: 'normal' },
      { type: 'component_state', componentId: 'bulb-2', state: 'normal' },
    ],
    hintTextIds: [
      'level.06.hint.1',
      'level.06.hint.2',
      'level.06.hint.3',
    ],
    vocabularyIds: ['parallele'],
    nextLevelId: 'light-symbols',
  },
  {
    id: 'light-symbols',
    chapterId: CHAPTER_1_ID,
    order: 7,
    number: null,
    kind: 'matching',
    titleTextId: 'symbols.title',
    goalTextId: 'symbols.goal',
    introTextId: 'symbols.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [],
    preplacedWires: [],
    availableComponents: [],
    success: [],
    hintTextIds: ['symbols.hint.1', 'symbols.hint.2', 'symbols.hint.3'],
    vocabularyIds: ['symbole'],
    nextLevelId: 'light-07',
    matchingChallenge: {
      pairs: [
        { id: 'battery', type: 'battery', labelTextId: 'component.battery.label' },
        { id: 'bulb', type: 'bulb', labelTextId: 'component.bulb.label' },
        { id: 'switch', type: 'switch', labelTextId: 'component.switch.label' },
        { id: 'motor', type: 'motor', labelTextId: 'component.motor.label' },
        { id: 'led', type: 'led', labelTextId: 'component.led.label' },
        {
          id: 'resistor',
          type: 'resistor',
          labelTextId: 'component.resistor.label',
        },
      ],
    },
  },
  {
    id: 'light-07',
    chapterId: CHAPTER_1_ID,
    order: 8,
    number: 7,
    kind: 'circuit',
    titleTextId: 'level.07.title',
    goalTextId: 'level.07.goal',
    introTextId: 'level.07.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 8, 4)),
    ],
    preplacedWires: [
      createWire(
        'light-07-wire-1',
        ref('battery-1', 'positive'),
        ref('bulb-1', 'a'),
      ),
      createWire(
        'light-07-wire-2',
        ref('bulb-1', 'b'),
        ref('battery-1', 'negative'),
      ),
      createWire(
        'light-07-short',
        ref('battery-1', 'positive'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.07.hint.1',
      'level.07.hint.2',
      'level.07.hint.3',
    ],
    vocabularyIds: ['courtCircuit'],
    nextLevelId: 'light-08',
  },
  {
    id: 'light-08',
    chapterId: CHAPTER_1_ID,
    order: 9,
    number: 8,
    kind: 'circuit',
    titleTextId: 'level.08.title',
    goalTextId: 'level.08.goal',
    introTextId: 'level.08.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [preplaced(batteryAt('battery-1', 3, 4))],
    preplacedWires: [],
    availableComponents: [{ key: 'motor', type: 'motor', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'motor-1' },
    ],
    hintTextIds: [
      'level.08.hint.1',
      'level.08.hint.2',
      'level.08.hint.3',
    ],
    vocabularyIds: ['moteur'],
    nextLevelId: 'light-09',
  },
  {
    id: 'light-09',
    chapterId: CHAPTER_1_ID,
    order: 10,
    number: 9,
    kind: 'circuit',
    titleTextId: 'level.09.title',
    goalTextId: 'level.09.goal',
    introTextId: 'level.09.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [preplaced(batteryAt('battery-1', 3, 4))],
    preplacedWires: [],
    availableComponents: [{ key: 'led', type: 'led', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'led-1' },
    ],
    hintTextIds: [
      'level.09.hint.1',
      'level.09.hint.2',
      'level.09.hint.3',
    ],
    vocabularyIds: ['polarite'],
    nextLevelId: 'light-10',
  },
  {
    id: 'light-10',
    chapterId: CHAPTER_1_ID,
    order: 11,
    number: 10,
    kind: 'circuit',
    titleTextId: 'level.10.title',
    goalTextId: 'level.10.goal',
    introTextId: 'level.10.intro',
    board: BOARD,
    displayMode: 'symbol',
    preplacedComponents: [preplaced(batteryAt('battery-1', 2, 4))],
    preplacedWires: [],
    availableComponents: [
      { key: 'switch', type: 'switch', count: 2 },
      { key: 'motor', type: 'motor', count: 1 },
      { key: 'bulb', type: 'bulb', count: 1 },
    ],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'motor-1' },
      { type: 'component_on', componentId: 'bulb-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'switch_closed', componentId: 'switch-2' },
      {
        type: 'switch_isolates',
        switchId: 'switch-1',
        onComponentId: 'motor-1',
        unaffectedComponentId: 'bulb-1',
      },
      {
        type: 'switch_isolates',
        switchId: 'switch-2',
        onComponentId: 'bulb-1',
        unaffectedComponentId: 'motor-1',
      },
    ],
    hintTextIds: [
      'level.10.hint.1',
      'level.10.hint.2',
      'level.10.hint.3',
    ],
    vocabularyIds: ['circuitFerme', 'interrupteur', 'moteur'],
    nextLevelId: 'current-01',
  },
];
