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

  it('opens the workbench when starting the game', () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /jouer/i }));

    expect(
      screen.getByRole('heading', { name: 'Plan de travail' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
    expect(screen.getByText('Pile')).toBeInTheDocument();
  });
});
