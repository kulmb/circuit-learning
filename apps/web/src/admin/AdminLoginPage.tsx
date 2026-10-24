import { authSessionResponseSchema } from '@circuits/shared';
import { useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { useProgress } from '../progress/ProgressContext';
import { navigate } from '../router';
import { AdminError, activate } from './AdminShared';
import { adminTexts } from './fr';

export function AdminLoginPage() {
  const { setSession } = useProgress();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (username.trim() === '' || password === '') {
      setError(adminTexts.required);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const session = await apiRequest(
        '/auth/login',
        authSessionResponseSchema,
        {
          method: 'POST',
          body: { username, password },
        },
      );
      setSession(session);
      navigate('/admin');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : adminTexts.error,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-auth">
      <div className="admin-auth__card">
        <p className="admin-auth__brand">{adminTexts.appName}</p>
        <h1>{adminTexts.login.title}</h1>
        <p className="admin-auth__subtitle">{adminTexts.login.subtitle}</p>

        {error !== null ? <AdminError message={error} /> : null}

        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label className="admin-field">
            <span>{adminTexts.login.username}</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="admin-field">
            <span>{adminTexts.login.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="admin-button admin-button--primary"
            disabled={busy}
          >
            {busy ? adminTexts.loading : adminTexts.login.submit}
          </button>
        </form>

        <p className="admin-auth__hint">{adminTexts.login.forgot}</p>

        <button
          type="button"
          className="admin-link"
          onPointerDown={(event) => activate(event, () => navigate('/'))}
        >
          ← {adminTexts.backToGame}
        </button>
      </div>
    </div>
  );
}
