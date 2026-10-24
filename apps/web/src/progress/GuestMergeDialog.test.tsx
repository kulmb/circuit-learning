import type { AuthSessionResponse } from '@circuits/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { GuestMergeDialog } from './GuestMergeDialog';
import { LocalProgressRepository } from './LocalProgressRepository';
import { ProgressProvider } from './ProgressContext';

const STUDENT_ID = '0123456789abcdef01234567';

const session: AuthSessionResponse = {
  user: {
    id: STUDENT_ID,
    role: 'eleve',
    displayName: 'Lina',
    username: null,
    avatarId: 'renard',
    group: null,
  },
  session: {
    kind: 'child',
    expiresAt: '2026-10-24T20:00:00.000Z',
  },
};

describe('GuestMergeDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('asks the adult once and remembers a declined merge', async () => {
    const local = new LocalProgressRepository();
    const attempt = await local.startAttempt('light-01');
    await local.finishAttempt(attempt, {
      success: true,
      hintsUsed: 0,
      durationMs: 2000,
      errorsDetected: [],
    });

    render(
      <ProgressProvider autoLoad={false} initialSession={session}>
        <GuestMergeDialog />
      </ProgressProvider>,
    );

    expect(
      await screen.findByText('Progression d’invité'),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Non, garder le compte' }),
      { pointerType: 'mouse', button: 0 },
    );

    await waitFor(() => {
      expect(screen.queryByText('Progression d’invité')).not.toBeInTheDocument();
    });
    expect(
      window.localStorage.getItem(
        `circuits-de-zap:merge-declined:${STUDENT_ID}`,
      ),
    ).not.toBeNull();
  });
});
