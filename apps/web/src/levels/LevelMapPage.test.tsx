import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalProgressRepository } from '../progress/LocalProgressRepository';
import { ProgressProvider } from '../progress/ProgressContext';
import { LevelMapPage } from './LevelMapPage';

function renderMap() {
  render(
    <ProgressProvider autoLoad={false}>
      <LevelMapPage
        onBack={() => undefined}
        onSelectLevel={() => undefined}
        onCollection={() => undefined}
        onSandbox={() => undefined}
      />
    </ProgressProvider>,
  );
}

async function completeFirstLevel(
  repository: LocalProgressRepository,
): Promise<void> {
  const attempt = await repository.startAttempt('light-01');
  await repository.finishAttempt(attempt, {
    success: true,
    hintsUsed: 0,
    durationMs: 1200,
    errorsDetected: [],
  });
}

function press(name: string): void {
  fireEvent.pointerDown(screen.getByRole('button', { name }), {
    pointerType: 'mouse',
    button: 0,
  });
}

describe('level map guest record', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows an empty guest record before the first game', async () => {
    renderMap();

    expect(
      await screen.findByText(
        'Tu joues en invité. Ta progression reste sur cet appareil.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Aucune partie enregistrée pour l’instant.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Effacer ma progression' }),
    ).not.toBeInTheDocument();
  });

  it('shows completed levels, stars and attempts, then erases them', async () => {
    const repository = new LocalProgressRepository();
    await completeFirstLevel(repository);

    renderMap();

    const levelsLabel = await screen.findByText('Niveaux terminés');
    expect(levelsLabel.nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Étoiles').nextElementSibling?.textContent).toBe(
      '3',
    );
    expect(screen.getByText('Parties').nextElementSibling?.textContent).toBe(
      '1',
    );

    press('Effacer ma progression');

    expect(
      screen.getByText('Effacer ta progression ?'),
    ).toBeInTheDocument();

    press('Oui, effacer');

    await waitFor(() => {
      expect(
        screen.getByText('Ta progression a été effacée.'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Aucune partie enregistrée pour l’instant.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Niveaux terminés')).not.toBeInTheDocument();
    expect(repository.getGuestRecord()).toEqual({
      completedLevels: 0,
      stars: 0,
      attempts: 0,
    });
  });

  it('keeps the record when the child cancels', async () => {
    const repository = new LocalProgressRepository();
    await completeFirstLevel(repository);

    renderMap();

    await screen.findByText('Niveaux terminés');
    press('Effacer ma progression');
    press('Non, garder');

    expect(screen.queryByText('Effacer ta progression ?')).not.toBeInTheDocument();
    expect(screen.getByText('Niveaux terminés')).toBeInTheDocument();
    expect(repository.getGuestRecord()).toEqual({
      completedLevels: 1,
      stars: 3,
      attempts: 1,
    });
  });
});
