import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PerformanceProvider,
  usePerformance,
} from './PerformanceContext';

function PerformanceProbe() {
  const { lowPerformance, autoLow, manualLow } = usePerformance();

  return (
    <p>
      low:{String(lowPerformance)} auto:{String(autoLow)} manual:
      {String(manualLow)}
    </p>
  );
}

describe('PerformanceProvider', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    delete document.documentElement.dataset['performance'];
  });

  it('honours prefers-reduced-motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string): MediaQueryList =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    });

    render(
      <PerformanceProvider>
        <PerformanceProbe />
      </PerformanceProvider>,
    );

    expect(screen.getByText(/low:true/)).toBeInTheDocument();
    expect(document.documentElement.dataset['performance']).toBe('low');
  });

  it('reads the parent preference on load', () => {
    window.localStorage.setItem(
      'circuits-de-zap:preferences:v1',
      JSON.stringify({ lowPerformance: true }),
    );

    render(
      <PerformanceProvider>
        <PerformanceProbe />
      </PerformanceProvider>,
    );

    expect(screen.getByText(/low:true/)).toBeInTheDocument();
    expect(screen.getByText(/manual:true/)).toBeInTheDocument();
  });
});
