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

const motorAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('motor', { id, position: { x, y } });

const ledAt = (
  id: string,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270 = 0,
): CircuitComponent =>
  createComponent('led', { id, position: { x, y }, rotation });

const rheostatAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('rheostat', {
    id,
    position: { x, y },
    minResistance: 2,
    maxResistance: 20,
    wiperPosition: 0,
  });

export const CHAPTER_2_ID = 'current';
export const CHAPTER_2_TITLE_ID = 'chapter.current.title';

export const CHAPTER_2_LEVELS: LevelDefinition[] = [
  {
    id: 'current-01',
    chapterId: CHAPTER_2_ID,
    order: 12,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.current.01.title',
    goalTextId: 'level.current.01.goal',
    introTextId: 'level.current.01.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(ledAt('led-1', 8, 4, 180)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'led-1' },
    ],
    hintTextIds: [
      'level.current.01.hint.1',
      'level.current.01.hint.2',
      'level.current.01.hint.3',
    ],
    vocabularyIds: ['borne'],
    nextLevelId: 'current-02',
  },
  {
    id: 'current-02',
    chapterId: CHAPTER_2_ID,
    order: 13,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.current.02.title',
    goalTextId: 'level.current.02.goal',
    introTextId: 'level.current.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 9, 4)),
    ],
    preplacedWires: [
      createWire(
        'current-02-wire-1',
        ref('bulb-1', 'a'),
        ref('battery-1', 'positive'),
      ),
      createWire(
        'current-02-wire-2',
        ref('bulb-1', 'b'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [{ key: 'battery', type: 'battery', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'bulb-1', state: 'bright' },
    ],
    hintTextIds: [
      'level.current.02.hint.1',
      'level.current.02.hint.2',
      'level.current.02.hint.3',
    ],
    vocabularyIds: ['tension'],
    nextLevelId: 'current-03',
  },
  {
    id: 'current-03',
    chapterId: CHAPTER_2_ID,
    order: 14,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.current.03.title',
    goalTextId: 'level.current.03.goal',
    introTextId: 'level.current.03.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(motorAt('motor-1', 8, 4)),
    ],
    preplacedWires: [
      createWire(
        'current-03-wire-1',
        ref('battery-1', 'positive'),
        ref('motor-1', 'a'),
      ),
      createWire(
        'current-03-wire-2',
        ref('motor-1', 'b'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [{ key: 'bulb', type: 'bulb', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'motor-1', state: 'dim' },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    ],
    hintTextIds: [
      'level.current.03.hint.1',
      'level.current.03.hint.2',
      'level.current.03.hint.3',
    ],
    vocabularyIds: ['courant'],
    nextLevelId: 'current-04',
  },
  {
    id: 'current-04',
    chapterId: CHAPTER_2_ID,
    order: 15,
    number: 4,
    kind: 'circuit',
    titleTextId: 'level.current.04.title',
    goalTextId: 'level.current.04.goal',
    introTextId: 'level.current.04.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 8, 4)),
    ],
    preplacedWires: [
      createWire(
        'current-04-wire-1',
        ref('battery-1', 'positive'),
        ref('bulb-1', 'a'),
      ),
      createWire(
        'current-04-wire-2',
        ref('bulb-1', 'b'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [{ key: 'resistor', type: 'resistor', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    ],
    hintTextIds: [
      'level.current.04.hint.1',
      'level.current.04.hint.2',
      'level.current.04.hint.3',
    ],
    vocabularyIds: ['resistance'],
    nextLevelId: 'current-05',
  },
  {
    id: 'current-05',
    chapterId: CHAPTER_2_ID,
    order: 16,
    number: 5,
    kind: 'circuit',
    titleTextId: 'level.current.05.title',
    goalTextId: 'level.current.05.goal',
    introTextId: 'level.current.05.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(rheostatAt('rheostat-1', 5, 4)),
      preplaced(bulbAt('bulb-1', 9, 4)),
    ],
    preplacedWires: [
      createWire(
        'current-05-wire-1',
        ref('battery-1', 'positive'),
        ref('rheostat-1', 'a'),
      ),
      createWire(
        'current-05-wire-2',
        ref('rheostat-1', 'b'),
        ref('bulb-1', 'a'),
      ),
      createWire(
        'current-05-wire-3',
        ref('bulb-1', 'b'),
        ref('battery-1', 'negative'),
      ),
    ],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    ],
    hintTextIds: [
      'level.current.05.hint.1',
      'level.current.05.hint.2',
      'level.current.05.hint.3',
    ],
    vocabularyIds: ['variateur'],
    nextLevelId: 'current-06',
  },
  {
    id: 'current-06',
    chapterId: CHAPTER_2_ID,
    order: 17,
    number: 6,
    kind: 'circuit',
    titleTextId: 'level.current.06.title',
    goalTextId: 'level.current.06.goal',
    introTextId: 'level.current.06.intro',
    board: BOARD,
    displayMode: 'symbol',
    preplacedComponents: [preplaced(batteryAt('battery-1', 2, 4))],
    preplacedWires: [],
    availableComponents: [
      { key: 'switch', type: 'switch', count: 1 },
      { key: 'bulb', type: 'bulb', count: 1 },
      { key: 'rheostat', type: 'rheostat', count: 1 },
    ],
    success: [
      { type: 'circuit_ok' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
    ],
    hintTextIds: [
      'level.current.06.hint.1',
      'level.current.06.hint.2',
      'level.current.06.hint.3',
    ],
    vocabularyIds: ['courant', 'resistance', 'variateur'],
    nextLevelId: null,
  },
];
