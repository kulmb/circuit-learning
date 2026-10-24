import {
  PROGRESS_CONCEPTS,
  studentDashboardResponseSchema,
  type StudentDashboardResponse,
} from '@circuits/shared';
import {
  CHAPTER_1_LEVELS,
  type LevelDefinition,
} from '@circuits/shared/levels';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { getText } from '../narration/fr';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  formatDate,
} from './AdminShared';
import { adminTexts } from './fr';

function levelFor(id: string): LevelDefinition | undefined {
  return CHAPTER_1_LEVELS.find((level) => level.id === id);
}

function levelLabel(levelId: string): string {
  const level = levelFor(levelId);

  if (level === undefined) {
    return levelId;
  }

  return level.number === null
    ? getText(level.titleTextId)
    : `${adminTexts.dashboard.level} ${level.number} · ${getText(level.titleTextId)}`;
}

export function StudentProgressSections({ studentId }: { studentId: string }) {
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        `/students/${encodeURIComponent(studentId)}/dashboard`,
        studentDashboardResponseSchema,
      );
      setDashboard(response);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (dashboard === null) {
    return error !== null ? (
      <AdminError message={error} onRetry={() => void load()} />
    ) : (
      <AdminLoading />
    );
  }

  const concepts = new Map(
    dashboard.concepts.map((concept) => [concept.id, concept.mastered]),
  );

  return (
    <div className="admin-dashboard-sections">
      <section className="admin-card">
        <h2>{adminTexts.dashboard.timelineTitle}</h2>
        {dashboard.timeline.length === 0 ? (
          <AdminEmpty message={adminTexts.dashboard.noTimeline} />
        ) : (
          <ol className="admin-timeline">
            {dashboard.timeline.map((attempt) => (
              <li
                key={attempt.id}
                className={attempt.success ? 'is-success' : 'is-failure'}
              >
                <span className="admin-timeline__dot" aria-hidden="true" />
                <div>
                  <strong>{levelLabel(attempt.levelId)}</strong>
                  <span>
                    {attempt.success
                      ? adminTexts.dashboard.success
                      : adminTexts.dashboard.failure}
                    {' · '}
                    {adminTexts.dashboard.hints(attempt.hintsUsed)}
                    {' · '}
                    {formatDate(attempt.startedAt)}
                  </span>
                  {attempt.errorsDetected.length > 0 ? (
                    <small>
                      {attempt.errorsDetected
                        .map(
                          (code) =>
                            adminTexts.dashboard.difficultyLabels[code] ?? code,
                        )
                        .join(', ')}
                    </small>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="admin-card">
        <h2>{adminTexts.dashboard.conceptsTitle}</h2>
        <ul className="admin-concept-grid">
          {PROGRESS_CONCEPTS.map((concept) => {
            const mastered = concepts.get(concept.id) === true;

            return (
              <li
                key={concept.id}
                className={`admin-concept${mastered ? ' is-mastered' : ''}`}
              >
                <span aria-hidden="true">{mastered ? '✓' : '○'}</span>
                <div>
                  <strong>{concept.label}</strong>
                  <small>
                    {mastered
                      ? adminTexts.dashboard.conceptMastered
                      : adminTexts.dashboard.conceptTodo}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="admin-card">
        <h2>{adminTexts.dashboard.sandboxTitle}</h2>
        {dashboard.sandbox.length === 0 ? (
          <AdminEmpty message={adminTexts.dashboard.noSandbox} />
        ) : (
          <ul className="admin-sandbox-grid">
            {dashboard.sandbox.map((circuit) => (
              <li key={circuit.id} className="admin-sandbox-card">
                {circuit.thumbnail !== null ? (
                  <img
                    src={circuit.thumbnail}
                    alt={circuit.name}
                    loading="lazy"
                  />
                ) : (
                  <span className="admin-sandbox-card__placeholder" aria-hidden="true">
                    ⚡
                  </span>
                )}
                <strong>{circuit.name}</strong>
                <small>{formatDate(circuit.updatedAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
