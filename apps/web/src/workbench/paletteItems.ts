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

function metalVisual(): ComponentVisual {
  return {
    label: fr.components.metal.label,
    color: '#90a4ae',
  };
}

function gumVisual(): ComponentVisual {
  return {
    label: fr.components.gum.label,
    color: '#a5d6a7',
  };
}

function componentVisuals(): Record<ComponentType, ComponentVisual> {
  return {
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
    diode: {
      label: fr.components.diode.label,
      color: '#e76f51',
    },
    electromagnet: {
      label: fr.components.electromagnet.label,
      color: '#8e7dbe',
    },
    reed: {
      label: fr.components.reed.label,
      color: '#48cae4',
    },
    relay: {
      label: fr.components.relay.label,
      color: '#6d597a',
    },
    ldr: {
      label: fr.components.ldr.label,
      color: '#f4a261',
    },
    solar: {
      label: fr.components.solar.label,
      color: '#457b9d',
    },
    capacitor: {
      label: fr.components.capacitor.label,
      color: '#e9c46a',
    },
    material: metalVisual(),
  };
}

/** Built per render so the palette follows the active language. */
export function buildPaletteItems(): PaletteItem[] {
  const visuals = componentVisuals();

  return [
    paletteItem('battery', 'battery', visuals.battery),
    paletteItem('bulb', 'bulb', visuals.bulb),
    paletteItem('switch', 'switch', visuals.switch, { closed: false }),
    paletteItem('motor', 'motor', visuals.motor),
    paletteItem('buzzer', 'buzzer', visuals.buzzer),
    paletteItem('led', 'led', visuals.led),
    paletteItem('diode', 'diode', visuals.diode),
    paletteItem('electromagnet-short', 'electromagnet', {
      label: fr.components.electromagnetShort.label,
      color: visuals.electromagnet.color,
    }, { turns: 40 }),
    paletteItem('electromagnet-long', 'electromagnet', {
      label: fr.components.electromagnetLong.label,
      color: visuals.electromagnet.color,
    }, { turns: 120 }),
    paletteItem('reed', 'reed', visuals.reed),
    paletteItem('relay', 'relay', visuals.relay),
    paletteItem('ldr', 'ldr', visuals.ldr),
    paletteItem('solar', 'solar', visuals.solar),
    paletteItem('capacitor-small', 'capacitor', {
      label: fr.components.capacitorSmall.label,
      color: visuals.capacitor.color,
    }, { capacitance: 0.2 }),
    paletteItem('capacitor-large', 'capacitor', {
      label: fr.components.capacitorLarge.label,
      color: visuals.capacitor.color,
    }, { capacitance: 0.5 }),
    paletteItem('resistor', 'resistor', visuals.resistor),
    paletteItem('rheostat', 'rheostat', visuals.rheostat, {
      wiperPosition: 0,
    }),
    paletteItem('metal', 'material', metalVisual(), { conductive: true }),
    paletteItem('gum', 'material', gumVisual(), { conductive: false }),
  ];
}

export function getComponentVisual(component: CircuitComponent): ComponentVisual {
  if (component.type === 'material') {
    return component.conductive ? metalVisual() : gumVisual();
  }

  return componentVisuals()[component.type];
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
