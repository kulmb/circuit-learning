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

const buzzerAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('buzzer', { id, position: { x, y } });

const switchAt = (
  id: string,
  x: number,
  y: number,
  closed = false,
): CircuitComponent =>
  createComponent('switch', { id, position: { x, y }, closed });

const diodeAt = (
  id: string,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270 = 0,
): CircuitComponent =>
  createComponent('diode', { id, position: { x, y }, rotation });

export const CHAPTER_6_ID = 'diode';
export const CHAPTER_6_TITLE_ID = 'chapter.diode.title';

export const CHAPTER_6_LEVELS: LevelDefinition[] = [
  {
    id: 'diode-01',
    chapterId: CHAPTER_6_ID,
    order: 30,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.diode.01.title',
    goalTextId: 'level.diode.01.goal',
    introTextId: 'level.diode.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(diodeAt('diode-1', 6, 4)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
      { type: 'diode_conducts', componentId: 'diode-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
    ],
    hintTextIds: [
      'level.diode.01.hint.1',
      'level.diode.01.hint.2',
      'level.diode.01.hint.3',
    ],
    vocabularyIds: ['diode', 'sensUnique'],
    nextLevelId: 'diode-02',
  },
  {
    id: 'diode-02',
    chapterId: CHAPTER_6_ID,
    order: 31,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.diode.02.title',
    goalTextId: 'level.diode.02.goal',
    introTextId: 'level.diode.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(diodeAt('diode-1', 6, 4)),
      preplaced(buzzerAt('buzzer-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'buzzer-1' },
      { type: 'diode_conducts', componentId: 'diode-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
    ],
    hintTextIds: [
      'level.diode.02.hint.1',
      'level.diode.02.hint.2',
      'level.diode.02.hint.3',
    ],
    vocabularyIds: ['diode', 'sensUnique'],
    nextLevelId: 'diode-03',
  },
  {
    id: 'diode-03',
    chapterId: CHAPTER_6_ID,
    order: 32,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.diode.03.title',
    goalTextId: 'level.diode.03.goal',
    introTextId: 'level.diode.03.intro',
    board: BOARD,
    displayMode: 'symbol',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 2)),
      preplaced(batteryAt('battery-2', 2, 6)),
      preplaced(diodeAt('diode-1', 5, 2)),
      preplaced(diodeAt('diode-2', 5, 6)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'component_on', componentId: 'bulb-1' },
      { type: 'diode_conducts', componentId: 'diode-1' },
      { type: 'diode_conducts', componentId: 'diode-2' },
      { type: 'every_source_powers', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.diode.03.hint.1',
      'level.diode.03.hint.2',
      'level.diode.03.hint.3',
    ],
    vocabularyIds: ['diode', 'sensUnique'],
    nextLevelId: 'mag-01',
  },
];
