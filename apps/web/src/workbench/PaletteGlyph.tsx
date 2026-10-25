import {
  createComponent,
  type CircuitComponent,
  type ComponentState,
} from '@circuits/shared';
import { useMemo } from 'react';

import { RealisticArt, SymbolArt } from './ComponentArt';
import type { DisplayMode } from './displayMode';
import type { PaletteItem } from './paletteItems';

const OFF_STATE: ComponentState = {
  current: 0,
  voltage: 0,
  power: 0,
  intensity: 0,
  state: 'off',
  on: false,
  reverseBiased: false,
};

export interface PaletteGlyphProps {
  item: PaletteItem;
  displayMode: DisplayMode;
  className?: string;
}

/**
 * The palette and the drag ghost show the same drawing as the board, so a
 * child recognises the component without reading a label or an abbreviation.
 */
export function PaletteGlyph({
  item,
  displayMode,
  className,
}: PaletteGlyphProps) {
  const component = useMemo<CircuitComponent>(
    () =>
      createComponent(item.type, {
        id: `palette-${item.key}`,
        ...(item.options ?? {}),
      }),
    [item],
  );

  return (
    <svg
      className={className}
      viewBox="-44 -28 88 56"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      overflow="hidden"
    >
      {displayMode === 'symbol' ? (
        <SymbolArt component={component} state={OFF_STATE} short={false} />
      ) : (
        <RealisticArt component={component} state={OFF_STATE} short={false} />
      )}
    </svg>
  );
}
