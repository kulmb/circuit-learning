import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PerformanceProvider } from '../performance/PerformanceContext';
import { localProgressRepository } from '../progress/LocalProgressRepository';
import { ParentSettingsPage } from './ParentSettingsPage';
import { applyPreferences, readPreferences } from './preferences';

function press(element: Element): void {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  });
}

function readAnswer(): number {
  const question =
    document.querySelector('.parent-gate__question')?.textContent ?? '';
  const match = question.match(/(\d+)\s*×\s*(\d+)/);
  if (match === null) {
    throw new Error(`Unexpected question: ${question}`);
  }

  return Number(match[1]) * Number(match[2]);
}

function answerGate(): void {
  press(
    screen.getByRole('button', { name: String(readAnswer()) }),
  );
}

function pressWrongAnswer(): void {
  const answer = readAnswer();
  const buttons = screen
    .getAllByRole('button')
    .filter((button) => /^\d+$/.test(button.textContent ?? ''));
  const wrong = buttons.find(
    (button) => button.textContent !== String(answer),
  );
  if (wrong === undefined) {
    throw new Error('No wrong answer available');
  }

  press(wrong);
}

function renderSettings() {
  return render(
    <PerformanceProvider>
      <ParentSettingsPage onBack={() => undefined} />
    </PerformanceProvider>,
  );
}

describe('parent settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    applyPreferences();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    delete document.documentElement.dataset['performance'];
  });

  it('asks a multiplication before showing the settings', () => {
    renderSettings();

    expect(
      screen.getByRole('heading', { name: 'Réglages parents' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Petite question' }),
    ).toBeInTheDocument();

    pressWrongAnswer();

    expect(
      screen.getByText('Ce n’est pas la bonne réponse. Réessaie.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Son' }),
    ).not.toBeInTheDocument();

    answerGate();

    expect(screen.getByRole('heading', { name: 'Son' })).toBeInTheDocument();
    expect(screen.getByText('Réglages déverrouillés.')).toBeInTheDocument();
  });

  it('saves sound, voice, vibration and low-performance choices', () => {
    renderSettings();
    answerGate();

    press(screen.getByRole('button', { name: 'Son activé' }));
    expect(
      screen.getByRole('button', { name: 'Son coupé' }),
    ).toBeInTheDocument();
    expect(readPreferences().sound).toBe(false);

    press(screen.getByRole('button', { name: 'Rapide' }));
    expect(readPreferences().speechRate).toBe('fast');

    press(screen.getByRole('button', { name: 'Vibrations activées' }));
    expect(
      screen.getByRole('button', { name: 'Vibrations coupées' }),
    ).toBeInTheDocument();
    expect(readPreferences().vibration).toBe(false);

    press(screen.getByRole('button', { name: 'Désactivé' }));
    expect(screen.getByRole('button', { name: 'Activé' })).toBeInTheDocument();
    expect(document.documentElement.dataset['performance']).toBe('low');
    expect(readPreferences().lowPerformance).toBe(true);
  });

  it('resets local progress after the confirmation', async () => {
    const attempt = await localProgressRepository.startAttempt('light-01');
    await localProgressRepository.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });

    renderSettings();
    answerGate();

    press(
      screen.getByRole('button', {
        name: 'Effacer la progression locale',
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Effacer la progression locale ?',
      }),
    ).toBeInTheDocument();

    press(screen.getByRole('button', { name: 'Oui, effacer' }));

    expect(
      await screen.findByText('La progression locale a été effacée.'),
    ).toBeInTheDocument();

    const progress = await localProgressRepository.getProgress();
    expect(progress.levels['light-01']?.status).toBe('unlocked');
    expect(progress.levels['light-01']?.stars).toBe(0);
  });
});
