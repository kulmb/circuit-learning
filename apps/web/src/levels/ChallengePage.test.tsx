import { getLevelById } from '@circuits/shared/levels';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkbenchStore } from '../workbench/workbenchStore';
import { ChallengePage } from './ChallengePage';

let nextSeed = 100;

describe('challenge page', () => {
  beforeEach(() => {
    useWorkbenchStore.getState().resetWorkbench();
    window.localStorage.clear();
    nextSeed = 100;
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint32Array) => {
        values[0] = nextSeed;
        nextSeed += 1;
        return values;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates a challenge and rerolls it with a new seed', () => {
    const level = getLevelById('defi-01');

    if (level === undefined) {
      throw new Error('Missing defi-01');
    }

    render(<ChallengePage level={level} onBack={() => undefined} />);

    expect(
      document.querySelector('.workbench-page')?.getAttribute(
        'data-challenge-seed',
      ),
    ).toBe('100');
    expect(useWorkbenchStore.getState().levelId).toBe('defi-01');
    expect(useWorkbenchStore.getState().circuit.components.length).toBeGreaterThan(
      0,
    );
    expect(document.querySelector('svg.workbench-svg')).not.toBeNull();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Nouveau défi' }),
      {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      },
    );

    expect(
      document.querySelector('.workbench-page')?.getAttribute(
        'data-challenge-seed',
      ),
    ).toBe('101');
  });
});
