import { describe, expect, it } from 'vitest';

import {
  COMPONENT_TYPES,
  EXPECTED_TERMINAL_IDS,
  createComponent,
  type ComponentType,
} from './index';

/**
 * Compile-time guard: adding a ComponentType without listing it in
 * COMPONENT_TYPES makes this assignment fail to typecheck.
 */
type MissingComponentType = Exclude<
  ComponentType,
  (typeof COMPONENT_TYPES)[number]
>;
const everyComponentTypeIsListed: MissingComponentType extends never
  ? true
  : false = true;

describe('component registry', () => {
  it('lists every component type exactly once', () => {
    expect(everyComponentTypeIsListed).toBe(true);
    expect(new Set(COMPONENT_TYPES).size).toBe(COMPONENT_TYPES.length);
  });

  it('creates the expected terminals for every component type', () => {
    for (const type of COMPONENT_TYPES) {
      const component = createComponent(type, { id: `component-${type}` });

      expect(component.terminals.map((terminal) => terminal.id)).toEqual(
        EXPECTED_TERMINAL_IDS[type],
      );
    }
  });
});
