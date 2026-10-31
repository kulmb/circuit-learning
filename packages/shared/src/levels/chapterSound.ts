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

const buzzerAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('buzzer', { id, position: { x, y } });

const motorAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('motor', { id, position: { x, y } });

const switchAt = (
  id: string,
  x: number,
  y: number,
  closed = false,
): CircuitComponent =>
  createComponent('switch', { id, position: { x, y }, closed });

export const CHAPTER_5_ID = 'sound';
export const CHAPTER_5_TITLE_ID = 'chapter.sound.title';

export const CHAPTER_5_LEVELS: LevelDefinition[] = [
  {
    id: 'sound-01',
    chapterId: CHAPTER_5_ID,
    order: 27,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.sound.01.title',
    goalTextId: 'level.sound.01.goal',
    introTextId: 'level.sound.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 5, 4)),
      preplaced(buzzerAt('buzzer-1', 9, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'buzzer-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
    ],
    hintTextIds: [
      'level.sound.01.hint.1',
      'level.sound.01.hint.2',
      'level.sound.01.hint.3',
    ],
    vocabularyIds: ['circuitFerme', 'sonnerie'],
    nextLevelId: 'sound-02',
  },
  {
    id: 'sound-02',
    chapterId: CHAPTER_5_ID,
    order: 28,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.sound.02.title',
    goalTextId: 'level.sound.02.goal',
    introTextId: 'level.sound.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 5, 2)),
      preplaced(switchAt('switch-2', 8, 2)),
      preplaced(buzzerAt('buzzer-1', 9, 6)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'buzzer-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'switch_closed', componentId: 'switch-2' },
      {
        type: 'components_series',
        componentIds: ['switch-1', 'switch-2'],
      },
    ],
    hintTextIds: [
      'level.sound.02.hint.1',
      'level.sound.02.hint.2',
      'level.sound.02.hint.3',
    ],
    vocabularyIds: ['serie', 'sonnerie'],
    nextLevelId: 'sound-03',
  },
  {
    id: 'sound-03',
    chapterId: CHAPTER_5_ID,
    order: 29,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.sound.03.title',
    goalTextId: 'level.sound.03.goal',
    introTextId: 'level.sound.03.intro',
    board: BOARD,
    displayMode: 'symbol',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(motorAt('motor-1', 9, 2)),
      preplaced(buzzerAt('buzzer-1', 9, 6)),
      preplaced(switchAt('switch-1', 5, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'motor-1' },
      { type: 'component_on', componentId: 'buzzer-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
      {
        type: 'components_parallel',
        componentIds: ['motor-1', 'buzzer-1'],
      },
    ],
    hintTextIds: [
      'level.sound.03.hint.1',
      'level.sound.03.hint.2',
      'level.sound.03.hint.3',
    ],
    vocabularyIds: ['parallele', 'sonnerie'],
    nextLevelId: 'diode-01',
  },
];
