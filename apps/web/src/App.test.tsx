import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './App';
import {
  PWA_UPDATE_NOTICE_KEY,
  resetPwaUpgradeNotice,
} from './pwa/update';
import { APP_VERSION_STORAGE_KEY } from './version';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetPwaUpgradeNotice();
  });

  it('shows the title and the two main actions', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Les Circuits de Zap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jouer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atelier libre/i })).toBeInTheDocument();
  });

  it('stores and displays the application version', () => {
    render(<App />);

    expect(screen.getByText('Version 0.3.0')).toBeInTheDocument();
    expect(
      window.localStorage.getItem(APP_VERSION_STORAGE_KEY),
    ).toBe('0.3.0');
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

  it('shows a successful update notice on every page', async () => {
    window.sessionStorage.setItem(PWA_UPDATE_NOTICE_KEY, '1');

    render(<App />);

    expect(
      await screen.findByText('Mise à jour terminée !'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tu joues avec la dernière version.'),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /espace adulte/i }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Connexion adulte' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mise à jour terminée !'),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Fermer' }),
    );
    expect(
      screen.queryByText('Mise à jour terminée !'),
    ).not.toBeInTheDocument();
  });

  it('does not show an update notice on a normal load', () => {
    render(<App />);

    expect(
      screen.queryByText('Mise à jour terminée !'),
    ).not.toBeInTheDocument();
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
