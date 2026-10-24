import {
  AVATARS,
  bulkCreatedStudentsResponseSchema,
  createdStudentResponseSchema,
  devicePinResponseSchema,
  groupChildrenResponseSchema,
  groupDetailResponseSchema,
  groupResponseSchema,
  okResponseSchema,
  type AvatarId,
  type CreatedStudentResponse,
  type GroupDetail,
} from '@circuits/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { navigate } from '../router';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminNotice,
  AvatarPill,
  activate,
  copyText,
  PicturePasswordList,
} from './AdminShared';
import { adminTexts } from './fr';

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('renard');
  const [bulkNames, setBulkNames] = useState('');
  const [created, setCreated] = useState<CreatedStudentResponse[]>([]);
  const [rename, setRename] = useState('');
  const [pinned, setPinned] = useState<'none' | 'this' | 'other'>('none');

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}`,
        groupDetailResponseSchema,
      );
      setGroup(response.group);
      setRename(response.group.name);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiRequest('/auth/device-pin', groupChildrenResponseSchema)
      .then((response) =>
        setPinned(response.group.id === groupId ? 'this' : 'other'),
      )
      .catch(() => setPinned('none'));
  }, [groupId]);

  async function run(
    action: () => Promise<void>,
    successMessage?: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await action();

      if (successMessage !== undefined) {
        setNotice(successMessage);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusy(false);
    }
  }

  async function addStudent(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (studentName.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    await run(async () => {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}/students`,
        createdStudentResponseSchema,
        {
          method: 'POST',
          body: { displayName: studentName, avatarId },
        },
      );
      setCreated([response]);
      setStudentName('');
      await load();
    });
  }

  async function addBulk(event: FormEvent): Promise<void> {
    event.preventDefault();
    const names = bulkNames
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name !== '');

    if (names.length === 0) {
      setError(adminTexts.required);
      return;
    }

    await run(async () => {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}/students/bulk`,
        bulkCreatedStudentsResponseSchema,
        { method: 'POST', body: { names } },
      );
      setCreated(response.students);
      setBulkNames('');
      await load();
    });
  }

  async function renameGroup(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (rename.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    await run(async () => {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}`,
        groupResponseSchema,
        { method: 'PATCH', body: { name: rename } },
      );
      setGroup((current) =>
        current === null
          ? current
          : { ...current, name: response.group.name },
      );
    }, 'Groupe renommé.');
  }

  async function toggleArchive(): Promise<void> {
    if (group === null) {
      return;
    }

    await run(async () => {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}`,
        groupResponseSchema,
        { method: 'PATCH', body: { archived: !group.archived } },
      );
      setGroup((current) =>
        current === null
          ? current
          : { ...current, archived: response.group.archived },
      );
    });
  }

  async function rekey(): Promise<void> {
    await run(async () => {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}/join-code`,
        groupResponseSchema,
        { method: 'POST' },
      );
      setGroup((current) =>
        current === null
          ? current
          : { ...current, joinCode: response.group.joinCode },
      );
    }, 'Nouveau code créé.');
  }

  async function pinDevice(): Promise<void> {
    await run(async () => {
      await apiRequest('/auth/device-pin', devicePinResponseSchema, {
        method: 'POST',
        body: { groupId },
      });
      setPinned('this');
    }, adminTexts.group.pinned);
  }

  async function unpin(): Promise<void> {
    await run(async () => {
      await apiRequest('/auth/device-pin', okResponseSchema, {
        method: 'DELETE',
      });
      setPinned('none');
    });
  }

  async function copyCode(): Promise<void> {
    if (group !== null) {
      await copyText(group.joinCode);
      setNotice(adminTexts.copied);
    }
  }

  if (group === null) {
    return error !== null ? (
      <AdminError message={error} onRetry={() => void load()} />
    ) : (
      <AdminLoading />
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <button
            type="button"
            className="admin-link"
            onPointerDown={(event) => activate(event, () => navigate('/admin'))}
          >
            ← {adminTexts.group.back}
          </button>
          <h1>{group.name}</h1>
          <p>
            {adminTexts.groups.studentCount(group.studentCount)} ·{' '}
            {group.archived
              ? adminTexts.groups.archived
              : adminTexts.groups.active}
          </p>
        </div>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}
      {notice !== null ? <AdminNotice message={notice} tone="success" /> : null}
      {group.archived ? (
        <AdminNotice message={adminTexts.group.archivedNotice} tone="warning" />
      ) : null}

      <div className="admin-grid-2">
        <section className="admin-card">
          <h2>{adminTexts.group.code}</h2>
          <p className="admin-code admin-code--large">{group.joinCode}</p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onPointerDown={(event) => activate(event, () => void copyCode())}
            >
              {adminTexts.copy}
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              disabled={busy}
              onPointerDown={(event) => activate(event, () => void rekey())}
            >
              {adminTexts.group.rekey}
            </button>
          </div>

          <form className="admin-form admin-form--compact" onSubmit={(event) => void renameGroup(event)}>
            <label className="admin-field">
              <span>{adminTexts.group.renameLabel}</span>
              <input
                type="text"
                value={rename}
                maxLength={80}
                onChange={(event) => setRename(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="admin-button admin-button--secondary"
              disabled={busy}
            >
              {adminTexts.group.rename}
            </button>
          </form>

          <div className="admin-actions admin-actions--spread">
            <button
              type="button"
              className={`admin-button ${group.archived ? 'admin-button--primary' : 'admin-button--danger'}`}
              disabled={busy}
              onPointerDown={(event) => activate(event, () => void toggleArchive())}
            >
              {group.archived
                ? adminTexts.group.unarchive
                : adminTexts.group.archive}
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onPointerDown={(event) =>
                activate(event, () => {
                  window.print();
                })
              }
            >
              {adminTexts.group.print}
            </button>
          </div>
        </section>

        <section className="admin-card">
          <h2>{adminTexts.group.pin}</h2>
          <p>
            {pinned === 'this'
              ? adminTexts.group.pinned
              : pinned === 'other'
                ? adminTexts.group.pinnedOther
                : 'Cet appareil n’est fixé à aucun groupe.'}
          </p>
          <div className="admin-actions">
            {pinned === 'this' ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                disabled={busy}
                onPointerDown={(event) => activate(event, () => void unpin())}
              >
                {adminTexts.group.unpin}
              </button>
            ) : (
              <button
                type="button"
                className="admin-button admin-button--primary"
                disabled={busy}
                onPointerDown={(event) => activate(event, () => void pinDevice())}
              >
                {adminTexts.group.pin}
              </button>
            )}
          </div>
          <p className="admin-muted">{adminTexts.group.printHint}</p>
        </section>
      </div>

      {!group.archived ? (
        <div className="admin-grid-2">
          <form className="admin-card admin-form" onSubmit={(event) => void addStudent(event)}>
            <h2>{adminTexts.group.addTitle}</h2>
            <label className="admin-field">
              <span>{adminTexts.group.name}</span>
              <input
                type="text"
                value={studentName}
                maxLength={80}
                onChange={(event) => setStudentName(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>{adminTexts.group.avatar}</span>
              <select
                value={avatarId}
                onChange={(event) => setAvatarId(event.target.value as AvatarId)}
              >
                {AVATARS.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.emoji} {avatar.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="admin-button admin-button--primary"
              disabled={busy}
            >
              {adminTexts.group.add}
            </button>
          </form>

          <form className="admin-card admin-form" onSubmit={(event) => void addBulk(event)}>
            <h2>{adminTexts.group.bulkTitle}</h2>
            <label className="admin-field">
              <span>{adminTexts.group.bulkHint}</span>
              <textarea
                rows={5}
                value={bulkNames}
                onChange={(event) => setBulkNames(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="admin-button admin-button--primary"
              disabled={busy}
            >
              {adminTexts.group.bulk}
            </button>
          </form>
        </div>
      ) : null}

      {created.length > 0 ? (
        <section className="admin-card">
          <h2>{adminTexts.group.createdTitle}</h2>
          <p className="admin-muted">{adminTexts.group.createdHint}</p>
          <PicturePasswordList
            entries={created.map((entry) => ({
              name: entry.student.displayName,
              labels: entry.picturePassword.labels,
              pattern: entry.picturePassword.pattern,
            }))}
          />
        </section>
      ) : null}

      <section className="admin-card">
        <h2>{adminTexts.group.studentsTitle}</h2>
        {group.students.length === 0 ? (
          <AdminEmpty message={adminTexts.group.noStudents} />
        ) : (
          <ul className="admin-student-list">
            {group.students.map((student) => (
              <li key={student.id}>
                <AvatarPill avatarId={student.avatarId} name={student.displayName} />
                {student.pictureLocked ? (
                  <span className="admin-badge admin-badge--warning">
                    {adminTexts.student.locked}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="admin-button admin-button--ghost admin-button--small"
                  onPointerDown={(event) =>
                    activate(event, () =>
                      navigate(`/admin/students/${student.id}`),
                    )
                  }
                >
                  {adminTexts.group.openStudent}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-print-area" aria-hidden="true">
        {group.students.map((student) => (
          <article key={student.id} className="admin-login-card">
            <span className="admin-login-card__avatar">
              {AVATARS.find((avatar) => avatar.id === student.avatarId)?.emoji ??
                '🙂'}
            </span>
            <strong>{student.displayName}</strong>
            <span>{adminTexts.group.code}</span>
            <b>{group.joinCode}</b>
          </article>
        ))}
      </section>
    </section>
  );
}
