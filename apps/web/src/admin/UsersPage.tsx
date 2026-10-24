import {
  inviteCreatedResponseSchema,
  userResponseSchema,
  usersResponseSchema,
  type AdminUser,
} from '@circuits/shared';
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { useProgress } from '../progress/ProgressContext';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminNotice,
  AvatarPill,
  activate,
  copyText,
  formatDate,
  roleLabel,
} from './AdminShared';
import { adminTexts } from './fr';

const PAGE_SIZE = 20;
const FILTERS = ['', 'admin', 'encadrant', 'parent', 'eleve'] as const;

export function UsersPage() {
  const { session } = useProgress();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherInviteUrl, setTeacherInviteUrl] = useState<string | null>(
    null,
  );

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      if (filter !== '') {
        query.set('role', filter);
      }

      const response = await apiRequest(
        `/users?${query.toString()}`,
        usersResponseSchema,
      );
      setUsers(response.users);
      setTotal(response.total);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [filter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(user: AdminUser): Promise<void> {
    setBusyId(user.id);
    setError(null);
    setNotice(null);

    try {
      await apiRequest(
        `/users/${encodeURIComponent(user.id)}/status`,
        userResponseSchema,
        { method: 'PATCH', body: { disabled: !user.disabled } },
      );
      setNotice(user.disabled ? 'Compte activé.' : 'Compte désactivé.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user: AdminUser, role: string): Promise<void> {
    setBusyId(user.id);
    setError(null);
    setNotice(null);

    try {
      await apiRequest(
        `/users/${encodeURIComponent(user.id)}/role`,
        userResponseSchema,
        { method: 'PATCH', body: { role } },
      );
      setNotice('Rôle modifié.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createTeacherInvite(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (teacherName.trim() === '' || teacherUsername.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    setError(null);
    setNotice(null);
    setTeacherInviteUrl(null);

    try {
      const response = await apiRequest(
        '/auth/invites',
        inviteCreatedResponseSchema,
        {
          method: 'POST',
          body: {
            role: 'encadrant',
            username: teacherUsername,
            displayName: teacherName,
          },
        },
      );
      setTeacherInviteUrl(response.invite.url);
      setTeacherName('');
      setTeacherUsername('');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }

  async function createResetLink(user: AdminUser): Promise<void> {
    if (user.username === null) {
      setError('Ce compte n’a pas d’identifiant de connexion.');
      return;
    }

    setBusyId(user.id);
    setError(null);
    setNotice(null);
    setResetUrl(null);

    try {
      const response = await apiRequest(
        '/auth/password-resets',
        inviteCreatedResponseSchema,
        { method: 'POST', body: { username: user.username } },
      );
      setResetUrl(response.invite.url);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{adminTexts.users.title}</h1>
          <p>{adminTexts.users.subtitle}</p>
        </div>
        <label className="admin-field admin-field--inline">
          <span>{adminTexts.users.filter}</span>
          <select
            value={filter}
            onChange={(event) => {
              setOffset(0);
              setFilter(event.target.value);
            }}
          >
            {FILTERS.map((role) => (
              <option key={role || 'all'} value={role}>
                {role === '' ? adminTexts.users.all : roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}
      {notice !== null ? <AdminNotice message={notice} tone="success" /> : null}

      <form
        className="admin-card admin-form admin-form--compact"
        onSubmit={(event) => void createTeacherInvite(event)}
      >
        <h2>{adminTexts.users.inviteTeacherTitle}</h2>
        <div className="admin-inline-form__row">
          <label className="admin-field">
            <span>{adminTexts.users.inviteTeacherName}</span>
            <input
              type="text"
              value={teacherName}
              maxLength={80}
              onChange={(event) => setTeacherName(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>{adminTexts.users.inviteTeacherUsername}</span>
            <input
              type="text"
              value={teacherUsername}
              onChange={(event) => setTeacherUsername(event.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          className="admin-button admin-button--primary"
          disabled={busyId !== null}
        >
          {adminTexts.users.inviteTeacherSubmit}
        </button>

        {teacherInviteUrl !== null ? (
          <div className="admin-copy-row">
            <label className="admin-field">
              <span>{adminTexts.users.inviteTeacherReady}</span>
              <input type="text" value={teacherInviteUrl} readOnly />
            </label>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onPointerDown={(event) =>
                activate(event, () => {
                  void copyText(teacherInviteUrl);
                  setNotice(adminTexts.copied);
                })
              }
            >
              {adminTexts.copy}
            </button>
          </div>
        ) : null}
      </form>

      {users === null ? (
        <AdminLoading />
      ) : users.length === 0 ? (
        <AdminEmpty message="Aucun compte." />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{adminTexts.users.name}</th>
                <th>{adminTexts.users.role}</th>
                <th>{adminTexts.users.status}</th>
                <th>{adminTexts.users.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const self = session?.user.id === user.id;
                const adult = user.role !== 'eleve';

                return (
                  <tr key={user.id} data-label={user.displayName}>
                    <td data-label={adminTexts.users.name}>
                      <AvatarPill
                        avatarId={user.avatarId}
                        name={user.displayName}
                      />
                      <small>
                        {user.username ?? 'Sans identifiant'} ·{' '}
                        {formatDate(user.createdAt)}
                      </small>
                    </td>
                    <td data-label={adminTexts.users.role}>
                      {adult && !self ? (
                        <select
                          value={user.role}
                          disabled={busyId === user.id}
                          onChange={(event) =>
                            void changeRole(user, event.target.value)
                          }
                          aria-label={`${adminTexts.users.role} ${user.displayName}`}
                        >
                          <option value="admin">Administrateur</option>
                          <option value="encadrant">Encadrant</option>
                          <option value="parent">Parent</option>
                        </select>
                      ) : (
                        <span className="admin-badge">
                          {roleLabel(user.role)}
                        </span>
                      )}
                      {self ? (
                        <small>{adminTexts.users.self}</small>
                      ) : null}
                    </td>
                    <td data-label={adminTexts.users.status}>
                      <span
                        className={`admin-badge${user.disabled ? ' admin-badge--muted' : ' admin-badge--success'}`}
                      >
                        {user.disabled
                          ? adminTexts.users.disabled
                          : adminTexts.users.active}
                      </span>
                    </td>
                    <td data-label={adminTexts.users.actions}>
                      <div className="admin-actions admin-actions--tight">
                        {!self ? (
                          <button
                            type="button"
                            className={`admin-button admin-button--small ${user.disabled ? 'admin-button--secondary' : 'admin-button--danger'}`}
                            disabled={busyId === user.id}
                            onPointerDown={(event) =>
                              activate(event, () => void changeStatus(user))
                            }
                          >
                            {user.disabled
                              ? adminTexts.users.enable
                              : adminTexts.users.disable}
                          </button>
                        ) : null}
                        {adult && user.username !== null ? (
                          <button
                            type="button"
                            className="admin-button admin-button--secondary admin-button--small"
                            disabled={busyId === user.id}
                            onPointerDown={(event) =>
                              activate(event, () => void createResetLink(user))
                            }
                          >
                            {adminTexts.users.resetLink}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {resetUrl !== null ? (
            <div className="admin-copy-row">
              <label className="admin-field">
                <span>{adminTexts.users.resetReady}</span>
                <input type="text" value={resetUrl} readOnly />
              </label>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onPointerDown={(event) =>
                  activate(event, () => {
                    void copyText(resetUrl);
                    setNotice(adminTexts.copied);
                  })
                }
              >
                {adminTexts.copy}
              </button>
            </div>
          ) : null}

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-button admin-button--ghost admin-button--small"
              disabled={offset === 0}
              onPointerDown={(event) =>
                activate(event, () => setOffset(Math.max(0, offset - PAGE_SIZE)))
              }
            >
              {adminTexts.users.previous}
            </button>
            <span>{adminTexts.users.page(offset, PAGE_SIZE, total)}</span>
            <button
              type="button"
              className="admin-button admin-button--ghost admin-button--small"
              disabled={offset + PAGE_SIZE >= total}
              onPointerDown={(event) =>
                activate(event, () => setOffset(offset + PAGE_SIZE))
              }
            >
              {adminTexts.users.next}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
