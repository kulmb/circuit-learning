import { createComponent } from '../circuit';
import type { CircuitComponent } from '../circuit';
import type { LevelDefinition, PreplacedComponent } from './types';

const BOARD = { columns: 12, rows: 8 };

function preplaced(
  component: CircuitComponent,
  locked = true,
): PreplacedComponent {
  return { component, locked };
}

const batteryAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('battery', { id, position: { x, y } });

const bulbAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('bulb', { id, position: { x, y } });

const ledAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('led', { id, position: { x, y }, resistance: 10 });

const switchAt = (
  id: string,
  x: number,
  y: number,
  closed = false,
): CircuitComponent =>
  createComponent('switch', { id, position: { x, y }, closed });

const capacitorAt = (
  id: string,
  x: number,
  y: number,
  capacitance: number,
  initialVoltage = 0,
): CircuitComponent =>
  createComponent('capacitor', {
    id,
    position: { x, y },
    capacitance,
    initialVoltage,
  });

const resistorAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('resistor', { id, position: { x, y }, resistance: 10 });

export const CHAPTER_9_ID = 'capacitor';
export const CHAPTER_9_TITLE_ID = 'chapter.capacitor.title';

export const CHAPTER_9_LEVELS: LevelDefinition[] = [
  {
    id: 'cap-01',
    chapterId: CHAPTER_9_ID,
    order: 41,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.cap.01.title',
    goalTextId: 'level.cap.01.goal',
    introTextId: 'level.cap.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(capacitorAt('capacitor-1', 7, 4, 0.2)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'capacitor_filled', componentId: 'capacitor-1' },
      { type: 'component_on', componentId: 'bulb-1' },
      {
        type: 'lamp_stays_on_after_open',
        componentId: 'bulb-1',
        minDurationMs: 300,
      },
    ],
    hintTextIds: [
      'level.cap.01.hint.1',
      'level.cap.01.hint.2',
      'level.cap.01.hint.3',
    ],
    vocabularyIds: ['condensateur', 'reserve'],
    nextLevelId: 'cap-02',
  },
  {
    id: 'cap-02',
    chapterId: CHAPTER_9_ID,
    order: 42,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.cap.02.title',
    goalTextId: 'level.cap.02.goal',
    introTextId: 'level.cap.02.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(capacitorAt('capacitor-1', 7, 4, 0.2)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'capacitor_filled', componentId: 'capacitor-1' },
    ],
    hintTextIds: [
      'level.cap.02.hint.1',
      'level.cap.02.hint.2',
      'level.cap.02.hint.3',
    ],
    vocabularyIds: ['charge'],
    nextLevelId: 'cap-03',
  },
  {
    id: 'cap-03',
    chapterId: CHAPTER_9_ID,
    order: 43,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.cap.03.title',
    goalTextId: 'level.cap.03.goal',
    introTextId: 'level.cap.03.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(capacitorAt('capacitor-1', 3, 4, 0.05, 4.5)),
      preplaced(switchAt('switch-1', 6, 4)),
      preplaced(bulbAt('bulb-1', 9, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'capacitor_empty', componentId: 'capacitor-1' },
      { type: 'component_off', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.cap.03.hint.1',
      'level.cap.03.hint.2',
      'level.cap.03.hint.3',
    ],
    vocabularyIds: ['decharge'],
    nextLevelId: 'cap-04',
  },
  {
    id: 'cap-04',
    chapterId: CHAPTER_9_ID,
    order: 44,
    number: 4,
    kind: 'circuit',
    titleTextId: 'level.cap.04.title',
    goalTextId: 'level.cap.04.goal',
    introTextId: 'level.cap.04.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(capacitorAt('capacitor-1', 7, 4, 0.5)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'capacitor_filled', componentId: 'capacitor-1' },
      { type: 'component_on', componentId: 'bulb-1' },
      {
        type: 'lamp_stays_on_after_open',
        componentId: 'bulb-1',
        minDurationMs: 2000,
      },
    ],
    hintTextIds: [
      'level.cap.04.hint.1',
      'level.cap.04.hint.2',
      'level.cap.04.hint.3',
    ],
    vocabularyIds: ['condensateur', 'reserve'],
    nextLevelId: 'cap-05',
  },
  {
    id: 'cap-05',
    chapterId: CHAPTER_9_ID,
    order: 45,
    number: 5,
    kind: 'circuit',
    titleTextId: 'level.cap.05.title',
    goalTextId: 'level.cap.05.goal',
    introTextId: 'level.cap.05.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(capacitorAt('capacitor-small', 7, 2, 0.2)),
      preplaced(capacitorAt('capacitor-large', 7, 6, 0.5)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'capacitor_filled', componentId: 'capacitor-large' },
      { type: 'component_on', componentId: 'bulb-1' },
      {
        type: 'lamp_stays_on_after_open',
        componentId: 'bulb-1',
        minDurationMs: 3000,
      },
    ],
    hintTextIds: [
      'level.cap.05.hint.1',
      'level.cap.05.hint.2',
      'level.cap.05.hint.3',
    ],
    vocabularyIds: ['condensateur', 'reserve'],
    nextLevelId: 'cap-06',
  },
  {
    id: 'cap-06',
    chapterId: CHAPTER_9_ID,
    order: 46,
    number: 6,
    kind: 'circuit',
    titleTextId: 'level.cap.06.title',
    goalTextId: 'level.cap.06.goal',
    introTextId: 'level.cap.06.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['charge'],
    transient: { stepMs: 16 },
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(resistorAt('resistor-1', 4, 4)),
      preplaced(capacitorAt('capacitor-1', 6, 4, 0.02)),
      preplaced(switchAt('switch-charge', 4, 2)),
      preplaced(switchAt('switch-flash', 8, 2)),
      preplaced(ledAt('led-1', 10, 5)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'capacitor_filled', componentId: 'capacitor-1' },
      { type: 'flash_seen', componentId: 'led-1' },
    ],
    hintTextIds: [
      'level.cap.06.hint.1',
      'level.cap.06.hint.2',
      'level.cap.06.hint.3',
    ],
    vocabularyIds: ['condensateur', 'charge', 'decharge'],
    nextLevelId: null,
  },
];
