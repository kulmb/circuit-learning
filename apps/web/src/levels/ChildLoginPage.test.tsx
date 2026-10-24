import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProgressProvider, useProgress } from '../progress/ProgressContext';
import { ChildLoginPage } from './ChildLoginPage';

const GROUP_ID = '0123456789abcdef01234567';
const STUDENT_ID = 'abcdefabcdefabcdefabcdef';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function SessionProbe() {
  const { session } = useProgress();

  return <p data-testid="session-user">{session?.user.displayName ?? 'none'}</p>;
}

function tap(element: Element): void {
  fireEvent.pointerDown(element, { pointerType: 'mouse', button: 0 });
}

describe('ChildLoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('goes from the group code to an avatar and three pictures', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/auth/device-pin')) {
        return jsonResponse(
          { error: { code: 'not_found', message: 'no pin' } },
          404,
        );
      }

      if (url.endsWith('/auth/children/group/ABC234')) {
        return jsonResponse({
          group: { id: GROUP_ID, name: 'CE2 A', joinCode: 'ABC234' },
          students: [
            { id: STUDENT_ID, displayName: 'Lina', avatarId: 'renard' },
            {
              id: '111111111111111111111111',
              displayName: 'Noé',
              avatarId: 'panda',
            },
          ],
          pinned: false,
        });
      }

      if (url.endsWith('/auth/children/login') && method === 'POST') {
        return jsonResponse({
          user: {
            id: STUDENT_ID,
            role: 'eleve',
            displayName: 'Lina',
            username: null,
            avatarId: 'renard',
            group: { id: GROUP_ID, name: 'CE2 A', joinCode: 'ABC234' },
          },
          session: {
            kind: 'child',
            expiresAt: '2026-10-24T22:00:00.000Z',
          },
        });
      }

      return jsonResponse(
        { error: { code: 'unexpected', message: url } },
        500,
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();

    render(
      <ProgressProvider autoLoad={false}>
        <ChildLoginPage
          onCancel={() => undefined}
          onGuest={() => undefined}
          onSuccess={onSuccess}
        />
        <SessionProbe />
      </ProgressProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Entre le code du groupe' }),
    ).toBeInTheDocument();

    for (const letter of ['A', 'B', 'C', '2', '3', '4']) {
      tap(screen.getByRole('button', { name: letter }));
    }

    expect(
      await screen.findByRole('heading', { name: 'CE2 A' }),
    ).toBeInTheDocument();

    tap(screen.getByRole('button', { name: /Lina/ }));

    expect(
      await screen.findByRole('heading', { name: /Lina/ }),
    ).toBeInTheDocument();

    for (const picture of ['Renard', 'Pomme', 'Ballon']) {
      tap(screen.getByRole('button', { name: picture }));
    }

    await waitFor(() => {
      expect(screen.getByTestId('session-user')).toHaveTextContent('Lina');
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/children/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the lock message after too many wrong pictures', async () => {
    let attempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/auth/device-pin')) {
        return jsonResponse({
          group: { id: GROUP_ID, name: 'CE2 A', joinCode: 'ABC234' },
          students: [
            { id: STUDENT_ID, displayName: 'Lina', avatarId: 'renard' },
          ],
          pinned: true,
        });
      }

      if (url.endsWith('/auth/children/login')) {
        attempts += 1;
        return jsonResponse(
          {
            error: {
              code: 'picture_locked',
              message: 'Demande de l’aide à ton encadrant.',
            },
          },
          423,
        );
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ProgressProvider autoLoad={false}>
        <ChildLoginPage
          onCancel={() => undefined}
          onGuest={() => undefined}
          onSuccess={() => undefined}
        />
      </ProgressProvider>,
    );

    tap(await screen.findByRole('button', { name: /Lina/ }));
    for (const picture of ['Renard', 'Pomme', 'Ballon']) {
      tap(screen.getByRole('button', { name: picture }));
    }

    expect(
      await screen.findByText('Demande de l’aide à ton encadrant.'),
    ).toBeInTheDocument();
    expect(attempts).toBe(1);
  });
});
