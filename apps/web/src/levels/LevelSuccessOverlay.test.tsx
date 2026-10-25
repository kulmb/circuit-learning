import { getLevelById } from '@circuits/shared/levels';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getText } from '../narration/fr';
import { LevelSuccessOverlay } from './LevelSuccessOverlay';

describe('level success banner', () => {
  it('stays non-modal and keeps the stars then vocabulary flow', () => {
    const level = getLevelById('light-01');
    if (level === undefined) {
      throw new Error('Level missing');
    }

    const onNext = vi.fn();
    const onMap = vi.fn();
    const { container } = render(
      <LevelSuccessOverlay
        level={level}
        stars={3}
        hasNext
        onNext={onNext}
        onMap={onMap}
      />,
    );

    expect(
      container.querySelector('.level-complete-overlay')?.getAttribute('role'),
    ).toBeNull();
    expect(
      container.querySelector('.level-complete-card')?.getAttribute(
        'aria-modal',
      ),
    ).toBe('false');
    expect(
      screen.getByRole('heading', { name: getText('success.title') }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('.level-complete-stars')?.getAttribute(
        'aria-label',
      ),
    ).toBe('3 / 3');

    fireEvent.pointerDown(
      screen.getByRole('button', { name: getText('success.continue') }),
    );
    expect(screen.getByText(getText('success.learned'))).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: getText('success.next') }),
    );
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
