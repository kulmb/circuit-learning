import {
  groupResponseSchema,
  groupsResponseSchema,
  type ManagedGroup,
} from '@circuits/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { navigate } from '../router';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  activate,
} from './AdminShared';
import { adminTexts } from './fr';

export function GroupsPage() {
  const [groups, setGroups] = useState<ManagedGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        '/groups?includeArchived=true',
        groupsResponseSchema,
      );
      setGroups(response.groups);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (name.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest('/groups', groupResponseSchema, {
        method: 'POST',
        body: { name },
      });
      setName('');
      await load();
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
          <h1>{adminTexts.groups.title}</h1>
          <p>{adminTexts.groups.subtitle}</p>
        </div>
      </header>

      <form className="admin-card admin-inline-form" onSubmit={(event) => void create(event)}>
        <h2>{adminTexts.groups.createTitle}</h2>
        <div className="admin-inline-form__row">
          <label className="admin-field">
            <span>{adminTexts.groups.name}</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="admin-button admin-button--primary"
            disabled={busy}
          >
            {busy ? adminTexts.loading : adminTexts.groups.create}
          </button>
        </div>
      </form>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {groups === null ? (
        <AdminLoading />
      ) : groups.length === 0 ? (
        <AdminEmpty message={adminTexts.groups.empty} />
      ) : (
        <ul className="admin-card-grid">
          {groups.map((group) => (
            <li key={group.id}>
              <article className={`admin-group-card${group.archived ? ' is-archived' : ''}`}>
                <header>
                  <h2>{group.name}</h2>
                  <span className={`admin-badge${group.archived ? ' admin-badge--muted' : ''}`}>
                    {group.archived
                      ? adminTexts.groups.archived
                      : adminTexts.groups.active}
                  </span>
                </header>
                <p className="admin-code">
                  {adminTexts.group.code} <strong>{group.joinCode}</strong>
                </p>
                <p>{adminTexts.groups.studentCount(group.studentCount)}</p>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onPointerDown={(event) =>
                    activate(event, () => navigate(`/admin/groups/${group.id}`))
                  }
                >
                  {adminTexts.groups.open}
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
