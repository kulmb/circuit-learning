import { passwordChangedResponseSchema } from '@circuits/shared';
import { useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { useProgress } from '../progress/ProgressContext';
import {
  AdminError,
  AdminNotice,
  AvatarPill,
  roleLabel,
} from './AdminShared';
import { adminTexts } from './fr';

export function AccountPage() {
  const { session } = useProgress();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session === null) {
    return null;
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (password.length < 12) {
      setError(adminTexts.account.newPassword);
      return;
    }

    if (password !== confirmation) {
      setError(adminTexts.account.mismatch);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await apiRequest('/auth/password', passwordChangedResponseSchema, {
        method: 'POST',
        body: { newPassword: password },
      });
      setPassword('');
      setConfirmation('');
      setNotice(adminTexts.account.success);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{adminTexts.account.title}</h1>
          <p>
            <AvatarPill
              avatarId={session.user.avatarId}
              name={session.user.displayName}
            />{' '}
            · {roleLabel(session.user.role)}
          </p>
        </div>
      </header>

      <section className="admin-card admin-auth-card">
        <h2>{adminTexts.account.passwordTitle}</h2>
        <p className="admin-muted">{adminTexts.account.passwordHint}</p>

        {error !== null ? <AdminError message={error} /> : null}
        {notice !== null ? <AdminNotice message={notice} tone="success" /> : null}

        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label className="admin-field">
            <span>{adminTexts.account.newPassword}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>
          <label className="admin-field">
            <span>{adminTexts.account.confirm}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={12}
              required
            />
          </label>
          <button
            type="submit"
            className="admin-button admin-button--primary"
            disabled={busy}
          >
            {busy ? adminTexts.loading : adminTexts.account.submit}
          </button>
        </form>
      </section>
    </section>
  );
}
