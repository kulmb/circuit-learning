import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Zap } from './Zap';
import { ZAP_PANEL_STORAGE_KEY } from './zapVisibility';

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
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it('hides the whole panel and reopens it from a small button', () => {
    const onReplay = renderZap('default');

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Cacher Zap' }),
    );

    expect(screen.queryByText('Bonjour !')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cacher Zap' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Afficher Zap' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(ZAP_PANEL_STORAGE_KEY)).toBe('true');

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Afficher Zap' }),
    );

    expect(screen.getByText('Bonjour !')).toBeInTheDocument();
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(ZAP_PANEL_STORAGE_KEY)).toBe('false');
  });

  it('stays collapsed after a reload', () => {
    window.localStorage.setItem(ZAP_PANEL_STORAGE_KEY, 'true');
    renderZap('default');

    expect(screen.queryByText('Bonjour !')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Afficher Zap' }),
    ).toBeInTheDocument();
  });
});
