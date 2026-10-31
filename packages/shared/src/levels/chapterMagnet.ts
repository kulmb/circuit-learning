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

const electromagnetAt = (
  id: string,
  x: number,
  y: number,
  turns: number,
): CircuitComponent =>
  createComponent('electromagnet', { id, position: { x, y }, turns });

const relayAt = (
  id: string,
  x: number,
  y: number,
  normallyClosed = false,
): CircuitComponent =>
  createComponent('relay', { id, position: { x, y }, normallyClosed });

const reedAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('reed', { id, position: { x, y } });

export const CHAPTER_7_ID = 'magnet';
export const CHAPTER_7_TITLE_ID = 'chapter.magnet.title';

export const CHAPTER_7_LEVELS: LevelDefinition[] = [
  {
    id: 'mag-01',
    chapterId: CHAPTER_7_ID,
    order: 33,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.mag.01.title',
    goalTextId: 'level.mag.01.goal',
    introTextId: 'level.mag.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['aimant'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(electromagnetAt('coil-1', 8, 4, 40)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'magnet_attracts', componentId: 'coil-1', amount: 'some' },
    ],
    hintTextIds: [
      'level.mag.01.hint.1',
      'level.mag.01.hint.2',
      'level.mag.01.hint.3',
    ],
    vocabularyIds: ['electroAimant', 'bobine'],
    nextLevelId: 'mag-02',
  },
  {
    id: 'mag-02',
    chapterId: CHAPTER_7_ID,
    order: 34,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.mag.02.title',
    goalTextId: 'level.mag.02.goal',
    introTextId: 'level.mag.02.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['aimant'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(electromagnetAt('coil-short', 8, 2, 40)),
      preplaced(electromagnetAt('coil-long', 8, 6, 120)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'magnet_attracts', componentId: 'coil-long', amount: 'all' },
    ],
    hintTextIds: [
      'level.mag.02.hint.1',
      'level.mag.02.hint.2',
      'level.mag.02.hint.3',
    ],
    vocabularyIds: ['electroAimant', 'bobine'],
    nextLevelId: 'mag-03',
  },
  {
    id: 'mag-03',
    chapterId: CHAPTER_7_ID,
    order: 35,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.mag.03.title',
    goalTextId: 'level.mag.03.goal',
    introTextId: 'level.mag.03.intro',
    board: BOARD,
    displayMode: 'realistic',
    meters: ['aimant'],
    magnet: true,
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(reedAt('reed-1', 6, 4)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'reed_state', componentId: 'reed-1', closed: true },
      { type: 'component_on', componentId: 'bulb-1' },
    ],
    hintTextIds: [
      'level.mag.03.hint.1',
      'level.mag.03.hint.2',
      'level.mag.03.hint.3',
    ],
    vocabularyIds: ['lameSouple'],
    nextLevelId: 'mag-04',
  },
  {
    id: 'mag-04',
    chapterId: CHAPTER_7_ID,
    order: 36,
    number: 4,
    kind: 'circuit',
    titleTextId: 'level.mag.04.title',
    goalTextId: 'level.mag.04.goal',
    introTextId: 'level.mag.04.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['aimant'],
    preplacedComponents: [
      preplaced(batteryAt('coil-battery', 2, 2)),
      preplaced(switchAt('switch-1', 4, 2)),
      preplaced(relayAt('relay-1', 7, 4)),
      // Both circuits sit above the bottom edge: Zap, the trash and the zoom
      // controls own that strip on tablets and phones.
      preplaced(batteryAt('lamp-battery', 2, 4)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'relay_state', componentId: 'relay-1', closed: true },
      { type: 'component_on', componentId: 'bulb-1' },
      { type: 'switch_closed', componentId: 'switch-1' },
    ],
    hintTextIds: [
      'level.mag.04.hint.1',
      'level.mag.04.hint.2',
      'level.mag.04.hint.3',
    ],
    vocabularyIds: ['relais'],
    nextLevelId: 'mag-05',
  },
  {
    id: 'mag-05',
    chapterId: CHAPTER_7_ID,
    order: 37,
    number: 5,
    kind: 'circuit',
    titleTextId: 'level.mag.05.title',
    goalTextId: 'level.mag.05.goal',
    introTextId: 'level.mag.05.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['aimant'],
    magnet: true,
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(reedAt('reed-1', 6, 4)),
      preplaced(buzzerAt('buzzer-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'reed_state', componentId: 'reed-1', closed: true },
      { type: 'component_on', componentId: 'buzzer-1' },
    ],
    hintTextIds: [
      'level.mag.05.hint.1',
      'level.mag.05.hint.2',
      'level.mag.05.hint.3',
    ],
    vocabularyIds: ['lameSouple'],
    nextLevelId: 'sensor-01',
  },
];
