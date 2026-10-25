import {
  PROGRESS_CONCEPTS,
  studentDashboardResponseSchema,
  studentsResponseSchema,
  type StudentDashboardResponse,
  type StudentSummary,
} from '@circuits/shared';
import { ALL_LEVELS } from '@circuits/shared/levels';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { navigate } from '../router';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AvatarPill,
  activate,
  formatDate,
} from './AdminShared';
import { adminTexts } from './fr';

interface ChildEntry {
  student: StudentSummary;
  dashboard: StudentDashboardResponse;
}

export function ParentHomePage() {
  const [entries, setEntries] = useState<ChildEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest('/students', studentsResponseSchema);
      const dashboards = await Promise.all(
        response.students.map((student) =>
          apiRequest(
            `/students/${encodeURIComponent(student.id)}/dashboard`,
            studentDashboardResponseSchema,
          ),
        ),
      );
      setEntries(
        response.students.map((student, index) => ({
          student,
          dashboard: dashboards[index] ?? {
            levels: [],
            timeline: [],
            concepts: [],
            sandbox: [],
          },
        })),
      );
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

      {entries === null ? (
        <AdminLoading />
      ) : entries.length === 0 ? (
        <AdminEmpty message={adminTexts.parent.empty} />
      ) : (
        <ul className="admin-card-grid">
          {entries.map(({ student, dashboard }) => {
            const completed = dashboard.levels.filter(
              (entry) => entry.status === 'completed',
            ).length;
            const stars = dashboard.levels.reduce(
              (total, entry) => total + entry.stars,
              0,
            );
            const lastActivity = dashboard.timeline[0]?.startedAt ?? null;
            const mastered = PROGRESS_CONCEPTS.filter(
              (concept) =>
                dashboard.concepts.find((entry) => entry.id === concept.id)
                  ?.mastered === true,
            );

            return (
              <li key={student.id}>
                <article className="admin-group-card admin-parent-card">
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

                  <div className="admin-parent-stats">
                    <span>
                      <strong>{completed}</strong> / {ALL_LEVELS.length}
                      <small>
                        {adminTexts.parent.completedLevels(completed)}
                      </small>
                    </span>
                    <span>
                      <strong>{stars}</strong>
                      <small>{adminTexts.parent.stars(stars)}</small>
                    </span>
                  </div>

                  <p className="admin-muted">
                    {lastActivity === null
                      ? adminTexts.parent.noActivity
                      : adminTexts.parent.lastActivity(
                          formatDate(lastActivity),
                        )}
                  </p>

                  {mastered.length > 0 ? (
                    <div className="admin-parent-concepts">
                      <small>{adminTexts.parent.concepts}</small>
                      <div>
                        {mastered.map((concept) => (
                          <span key={concept.id} className="admin-badge admin-badge--success">
                            {concept.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
            );
          })}
        </ul>
      )}
    </section>
  );
}
