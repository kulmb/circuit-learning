import type {
  CircuitComponent,
  ComponentType,
  CreateComponentOptions,
} from '@circuits/shared';

import { fr } from '../narration/fr';

export type PaletteComponentOptions = Omit<CreateComponentOptions, 'id' | 'position'>;

export interface ComponentVisual {
  label: string;
  color: string;
}

export interface PaletteItem extends ComponentVisual {
  key: string;
  type: ComponentType;
  options?: PaletteComponentOptions;
}

const METAL_VISUAL: ComponentVisual = {
  label: fr.components.metal.label,
  color: '#90a4ae',
};

const GUM_VISUAL: ComponentVisual = {
  label: fr.components.gum.label,
  color: '#a5d6a7',
};

export const COMPONENT_VISUALS: Record<ComponentType, ComponentVisual> = {
  battery: {
    label: fr.components.battery.label,
    color: '#f4a261',
  },
  bulb: {
    label: fr.components.bulb.label,
    color: '#ffd166',
  },
  switch: {
    label: fr.components.switch.label,
    color: '#2a9d8f',
  },
  wire: {
    label: fr.components.wire.label,
    color: '#78909c',
  },
  motor: {
    label: fr.components.motor.label,
    color: '#4d96ff',
  },
  buzzer: {
    label: fr.components.buzzer.label,
    color: '#9b5de5',
  },
  led: {
    label: fr.components.led.label,
    color: '#ef476f',
  },
  resistor: {
    label: fr.components.resistor.label,
    color: '#8d6e63',
  },
  rheostat: {
    label: fr.components.rheostat.label,
    color: '#b08968',
  },
  material: METAL_VISUAL,
};

export const PALETTE_ITEMS: PaletteItem[] = [
  paletteItem('battery', 'battery', COMPONENT_VISUALS.battery),
  paletteItem('bulb', 'bulb', COMPONENT_VISUALS.bulb),
  paletteItem('switch', 'switch', COMPONENT_VISUALS.switch, { closed: false }),
  paletteItem('motor', 'motor', COMPONENT_VISUALS.motor),
  paletteItem('buzzer', 'buzzer', COMPONENT_VISUALS.buzzer),
  paletteItem('led', 'led', COMPONENT_VISUALS.led),
  paletteItem('resistor', 'resistor', COMPONENT_VISUALS.resistor),
  paletteItem('rheostat', 'rheostat', COMPONENT_VISUALS.rheostat, {
    wiperPosition: 0,
  }),
  paletteItem('metal', 'material', METAL_VISUAL, { conductive: true }),
  paletteItem('gum', 'material', GUM_VISUAL, { conductive: false }),
];

export function getComponentVisual(component: CircuitComponent): ComponentVisual {
  if (component.type === 'material') {
    return component.conductive ? METAL_VISUAL : GUM_VISUAL;
  }

  return COMPONENT_VISUALS[component.type];
}

function paletteItem(
  key: string,
  type: ComponentType,
  visual: ComponentVisual,
  options?: PaletteComponentOptions,
): PaletteItem {
  const item: PaletteItem = {
    key,
    type,
    label: visual.label,
    color: visual.color,
  };

  if (options !== undefined) {
    item.options = options;
  }

  return item;
}
