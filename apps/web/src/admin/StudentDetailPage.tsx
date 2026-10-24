import {
  inviteCreatedResponseSchema,
  okResponseSchema,
  parentResponseSchema,
  parentsResponseSchema,
  pictureResetResponseSchema,
  studentResponseSchema,
  type ParentSummary,
  type StudentSummary,
} from '@circuits/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { API_BASE_URL } from '../config';
import { useProgress } from '../progress/ProgressContext';
import { navigate } from '../router';
import {
  AdminError,
  AdminLoading,
  AdminNotice,
  AvatarPill,
  activate,
  copyText,
  PicturePasswordList,
} from './AdminShared';
import { adminTexts } from './fr';
import { StudentProgressSections } from './StudentProgressSections';

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { session } = useProgress();
  const teacher =
    session?.user.role === 'admin' || session?.user.role === 'encadrant';
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [parents, setParents] = useState<ParentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetLabels, setResetLabels] = useState<string[] | null>(null);
  const [parentUsername, setParentUsername] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        `/students/${encodeURIComponent(studentId)}`,
        studentResponseSchema,
      );
      setStudent(response.student);

      if (teacher) {
        const parentList = await apiRequest(
          `/students/${encodeURIComponent(studentId)}/parents`,
          parentsResponseSchema,
        );
        setParents(parentList.parents);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [studentId, teacher]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, message?: string): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await action();

      if (message !== undefined) {
        setNotice(message);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPicture(): Promise<void> {
    await run(async () => {
      const response = await apiRequest(
        `/auth/students/${encodeURIComponent(studentId)}/picture-password/reset`,
        pictureResetResponseSchema,
        { method: 'POST' },
      );
      setResetLabels(response.labels);
    });
  }

  async function linkParent(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (parentUsername.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    await run(async () => {
      await apiRequest(
        `/students/${encodeURIComponent(studentId)}/parents`,
        parentResponseSchema,
        { method: 'POST', body: { username: parentUsername } },
      );
      setParentUsername('');
      await load();
    });
  }

  async function unlinkParent(parentId: string): Promise<void> {
    await run(async () => {
      await apiRequest(
        `/students/${encodeURIComponent(studentId)}/parents/${encodeURIComponent(parentId)}`,
        okResponseSchema,
        { method: 'DELETE' },
      );
      await load();
    });
  }

  async function createParentInvite(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (inviteName.trim() === '' || inviteUsername.trim() === '') {
      setError(adminTexts.required);
      return;
    }

    await run(async () => {
      const response = await apiRequest(
        '/auth/invites',
        inviteCreatedResponseSchema,
        {
          method: 'POST',
          body: {
            role: 'parent',
            username: inviteUsername,
            displayName: inviteName,
            childId: studentId,
          },
        },
      );
      setInviteUrl(response.invite.url);
      setInviteName('');
      setInviteUsername('');
    });
  }

  async function deleteStudent(): Promise<void> {
    await run(async () => {
      await apiRequest(
        `/students/${encodeURIComponent(studentId)}`,
        okResponseSchema,
        {
          method: 'DELETE',
          body: { confirmName },
        },
      );
      navigate('/admin');
    });
  }

  if (student === null) {
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
            ← {adminTexts.student.back}
          </button>
          <h1>
            <AvatarPill
              avatarId={student.avatarId}
              name={student.displayName}
            />
          </h1>
          <p>
            {student.groups.length === 0
              ? adminTexts.student.noGroup
              : student.groups.map((group) => group.name).join(' · ')}
          </p>
        </div>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}
      {notice !== null ? <AdminNotice message={notice} tone="success" /> : null}
      {student.pictureLocked ? (
        <AdminNotice message={adminTexts.student.locked} tone="warning" />
      ) : null}

      <div className="admin-grid-2">
        <section className="admin-card">
          <h2>{adminTexts.student.groups}</h2>
          {student.groups.length === 0 ? (
            <p>{adminTexts.student.noGroup}</p>
          ) : (
            <ul className="admin-simple-list">
              {student.groups.map((group) => (
                <li key={group.id}>{group.name}</li>
              ))}
            </ul>
          )}

          <a
            className="admin-button admin-button--secondary"
            href={`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/export`}
          >
            {adminTexts.student.export}
          </a>

          {teacher ? (
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onPointerDown={(event) =>
                activate(event, () => void resetPicture())
              }
            >
              {adminTexts.student.resetPicture}
            </button>
          ) : null}
          <p className="admin-muted">{adminTexts.student.resetHint}</p>

          {resetLabels !== null ? (
            <PicturePasswordList
              entries={[
                {
                  name: student.displayName,
                  labels: resetLabels,
                  pattern: [],
                },
              ]}
            />
          ) : null}
        </section>

        {teacher ? (
          <section className="admin-card">
            <h2>{adminTexts.student.parents}</h2>
            {parents.length === 0 ? (
              <p>{adminTexts.student.noParents}</p>
            ) : (
              <ul className="admin-simple-list">
                {parents.map((parent) => (
                  <li key={parent.id}>
                    <span>
                      {parent.displayName}
                      {parent.username !== null ? ` (${parent.username})` : ''}
                    </span>
                    <button
                      type="button"
                      className="admin-button admin-button--ghost admin-button--small"
                      disabled={busy}
                      onPointerDown={(event) =>
                        activate(event, () => void unlinkParent(parent.id))
                      }
                    >
                      {adminTexts.student.unlink}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className="admin-form admin-form--compact" onSubmit={(event) => void linkParent(event)}>
              <label className="admin-field">
                <span>{adminTexts.student.linkParent}</span>
                <input
                  type="text"
                  value={parentUsername}
                  onChange={(event) => setParentUsername(event.target.value)}
                  placeholder={adminTexts.student.parentUsername}
                />
              </label>
              <button
                type="submit"
                className="admin-button admin-button--secondary"
                disabled={busy}
              >
                {adminTexts.student.link}
              </button>
            </form>
          </section>
        ) : null}
      </div>

      {teacher ? (
        <section className="admin-card">
          <h2>{adminTexts.student.inviteParent}</h2>
          <form className="admin-form admin-form--compact" onSubmit={(event) => void createParentInvite(event)}>
            <div className="admin-inline-form__row">
              <label className="admin-field">
                <span>{adminTexts.student.parentName}</span>
                <input
                  type="text"
                  value={inviteName}
                  maxLength={80}
                  onChange={(event) => setInviteName(event.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>{adminTexts.student.parentNewUsername}</span>
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(event) => setInviteUsername(event.target.value)}
                />
                <small className="admin-muted">
                  {adminTexts.student.parentNewUsernameHint}
                </small>
              </label>
            </div>
            <button
              type="submit"
              className="admin-button admin-button--primary"
              disabled={busy}
            >
              {adminTexts.student.createInvite}
            </button>
          </form>

          {inviteUrl !== null ? (
            <div className="admin-copy-row">
              <label className="admin-field">
                <span>{adminTexts.student.inviteReady}</span>
                <input type="text" value={inviteUrl} readOnly />
              </label>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onPointerDown={(event) =>
                  activate(event, () => {
                    void copyText(inviteUrl);
                    setNotice(adminTexts.copied);
                  })
                }
              >
                {adminTexts.copy}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <StudentProgressSections studentId={studentId} />

      {teacher ? (
        <section className="admin-card admin-danger-zone">
          <h2>{adminTexts.student.deleteTitle}</h2>
          <p>{adminTexts.student.deleteWarning}</p>
          {deleteOpen ? (
            <div className="admin-form">
              <label className="admin-field">
                <span>{adminTexts.student.deleteConfirm}</span>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                />
              </label>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  disabled={busy || confirmName !== student.displayName}
                  onPointerDown={(event) =>
                    activate(event, () => void deleteStudent())
                  }
                >
                  {adminTexts.student.deleteSubmit}
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--ghost"
                  onPointerDown={(event) =>
                    activate(event, () => {
                      setDeleteOpen(false);
                      setConfirmName('');
                    })
                  }
                >
                  {adminTexts.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="admin-button admin-button--danger"
              onPointerDown={(event) =>
                activate(event, () => setDeleteOpen(true))
              }
            >
              {adminTexts.student.delete}
            </button>
          )}
        </section>
      ) : null}
    </section>
  );
}
