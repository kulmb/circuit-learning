import {
  avatarEmoji,
  groupDashboardResponseSchema,
  type GroupDashboardResponse,
  type GroupDashboardStudent,
} from '@circuits/shared';
import {
  ALL_LEVELS,
  CHAPTERS,
  getChapterForLevel,
  type LevelDefinition,
} from '@circuits/shared/levels';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ApiClientError, apiRequest } from '../api/client';
import { getText } from '../narration/fr';
import { navigate } from '../router';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  activate,
} from './AdminShared';
import { adminTextsI18n as adminTexts } from './fr';

function chapterPrefix(level: LevelDefinition): string {
  const chapter = getChapterForLevel(level.id);
  const index = chapter === undefined
    ? 0
    : CHAPTERS.findIndex((entry) => entry.id === chapter.id) + 1;

  return index > 0 ? `${index}·` : '';
}

function levelShortLabel(level: LevelDefinition): string {
  return `${chapterPrefix(level)}${level.number === null ? '★' : level.number}`;
}

function levelTitle(level: LevelDefinition): string {
  return getText(level.titleTextId);
}

function difficultyLevelLabel(level: LevelDefinition | undefined): string {
  if (level === undefined) {
    return adminTexts.dashboard.levelHere;
  }

  return level.number === null
    ? adminTexts.dashboard.levelTransition
    : adminTexts.dashboard.levelAt(levelShortLabel(level));
}

export function GroupDashboardPage({ groupId }: { groupId: string }) {
  const [dashboard, setDashboard] = useState<GroupDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        `/groups/${encodeURIComponent(groupId)}/dashboard`,
        groupDashboardResponseSchema,
      );
      setDashboard(response);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [groupId]);

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

  const levelById = new Map(
    ALL_LEVELS.map((level) => [level.id, level]),
  );
  const chartData = dashboard.levels.map((stats) => {
    const level = levelById.get(stats.levelId);

    return {
      label: level === undefined ? stats.levelId : levelShortLabel(level),
      niveau: level === undefined ? stats.levelId : levelTitle(level),
      réussite: Math.round(stats.completionRate * 100),
    };
  });

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <button
            type="button"
            className="admin-link"
            onPointerDown={(event) =>
              activate(event, () =>
                navigate(`/admin/groups/${encodeURIComponent(groupId)}`),
              )
            }
          >
            ← {adminTexts.dashboard.backToGroup}
          </button>
          <h1>{adminTexts.dashboard.groupTitle}</h1>
          <p>{dashboard.group.name}</p>
        </div>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}

      <div className="admin-stat-grid">
        <article className="admin-stat">
          <strong>{dashboard.totalStudents}</strong>
          <span>{adminTexts.dashboard.studentsInGroup}</span>
        </article>
        <article className="admin-stat">
          <strong>{dashboard.activeStudents}</strong>
          <span>{adminTexts.dashboard.activeLast7}</span>
        </article>
      </div>

      <section className="admin-card">
        <h2>{adminTexts.dashboard.chartTitle}</h2>
        <div className="admin-chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value) => [
                  `${String(value)} %`,
                  adminTexts.dashboard.completion,
                ]}
                labelFormatter={(_label, payload) =>
                  payload[0]?.payload?.niveau ?? ''
                }
              />
              <Bar dataKey="réussite" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-card admin-scroll">
        <h2>{adminTexts.dashboard.statsTitle}</h2>
        <table className="admin-table admin-progress-table">
          <thead>
            <tr>
              <th>{adminTexts.dashboard.level}</th>
              <th>{adminTexts.dashboard.completion}</th>
              <th>{adminTexts.dashboard.averageAttempts}</th>
              <th>{adminTexts.dashboard.averageHints}</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.levels.map((stats) => {
              const level = levelById.get(stats.levelId);

              return (
                <tr key={stats.levelId}>
                  <td>
                    {level === undefined
                      ? stats.levelId
                      : `${levelShortLabel(level)} · ${levelTitle(level)}`}
                  </td>
                  <td>{Math.round(stats.completionRate * 100)} %</td>
                  <td>{stats.averageAttempts.toFixed(1)}</td>
                  <td>{stats.averageHints.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>{adminTexts.dashboard.difficultiesTitle}</h2>
        {dashboard.difficulties.length === 0 ? (
          <AdminEmpty message={adminTexts.dashboard.noDifficulties} />
        ) : (
          <ul className="admin-difficulty-list">
            {dashboard.difficulties.map((difficulty) => {
              const level = levelById.get(difficulty.levelId);
              const phrase =
                adminTexts.dashboard.difficultyLabels[difficulty.code] ??
                difficulty.code;

              return (
                <li key={`${difficulty.levelId}-${difficulty.code}`}>
                  {adminTexts.dashboard.difficulty(
                    difficulty.students,
                    phrase,
                    difficultyLevelLabel(level),
                  )}
                  <small>
                    {difficulty.attempts} {adminTexts.dashboard.attempts}
                  </small>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <h2>{adminTexts.dashboard.matrixTitle}</h2>
        {dashboard.students.length === 0 ? (
          <AdminEmpty message={adminTexts.dashboard.noStudents} />
        ) : (
          <>
            <div className="admin-scroll admin-progress-matrix">
              <table className="admin-table admin-matrix">
                <thead>
                  <tr>
                    <th>{adminTexts.dashboard.student}</th>
                    {ALL_LEVELS.map((level) => (
                      <th key={level.id} title={levelTitle(level)}>
                        {levelShortLabel(level)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.students.map((student) => (
                    <MatrixRow key={student.id} student={student} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-progress-cards">
              {dashboard.students.map((student) => (
                <details key={student.id} className="admin-progress-card">
                  <summary>
                    <AvatarSummary student={student} />
                  </summary>
                  <div className="admin-progress-card__levels">
                    {student.levels.map((entry) => {
                      const level = levelById.get(entry.levelId);

                      return (
                        <div key={entry.levelId} className="admin-progress-level">
                          <span>
                            {level === undefined
                              ? entry.levelId
                              : levelShortLabel(level)}
                          </span>
                          <ProgressCell
                            status={entry.status}
                            stars={entry.stars}
                            attempts={entry.attempts}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button--secondary admin-button--small"
                    onPointerDown={(event) =>
                      activate(event, () =>
                        navigate(`/admin/students/${student.id}`),
                      )
                    }
                  >
                    {adminTexts.dashboard.openStudent}
                  </button>
                </details>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function MatrixRow({ student }: { student: GroupDashboardStudent }) {
  const levels = new Map(student.levels.map((entry) => [entry.levelId, entry]));

  return (
    <tr>
      <th scope="row" className="admin-matrix__student">
        <button
          type="button"
          className="admin-link"
          onPointerDown={(event) =>
            activate(event, () => navigate(`/admin/students/${student.id}`))
          }
        >
          {avatarEmoji(student.avatarId)} {student.displayName}
        </button>
      </th>
      {ALL_LEVELS.map((level) => {
        const entry = levels.get(level.id);

        return (
          <td key={level.id} className="admin-matrix__cell">
            {entry === undefined ? (
              <span className="admin-dot admin-dot--empty">—</span>
            ) : (
              <ProgressCell
                status={entry.status}
                stars={entry.stars}
                attempts={entry.attempts}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}

function ProgressCell({
  status,
  stars,
  attempts,
}: {
  status: 'locked' | 'unlocked' | 'completed';
  stars: number;
  attempts: number;
}) {
  if (status === 'completed') {
    return (
      <span
        className={`admin-stars admin-stars--${stars}`}
        aria-label={adminTexts.dashboard.starsLabel(stars)}
      >
        {'★'.repeat(stars)}
        {'☆'.repeat(Math.max(0, 3 - stars))}
      </span>
    );
  }

  if (status === 'unlocked' && attempts > 0) {
    return (
      <span
        className="admin-dot admin-dot--progress"
        title={adminTexts.dashboard.inProgress}
      >
        ●
      </span>
    );
  }

  return (
    <span
      className="admin-dot admin-dot--empty"
      title={adminTexts.dashboard.notStarted}
    >
      —
    </span>
  );
}

function AvatarSummary({ student }: { student: GroupDashboardStudent }) {
  const completed = student.levels.filter(
    (entry) => entry.status === 'completed',
  ).length;

  return (
    <span className="admin-progress-card__summary">
      <span>
        {avatarEmoji(student.avatarId)} <strong>{student.displayName}</strong>
      </span>
      <span>
        {completed}/{ALL_LEVELS.length}
      </span>
    </span>
  );
}

