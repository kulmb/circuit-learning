import { studentsResponseSchema, type StudentSummary } from '@circuits/shared';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { navigate } from '../router';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AvatarPill,
  activate,
} from './AdminShared';
import { adminTexts } from './fr';

export function ParentHomePage() {
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest('/students', studentsResponseSchema);
      setStudents(response.students);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{adminTexts.parent.title}</h1>
          <p>{adminTexts.parent.subtitle}</p>
        </div>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {students === null ? (
        <AdminLoading />
      ) : students.length === 0 ? (
        <AdminEmpty message={adminTexts.parent.empty} />
      ) : (
        <ul className="admin-card-grid">
          {students.map((student) => (
            <li key={student.id}>
              <article className="admin-group-card">
                <h2>
                  <AvatarPill
                    avatarId={student.avatarId}
                    name={student.displayName}
                  />
                </h2>
                <p>
                  {student.groups.length === 0
                    ? adminTexts.student.noGroup
                    : student.groups.map((group) => group.name).join(' · ')}
                </p>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onPointerDown={(event) =>
                    activate(event, () =>
                      navigate(`/admin/students/${student.id}`),
                    )
                  }
                >
                  {adminTexts.parent.open}
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
