import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
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
      await screen.findByRole('heading', { name: 'Chapitre 1 : La lumière' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accueil/i }),
    ).toBeInTheDocument();

    const firstLevel = await screen.findByRole('button', {
      name: /allume l’ampoule/i,
    });
    fireEvent.pointerDown(firstLevel);

    expect(
      await screen.findByRole('heading', { name: 'Allume l’ampoule' }),
    ).toBeInTheDocument();
  });
});
