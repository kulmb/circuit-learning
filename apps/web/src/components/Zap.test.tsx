import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Zap } from './Zap';

function renderZap(variant: 'default' | 'compact' | 'top', onReplay = vi.fn()) {
  render(
    <Zap
      variant={variant}
      expression="content"
      message="Bonjour !"
      speaking={false}
      muted={false}
      onHint={() => undefined}
      onReplay={onReplay}
      onToggleMute={() => undefined}
    />,
  );

  return onReplay;
}

describe('Zap compact bubble', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides the bubble after three seconds and shows it again on tap', () => {
    vi.useFakeTimers();
    const onReplay = renderZap('compact');

    expect(screen.getByText('Bonjour !')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Bonjour !')).not.toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Demander un indice à Zap' }),
    );
    expect(screen.getByText('Bonjour !')).toBeInTheDocument();
    expect(onReplay).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Bonjour !')).not.toBeInTheDocument();
  });

  it('keeps the bubble visible by default', () => {
    vi.useFakeTimers();
    renderZap('default');

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('Bonjour !')).toBeInTheDocument();
  });
});
