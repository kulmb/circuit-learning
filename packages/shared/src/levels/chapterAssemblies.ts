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

const bulbAt = (
  id: string,
  x: number,
  y: number,
  resistance?: number,
): CircuitComponent =>
  createComponent('bulb', {
    id,
    position: { x, y },
    ...(resistance === undefined ? {} : { resistance }),
  });

const switchAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('switch', { id, position: { x, y }, closed: false });

export const CHAPTER_3_ID = 'assemblies';
export const CHAPTER_3_TITLE_ID = 'chapter.assemblies.title';

export const CHAPTER_3_LEVELS: LevelDefinition[] = [
  {
    id: 'assembly-01',
    chapterId: CHAPTER_3_ID,
    order: 19,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.assembly.01.title',
    goalTextId: 'level.assembly.01.goal',
    introTextId: 'level.assembly.01.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 6, 4)),
    ],
    preplacedWires: [],
    availableComponents: [{ key: 'bulb', type: 'bulb', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'components_series',
        componentIds: ['bulb-1', 'bulb-2'],
      },
      { type: 'component_state', componentId: 'bulb-1', state: 'dim' },
      { type: 'component_state', componentId: 'bulb-2', state: 'dim' },
    ],
    hintTextIds: [
      'level.assembly.01.hint.1',
      'level.assembly.01.hint.2',
      'level.assembly.01.hint.3',
    ],
    vocabularyIds: ['serie'],
    nextLevelId: 'assembly-02',
  },
  {
    id: 'assembly-02',
    chapterId: CHAPTER_3_ID,
    order: 20,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.assembly.02.title',
    goalTextId: 'level.assembly.02.goal',
    introTextId: 'level.assembly.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant', 'puissance'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(bulbAt('bulb-1', 6, 4)),
    ],
    preplacedWires: [],
    availableComponents: [{ key: 'bulb', type: 'bulb', count: 1 }],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'components_parallel',
        componentIds: ['bulb-1', 'bulb-2'],
      },
      { type: 'component_state', componentId: 'bulb-1', state: 'normal' },
      { type: 'component_state', componentId: 'bulb-2', state: 'normal' },
    ],
    hintTextIds: [
      'level.assembly.02.hint.1',
      'level.assembly.02.hint.2',
      'level.assembly.02.hint.3',
    ],
    vocabularyIds: ['parallele'],
    nextLevelId: 'assembly-03',
  },
  {
    id: 'assembly-03',
    chapterId: CHAPTER_3_ID,
    order: 21,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.assembly.03.title',
    goalTextId: 'level.assembly.03.goal',
    introTextId: 'level.assembly.03.intro',
    board: BOARD,
    displayMode: 'overlay',
    meters: ['courant', 'resistance', 'puissance'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 1, 4)),
      preplaced(bulbAt('bulb-1', 4, 4, 3)),
      preplaced(bulbAt('bulb-2', 8, 3, 20)),
      preplaced(bulbAt('bulb-3', 8, 6, 20)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'components_parallel',
        componentIds: ['bulb-2', 'bulb-3'],
      },
      {
        type: 'brighter_than',
        componentId: 'bulb-1',
        thanComponentId: 'bulb-2',
      },
    ],
    hintTextIds: [
      'level.assembly.03.hint.1',
      'level.assembly.03.hint.2',
      'level.assembly.03.hint.3',
    ],
    vocabularyIds: ['combinaison'],
    nextLevelId: 'assembly-04',
  },
  {
    id: 'assembly-04',
    chapterId: CHAPTER_3_ID,
    order: 22,
    number: 4,
    kind: 'circuit',
    titleTextId: 'level.assembly.04.title',
    goalTextId: 'level.assembly.04.goal',
    introTextId: 'level.assembly.04.intro',
    board: BOARD,
    displayMode: 'symbol',
    meters: ['tension', 'courant', 'puissance'],
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 1, 4)),
      preplaced(switchAt('switch-1', 4, 4)),
      preplaced(switchAt('switch-2', 7, 4)),
      preplaced(bulbAt('bulb-1', 8, 3)),
      preplaced(bulbAt('bulb-2', 8, 6)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      { type: 'switch_closed', componentId: 'switch-1' },
      { type: 'switch_closed', componentId: 'switch-2' },
      {
        type: 'switch_cuts',
        switchId: 'switch-1',
        componentIds: ['bulb-1', 'bulb-2'],
      },
      {
        type: 'switch_isolates',
        switchId: 'switch-2',
        onComponentId: 'bulb-2',
        unaffectedComponentId: 'bulb-1',
      },
    ],
    hintTextIds: [
      'level.assembly.04.hint.1',
      'level.assembly.04.hint.2',
      'level.assembly.04.hint.3',
    ],
    vocabularyIds: ['combinaison'],
    nextLevelId: 'defi-01',
  },
];
