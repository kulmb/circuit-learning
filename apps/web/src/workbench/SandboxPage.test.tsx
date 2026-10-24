import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProgressProvider } from '../progress/ProgressContext';
import { localProgressRepository } from '../progress/LocalProgressRepository';
import { SandboxPage } from './SandboxPage';
import { useWorkbenchStore } from './workbenchStore';

function press(element: Element): void {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  });
}

function renderSandbox(): ReturnType<typeof render> {
  return render(
    <ProgressProvider autoLoad={false}>
      <SandboxPage onBack={() => undefined} capture={capture} />
    </ProgressProvider>,
  );
}

const capture = vi.fn(async () => ({
  photo: 'data:image/png;base64,photo',
  thumbnail: 'data:image/jpeg;base64,thumbnail',
}));

describe('sandbox page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useWorkbenchStore.getState().resetWorkbench();
    capture.mockClear();
  });

  it('saves, photographs, clears and reopens a work', async () => {
    renderSandbox();

    expect(
      await screen.findByRole('heading', { name: 'Atelier libre' }),
    ).toBeInTheDocument();
    expect(useWorkbenchStore.getState().circuit.components).toHaveLength(2);

    press(screen.getByRole('button', { name: 'Mon atelier' }));

    expect(
      screen.getByRole('heading', { name: 'Mon atelier' }),
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    press(
      screen.getByRole('button', {
        name: 'Enregistrer',
      }),
    );

    expect(await screen.findByText('Circuit enregistré !')).toBeInTheDocument();

    const saved = await localProgressRepository.listSandbox();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.name).toBe('Mon circuit 1');
    expect(saved[0]?.thumbnail).toBe(
      'data:image/jpeg;base64,thumbnail',
    );
    expect(capture).toHaveBeenCalled();

    press(screen.getByRole('button', { name: 'Prendre une photo' }));

    expect(
      await screen.findByRole('heading', { name: 'Ta photo est prête !' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Télécharger la photo' }),
    ).toHaveAttribute('href', 'data:image/png;base64,photo');
    expect(
      screen.getByText('Ton circuit est enregistré avec la photo.'),
    ).toBeInTheDocument();

    press(screen.getByRole('button', { name: 'Fermer' }));
    expect(document.body.style.overflow).toBe('');

    press(screen.getByRole('button', { name: 'Mon atelier' }));
    press(screen.getByRole('button', { name: 'Tout effacer' }));

    expect(
      screen.getByRole('heading', { name: 'Tout effacer ?' }),
    ).toBeInTheDocument();

    press(screen.getByRole('button', { name: 'Non, je garde' }));
    expect(
      useWorkbenchStore.getState().circuit.components,
    ).toHaveLength(2);

    press(screen.getByRole('button', { name: 'Mon atelier' }));
    press(screen.getByRole('button', { name: 'Tout effacer' }));
    press(screen.getByRole('button', { name: 'Oui, tout effacer' }));

    await waitFor(() => {
      expect(useWorkbenchStore.getState().circuit.components).toHaveLength(0);
    });

    press(screen.getByRole('button', { name: 'Mon atelier' }));
    press(
      screen.getByRole('button', {
        name: 'Ouvrir Mon circuit 1',
      }),
    );

    await waitFor(() => {
      expect(useWorkbenchStore.getState().circuit.components).toHaveLength(2);
    });
    expect(
      screen.queryByRole('heading', { name: 'Mon atelier' }),
    ).not.toBeInTheDocument();
  });
});
