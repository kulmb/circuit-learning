import type { CircuitMeters } from '@circuits/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ZapMeter } from './ZapMeter';

const meters: CircuitMeters = {
  tension: { id: 'tension', status: 'medium', value: 4.5 },
  courant: { id: 'courant', status: 'high', value: 0.8 },
  resistance: { id: 'resistance', status: 'low', value: 5 },
  puissance: { id: 'puissance', status: 'off', value: null },
  charge: { id: 'charge', status: 'off', value: 0 },
  aimant: { id: 'aimant', status: 'off', value: 0 },
};

describe('Zap-meter', () => {
  it('shows three segments at most and never a number', () => {
    render(
      <ZapMeter
        meters={meters}
        visible={['tension', 'courant', 'resistance', 'puissance']}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Les mesures de Zap' }),
    ).toBeInTheDocument();

    const tension = document.querySelector('[data-meter-id="tension"]');
    const courant = document.querySelector('[data-meter-id="courant"]');
    const resistance = document.querySelector('[data-meter-id="resistance"]');
    const puissance = document.querySelector('[data-meter-id="puissance"]');

    expect(tension?.getAttribute('aria-label')).toBe(
      'Tension : poussée moyenne',
    );
    expect(tension?.querySelectorAll('.is-on')).toHaveLength(2);
    expect(courant?.querySelectorAll('.is-on')).toHaveLength(3);
    expect(resistance?.querySelectorAll('.is-on')).toHaveLength(1);
    expect(puissance?.querySelectorAll('.is-on')).toHaveLength(0);
    expect(puissance?.getAttribute('aria-label')).toBe(
      'Puissance : circuit ouvert',
    );
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('marks an alert without lighting a segment', () => {
    render(
      <ZapMeter
        meters={{
          ...meters,
          courant: { id: 'courant', status: 'alert', value: null },
        }}
        visible={['courant']}
      />,
    );

    const courant = document.querySelector('[data-meter-id="courant"]');

    expect(courant?.className).toContain('workbench-meter--alert');
    expect(courant?.querySelectorAll('.is-on')).toHaveLength(0);
    expect(courant?.getAttribute('aria-label')).toBe('Courant : attention');
  });

  it('hides the written qualifier in compact mode but keeps the label', () => {
    render(
      <ZapMeter meters={meters} visible={['tension']} compact />,
    );

    expect(screen.getByText('Tension')).toBeInTheDocument();
    expect(screen.queryByText('poussée moyenne')).not.toBeInTheDocument();
    expect(document.querySelector('[data-meter-id="tension"]')?.getAttribute(
      'aria-label',
    )).toBe('Tension : poussée moyenne');
  });
});
