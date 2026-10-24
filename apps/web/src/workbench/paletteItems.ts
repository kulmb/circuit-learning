import type {
  CircuitComponent,
  ComponentType,
  CreateComponentOptions,
} from '@circuits/shared';

import { fr } from '../narration/fr';

export type PaletteComponentOptions = Omit<CreateComponentOptions, 'id' | 'position'>;

export interface ComponentVisual {
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
}

export interface PaletteItem extends ComponentVisual {
  key: string;
  type: ComponentType;
  options?: PaletteComponentOptions;
}

const METAL_VISUAL: ComponentVisual = {
  label: fr.components.metal.label,
  shortLabel: fr.components.metal.short,
  color: '#90a4ae',
  textColor: '#17252d',
};

const GUM_VISUAL: ComponentVisual = {
  label: fr.components.gum.label,
  shortLabel: fr.components.gum.short,
  color: '#a5d6a7',
  textColor: '#1b3b1f',
};

export const COMPONENT_VISUALS: Record<ComponentType, ComponentVisual> = {
  battery: {
    label: fr.components.battery.label,
    shortLabel: fr.components.battery.short,
    color: '#f4a261',
    textColor: '#3b2a1a',
  },
  bulb: {
    label: fr.components.bulb.label,
    shortLabel: fr.components.bulb.short,
    color: '#ffd166',
    textColor: '#4a3a00',
  },
  switch: {
    label: fr.components.switch.label,
    shortLabel: fr.components.switch.short,
    color: '#2a9d8f',
    textColor: '#ffffff',
  },
  wire: {
    label: fr.components.wire.label,
    shortLabel: fr.components.wire.short,
    color: '#78909c',
    textColor: '#ffffff',
  },
  motor: {
    label: fr.components.motor.label,
    shortLabel: fr.components.motor.short,
    color: '#4d96ff',
    textColor: '#ffffff',
  },
  buzzer: {
    label: fr.components.buzzer.label,
    shortLabel: fr.components.buzzer.short,
    color: '#9b5de5',
    textColor: '#ffffff',
  },
  led: {
    label: fr.components.led.label,
    shortLabel: fr.components.led.short,
    color: '#ef476f',
    textColor: '#ffffff',
  },
  resistor: {
    label: fr.components.resistor.label,
    shortLabel: fr.components.resistor.short,
    color: '#8d6e63',
    textColor: '#ffffff',
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
    shortLabel: visual.shortLabel,
    color: visual.color,
    textColor: visual.textColor,
  };

  if (options !== undefined) {
    item.options = options;
  }

  return item;
}
