import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { markPwaUpdateReady, resetPwaUpdate } from './pwa/update';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    resetPwaUpdate();
  });

  it('shows the title and the two main actions', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Les Circuits de Zap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jouer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atelier libre/i })).toBeInTheDocument();
  });

  it('opens the level map and starts the first level', async () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /jouer/i }));

    expect(
      await screen.findByRole('heading', { name: 'Entre le code du groupe' }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /jouer en invité/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Chapitre 1 : La lumière' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accueil/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/tu joues en invité/i),
    ).toBeInTheDocument();

    const firstLevel = await screen.findByRole('button', {
      name: /allume l’ampoule/i,
    });
    fireEvent.pointerDown(firstLevel);

    expect(
      await screen.findByRole('heading', { name: 'Allume l’ampoule' }),
    ).toBeInTheDocument();
  });

  it('loads the adult space on its own route', async () => {
    render(<App />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /espace adulte/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Connexion adulte' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin');
  });

  it('opens the sandbox from the map and comes back to the map', async () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /jouer/i }));
    fireEvent.pointerDown(
      await screen.findByRole('button', { name: /jouer en invité/i }),
    );

    fireEvent.pointerDown(
      await screen.findByRole('button', { name: /atelier libre/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Atelier libre' }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /retour/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Chapitre 1 : La lumière' }),
    ).toBeInTheDocument();
  });

  it('offers a service-worker update only on the level map', async () => {
    const apply = vi.fn();
    markPwaUpdateReady(apply);

    render(<App />);

    expect(
      screen.queryByText('Une nouvelle version est prête.'),
    ).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: /jouer/i }));
    fireEvent.pointerDown(
      await screen.findByRole('button', { name: /jouer en invité/i }),
    );

    expect(
      await screen.findByText('Une nouvelle version est prête.'),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Mettre à jour' }),
    );
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('loads the parent settings behind a small question', async () => {
    render(<App />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /réglages parents/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Réglages parents' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Petite question' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parents');
  });
});
