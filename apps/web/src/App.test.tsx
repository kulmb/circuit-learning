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

  it('shows a placeholder when starting the game', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /jouer/i }));

    expect(screen.getByText('Le premier niveau arrive bientôt !')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
  });
});
