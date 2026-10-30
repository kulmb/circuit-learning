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

const motorAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('motor', { id, position: { x, y } });

const ldrAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('ldr', {
    id,
    position: { x, y },
    lightResistance: 2,
    darkResistance: 1000,
    lightLevel: 1,
  });

const solarAt = (id: string, x: number, y: number): CircuitComponent =>
  createComponent('solar', { id, position: { x, y }, lightLevel: 1 });

const relayAt = (
  id: string,
  x: number,
  y: number,
  normallyClosed: boolean,
  threshold: number,
): CircuitComponent =>
  createComponent('relay', {
    id,
    position: { x, y },
    normallyClosed,
    threshold,
  });

export const CHAPTER_8_ID = 'sensor';
export const CHAPTER_8_TITLE_ID = 'chapter.sensor.title';

export const CHAPTER_8_LEVELS: LevelDefinition[] = [
  {
    id: 'sensor-01',
    chapterId: CHAPTER_8_ID,
    order: 38,
    number: 1,
    kind: 'circuit',
    titleTextId: 'level.sensor.01.title',
    goalTextId: 'level.sensor.01.goal',
    introTextId: 'level.sensor.01.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(ldrAt('ldr-1', 6, 4)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'light_response',
        componentId: 'bulb-1',
        litState: 'normal',
        darkState: 'off',
      },
    ],
    hintTextIds: [
      'level.sensor.01.hint.1',
      'level.sensor.01.hint.2',
      'level.sensor.01.hint.3',
    ],
    vocabularyIds: ['capteurLumiere'],
    nextLevelId: 'sensor-02',
  },
  {
    id: 'sensor-02',
    chapterId: CHAPTER_8_ID,
    order: 39,
    number: 2,
    kind: 'circuit',
    titleTextId: 'level.sensor.02.title',
    goalTextId: 'level.sensor.02.goal',
    introTextId: 'level.sensor.02.intro',
    board: BOARD,
    displayMode: 'overlay',
    preplacedComponents: [
      preplaced(batteryAt('battery-1', 2, 4)),
      preplaced(ldrAt('ldr-1', 4, 4)),
      preplaced(relayAt('relay-1', 7, 4, true, 0.01)),
      preplaced(bulbAt('bulb-1', 10, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'light_response',
        componentId: 'bulb-1',
        litState: 'off',
        darkState: 'normal',
      },
      { type: 'relay_state', componentId: 'relay-1', closed: true },
    ],
    hintTextIds: [
      'level.sensor.02.hint.1',
      'level.sensor.02.hint.2',
      'level.sensor.02.hint.3',
    ],
    vocabularyIds: ['capteurLumiere', 'relais'],
    nextLevelId: 'sensor-03',
  },
  {
    id: 'sensor-03',
    chapterId: CHAPTER_8_ID,
    order: 40,
    number: 3,
    kind: 'circuit',
    titleTextId: 'level.sensor.03.title',
    goalTextId: 'level.sensor.03.goal',
    introTextId: 'level.sensor.03.intro',
    board: BOARD,
    displayMode: 'realistic',
    preplacedComponents: [
      preplaced(solarAt('solar-1', 2, 4)),
      preplaced(motorAt('motor-1', 9, 4)),
    ],
    preplacedWires: [],
    availableComponents: [],
    success: [
      { type: 'circuit_ok' },
      {
        type: 'light_response',
        componentId: 'motor-1',
        litState: 'normal',
        darkState: 'off',
      },
    ],
    hintTextIds: [
      'level.sensor.03.hint.1',
      'level.sensor.03.hint.2',
      'level.sensor.03.hint.3',
    ],
    vocabularyIds: ['panneauSolaire'],
    nextLevelId: 'cap-01',
  },
];
