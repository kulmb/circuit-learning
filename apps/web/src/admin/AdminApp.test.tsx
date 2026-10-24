import type { AuthSessionResponse } from '@circuits/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProgressProvider } from '../progress/ProgressContext';
import AdminApp from './AdminApp';

const GROUP_ID = '0123456789abcdef01234567';

const adminSession: AuthSessionResponse = {
  user: {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    role: 'admin',
    displayName: 'kulmb',
    username: 'kulmb',
    avatarId: null,
    group: null,
  },
  session: {
    kind: 'adult',
    expiresAt: '2026-11-23T20:00:00.000Z',
  },
};

const parentSession: AuthSessionResponse = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    role: 'parent',
    displayName: 'parent',
    username: 'parent',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderAdmin(path: string, session: AuthSessionResponse | null = adminSession) {
  return render(
    <ProgressProvider autoLoad={false} initialSession={session}>
      <AdminApp path={path} />
    </ProgressProvider>,
  );
}

describe('AdminApp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the login screen without a session', () => {
    renderAdmin('/admin', null);

    expect(
      screen.getByRole('heading', { name: 'Connexion adulte' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
  });

  it('logs an adult in and opens the group list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith('/auth/login')) {
          return jsonResponse(adminSession);
        }

        if (url.includes('/groups')) {
          return jsonResponse({ groups: [] });
        }

        return jsonResponse({}, 404);
      }),
    );

    renderAdmin('/admin', null);

    fireEvent.change(screen.getByLabelText('Identifiant'), {
      target: { value: 'kulmb' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'Correct-Horse-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      await screen.findByRole('heading', { name: 'Mes groupes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aucun groupe pour le moment.')).toBeInTheDocument();
  });

  it('lists the teacher groups', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          groups: [
            {
              id: GROUP_ID,
              name: 'CE2 A',
              joinCode: 'ABC234',
              archived: false,
              createdAt: '2026-10-24T10:00:00.000Z',
              studentCount: 3,
              canManage: true,
            },
          ],
        }),
      ),
    );

    renderAdmin('/admin');

    expect(
      await screen.findByRole('heading', { name: 'Mes groupes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CE2 A')).toBeInTheDocument();
    expect(screen.getByText('ABC234')).toBeInTheDocument();
    expect(screen.getByText('3 élèves')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Se déconnecter' }),
    ).toBeInTheDocument();
  });

  it('opens a group detail with its students', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/auth/device-pin')) {
          return jsonResponse(
            { error: { code: 'not_found', message: 'no pin' } },
            404,
          );
        }

        if (url.includes(`/groups/${GROUP_ID}`)) {
          return jsonResponse({
            group: {
              id: GROUP_ID,
              name: 'CE2 A',
              joinCode: 'ABC234',
              archived: false,
              createdAt: '2026-10-24T10:00:00.000Z',
              studentCount: 1,
              canManage: true,
              students: [
                {
                  id: 'cccccccccccccccccccccccc',
                  displayName: 'Lina',
                  avatarId: 'renard',
                  createdAt: '2026-10-24T10:00:00.000Z',
                  pictureLocked: false,
                  groups: [
                    { id: GROUP_ID, name: 'CE2 A', archived: false },
                  ],
                },
              ],
            },
          });
        }

        return jsonResponse({}, 404);
      }),
    );

    renderAdmin(`/admin/groups/${GROUP_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'CE2 A' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ABC234').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lina').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Imprimer les cartes' }),
    ).toBeInTheDocument();
  });

  it('shows a parent the student sheet without teacher actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          student: {
            id: 'cccccccccccccccccccccccc',
            displayName: 'Lina',
            avatarId: 'renard',
            createdAt: '2026-10-24T10:00:00.000Z',
            pictureLocked: false,
            groups: [{ id: GROUP_ID, name: 'CE2 A', archived: false }],
          },
        }),
      ),
    );

    renderAdmin('/admin/students/cccccccccccccccccccccccc', parentSession);

    expect(
      await screen.findByRole('link', { name: 'Télécharger les données (JSON)' }),
    ).toHaveAttribute(
      'href',
      '/api/students/cccccccccccccccccccccccc/export',
    );
    expect(
      screen.queryByRole('button', { name: 'Supprimer définitivement' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Réinitialiser les images' }),
    ).not.toBeInTheDocument();
  });

  it('shows a parent their own children page and refuses admin pages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          students: [
            {
              id: 'cccccccccccccccccccccccc',
              displayName: 'Lina',
              avatarId: 'renard',
              createdAt: '2026-10-24T10:00:00.000Z',
              pictureLocked: false,
              groups: [
                { id: GROUP_ID, name: 'CE2 A', archived: false },
              ],
            },
          ],
        }),
      ),
    );

    const { unmount } = renderAdmin('/admin', parentSession);
    expect(
      await screen.findByRole('heading', { name: 'Mes enfants' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lina')).toBeInTheDocument();
    unmount();

    renderAdmin('/admin/users', parentSession);
    expect(
      screen.getByRole('heading', { name: 'Accès refusé' }),
    ).toBeInTheDocument();
  });

  it('shows an invitation preview without a session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          type: 'parent',
          role: 'parent',
          displayName: 'Parent Un',
          username: 'parent1',
          childName: 'Lina',
          expiresAt: '2026-10-31T10:00:00.000Z',
        }),
      ),
    );

    renderAdmin('/invitation/token-abcdefghijklmnopqrstuvwxyz', null);

    expect(
      await screen.findByRole('heading', { name: 'Bienvenue !' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Parent Un')).toBeInTheDocument();
    expect(screen.getByText('Lina')).toBeInTheDocument();
  });
});
