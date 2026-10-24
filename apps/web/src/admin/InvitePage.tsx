import {
  authSessionResponseSchema,
  invitePreviewResponseSchema,
  type InvitePreviewResponse,
} from '@circuits/shared';
import { useEffect, useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { useProgress } from '../progress/ProgressContext';
import { navigate } from '../router';
import { AdminError, AdminLoading, activate } from './AdminShared';
import { adminTexts } from './fr';

export function InvitePage({ token }: { token: string }) {
  const { setSession } = useProgress();
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void apiRequest(
      `/auth/invites/${encodeURIComponent(token)}`,
      invitePreviewResponseSchema,
    )
      .then((value) => {
        if (active) {
          setPreview(value);
        }
      })
      .catch((caught) => {
        if (active) {
          setLoadError(
            caught instanceof ApiClientError
              ? caught.message
              : adminTexts.invite.invalid,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (password.length < 12) {
      setError(adminTexts.invite.password);
      return;
    }

    if (password !== confirmation) {
      setError(adminTexts.invite.mismatch);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const session = await apiRequest(
        `/auth/invites/${encodeURIComponent(token)}/accept`,
        authSessionResponseSchema,
        { method: 'POST', body: { password } },
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

  const reset = preview?.type === 'password_reset';

  return (
    <div className="admin-auth">
      <div className="admin-auth__card">
        <p className="admin-auth__brand">{adminTexts.appName}</p>

        {loadError !== null ? (
          <>
            <h1>{adminTexts.invite.title}</h1>
            <AdminError message={loadError} />
          </>
        ) : preview === null ? (
          <AdminLoading />
        ) : (
          <>
            <h1>{reset ? adminTexts.invite.resetTitle : adminTexts.invite.title}</h1>
            <p className="admin-auth__subtitle">
              {reset
                ? adminTexts.invite.resetSubtitle
                : adminTexts.invite.subtitle}
            </p>
            <dl className="admin-invite-preview">
              <dt>Nom</dt>
              <dd>{preview.displayName}</dd>
              {preview.username !== null ? (
                <>
                  <dt>Identifiant</dt>
                  <dd>{preview.username}</dd>
                </>
              ) : null}
              {preview.childName !== null ? (
                <>
                  <dt>Enfant</dt>
                  <dd>{preview.childName}</dd>
                </>
              ) : null}
            </dl>

            {error !== null ? <AdminError message={error} /> : null}

            <form className="admin-form" onSubmit={(event) => void submit(event)}>
              <label className="admin-field">
                <span>{adminTexts.invite.password}</span>
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
                <span>{adminTexts.invite.confirm}</span>
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
                {busy
                  ? adminTexts.loading
                  : reset
                    ? adminTexts.invite.resetSubmit
                    : adminTexts.invite.submit}
              </button>
            </form>
          </>
        )}

        <button
          type="button"
          className="admin-link"
          onPointerDown={(event) =>
            activate(event, () => navigate('/admin'))
          }
        >
          {adminTexts.invite.back}
        </button>
      </div>
    </div>
  );
}
