import { createComponent } from '@circuits/shared';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RealisticArt, SymbolArt } from './ComponentArt';

const NEW_COMPONENT_TYPES = [
  'diode',
  'electromagnet',
  'reed',
  'relay',
  'ldr',
  'solar',
  'capacitor',
] as const;

describe('0.4.0 component art', () => {
  for (const type of NEW_COMPONENT_TYPES) {
    it(`draws ${type} in realistic and symbol modes`, () => {
      const component = createComponent(type, { id: `component-${type}` });

      const realistic = render(
        <svg>
          <RealisticArt component={component} state={undefined} short={false} />
        </svg>,
      );
      expect(
        realistic.container.querySelectorAll(
          'path, rect, circle, line, ellipse, text',
        ).length,
      ).toBeGreaterThan(0);

      const symbol = render(
        <svg>
          <SymbolArt component={component} state={undefined} short={false} />
        </svg>,
      );
      expect(
        symbol.container.querySelectorAll(
          'path, rect, circle, line, ellipse, text',
        ).length,
      ).toBeGreaterThan(0);
    });
  }
});
