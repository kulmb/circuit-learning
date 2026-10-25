import {
  PROGRESS_CONCEPTS,
  initialPlayerProgress,
  reconcileProgress,
  type GroupDashboardResponse,
  type GroupDifficulty,
  type GroupLevelStats,
  type StudentDashboardResponse,
} from '@circuits/shared';
import { ALL_LEVELS } from '@circuits/shared/levels';
import { Types } from 'mongoose';

import {
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../db/models/index.js';

const PROGRESS_INDEX = 'levelprogress_user_level_unique';
const ATTEMPTS_BY_GROUP_INDEX = 'levelattempts_group_started';
const ATTEMPTS_BY_USER_INDEX = 'levelattempts_user_started';
const SANDBOX_INDEX = 'sandbox_user_updated';

function toIso(value: Date | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toISOString();
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

interface ProgressAggregationRow {
  _id: Types.ObjectId;
  levels: Array<{
    levelId: string;
    status: 'locked' | 'unlocked' | 'completed';
    stars: number;
    attempts: number;
    hintsUsed: number;
    bestTimeMs: number | null;
    lastPlayedAt: Date | null;
  }>;
}

interface LevelStatsRow {
  levelId: string;
  completed: number;
  started: number;
  attempts: number;
  hints: number;
}

interface DifficultyRow {
  levelId: string;
  code: string;
  students: number;
  attempts: number;
}

export async function buildGroupDashboard(
  group: GroupDocument,
): Promise<GroupDashboardResponse> {
  const studentIds = group.members
    .filter((member) => member.roleInGroup === 'eleve')
    .map((member) => member.userId);

  if (studentIds.length === 0) {
    return {
      group: {
        id: group._id.toString(),
        name: group.name,
        joinCode: group.joinCode,
      },
      totalStudents: 0,
      activeStudents: 0,
      students: [],
      levels: ALL_LEVELS.map((level) => ({
        levelId: level.id,
        totalStudents: 0,
        completed: 0,
        started: 0,
        completionRate: 0,
        averageAttempts: 0,
        averageHints: 0,
      })),
      difficulties: [],
    };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [students, progressRows, statRows, difficultyRows, activeRows] =
    await Promise.all([
      UserModel.aggregate<{
        _id: Types.ObjectId;
        displayName: string;
        avatarId: string | null;
      }>([
        { $match: { _id: { $in: studentIds }, role: 'eleve' } },
        { $project: { displayName: 1, avatarId: 1 } },
        { $sort: { displayName: 1 } },
      ]),
      LevelProgressModel.aggregate<ProgressAggregationRow>([
        { $match: { userId: { $in: studentIds } } },
        {
          $group: {
            _id: '$userId',
            levels: {
              $push: {
                levelId: '$levelId',
                status: '$status',
                stars: '$stars',
                attempts: '$attempts',
                hintsUsed: '$hintsUsed',
                bestTimeMs: '$bestTimeMs',
                lastPlayedAt: '$lastPlayedAt',
              },
            },
          },
        },
        { $project: { _id: 1, levels: 1 } },
      ]).hint(PROGRESS_INDEX),
      LevelProgressModel.aggregate<LevelStatsRow>([
        { $match: { userId: { $in: studentIds } } },
        {
          $group: {
            _id: '$levelId',
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            started: {
              $sum: { $cond: [{ $gt: ['$attempts', 0] }, 1, 0] },
            },
            attempts: { $sum: '$attempts' },
            hints: { $sum: '$hintsUsed' },
          },
        },
        {
          $project: {
            _id: 0,
            levelId: '$_id',
            completed: 1,
            started: 1,
            attempts: 1,
            hints: 1,
          },
        },
      ]).hint(PROGRESS_INDEX),
      LevelAttemptModel.aggregate<DifficultyRow>([
        {
          $match: {
            groupId: group._id,
            errorsDetected: { $ne: [] },
          },
        },
        { $unwind: '$errorsDetected' },
        {
          $group: {
            _id: {
              levelId: '$levelId',
              code: '$errorsDetected',
            },
            students: { $addToSet: '$userId' },
            attempts: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            levelId: '$_id.levelId',
            code: '$_id.code',
            students: { $size: '$students' },
            attempts: 1,
          },
        },
        { $sort: { students: -1, attempts: -1 } },
        { $limit: 20 },
      ]).hint(ATTEMPTS_BY_GROUP_INDEX),
      LevelAttemptModel.aggregate<{ active: number }>([
        {
          $match: {
            groupId: group._id,
            startedAt: { $gte: since },
          },
        },
        { $group: { _id: '$userId' } },
        { $count: 'active' },
      ]).hint(ATTEMPTS_BY_GROUP_INDEX),
    ]);

  const progressByStudent = new Map(
    progressRows.map((row) => [row._id.toString(), row.levels]),
  );
  const authStudents = students.map((student) => {
    const progress = initialPlayerProgress();
    const rows = progressByStudent.get(student._id.toString()) ?? [];

    for (const row of rows) {
      if (progress.levels[row.levelId] !== undefined) {
        progress.levels[row.levelId] = {
          levelId: row.levelId,
          status: row.status,
          stars: row.stars,
          attempts: row.attempts,
          hintsUsed: row.hintsUsed,
          bestTimeMs: row.bestTimeMs,
          firstCompletedAt: null,
          lastPlayedAt: row.lastPlayedAt?.getTime() ?? null,
        };
      }
    }

    const reconciled = reconcileProgress(progress);

    return {
      id: student._id.toString(),
      displayName: student.displayName,
      avatarId: student.avatarId ?? null,
      levels: ALL_LEVELS.flatMap((level) => {
        const entry = reconciled.levels[level.id];

        return entry === undefined
          ? []
          : [
              {
                levelId: entry.levelId,
                status: entry.status,
                stars: entry.stars,
                attempts: entry.attempts,
                hintsUsed: entry.hintsUsed,
                bestTimeMs: entry.bestTimeMs,
                lastPlayedAt:
                  entry.lastPlayedAt === null
                    ? null
                    : new Date(entry.lastPlayedAt).toISOString(),
              },
            ];
      }),
    };
  });

  const statsByLevel = new Map(statRows.map((row) => [row.levelId, row]));
  const totalStudents = authStudents.length;
  const levels: GroupLevelStats[] = ALL_LEVELS.map((level) => {
    const row = statsByLevel.get(level.id);
    const completed = row?.completed ?? 0;
    const started = row?.started ?? 0;

    return {
      levelId: level.id,
      totalStudents,
      completed,
      started,
      completionRate: totalStudents === 0 ? 0 : completed / totalStudents,
      averageAttempts:
        started === 0 ? 0 : round1((row?.attempts ?? 0) / started),
      averageHints:
        started === 0 ? 0 : round1((row?.hints ?? 0) / started),
    };
  });

  const difficulties: GroupDifficulty[] = difficultyRows.map((row) => ({
    levelId: row.levelId,
    code: row.code,
    students: row.students,
    attempts: row.attempts,
  }));

  return {
    group: {
      id: group._id.toString(),
      name: group.name,
      joinCode: group.joinCode,
    },
    totalStudents,
    activeStudents: activeRows[0]?.active ?? 0,
    students: authStudents,
    levels,
    difficulties,
  };
}

export async function buildStudentDashboard(
  student: UserDocument,
): Promise<StudentDashboardResponse> {
  const [progressRows, timelineRows, sandboxRows] = await Promise.all([
    LevelProgressModel.aggregate<{
      levelId: string;
      status: 'locked' | 'unlocked' | 'completed';
      stars: number;
      attempts: number;
      hintsUsed: number;
      bestTimeMs: number | null;
      lastPlayedAt: Date | null;
    }>([
      { $match: { userId: student._id } },
      {
        $project: {
          _id: 0,
          levelId: 1,
          status: 1,
          stars: 1,
          attempts: 1,
          hintsUsed: 1,
          bestTimeMs: 1,
          lastPlayedAt: 1,
        },
      },
    ]).hint(PROGRESS_INDEX),
    LevelAttemptModel.aggregate<{
      _id: Types.ObjectId;
      levelId: string;
      success: boolean;
      hintsUsed: number;
      durationMs: number;
      errorsDetected: string[];
      startedAt: Date;
      endedAt: Date | null;
    }>([
      { $match: { userId: student._id } },
      { $sort: { startedAt: -1 } },
      { $limit: 25 },
      {
        $project: {
          _id: 1,
          levelId: 1,
          success: 1,
          hintsUsed: 1,
          durationMs: 1,
          errorsDetected: 1,
          startedAt: 1,
          endedAt: 1,
        },
      },
    ]).hint(ATTEMPTS_BY_USER_INDEX),
    SandboxCircuitModel.aggregate<{
      _id: Types.ObjectId;
      clientId: string | null;
      name: string;
      thumbnail: string | null;
      updatedAt: Date;
    }>([
      { $match: { userId: student._id } },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          _id: 1,
          clientId: 1,
          name: 1,
          thumbnail: 1,
          updatedAt: 1,
        },
      },
    ]).hint(SANDBOX_INDEX),
  ]);

  const progress = initialPlayerProgress();

  for (const row of progressRows) {
    if (progress.levels[row.levelId] !== undefined) {
      progress.levels[row.levelId] = {
        levelId: row.levelId,
        status: row.status,
        stars: row.stars,
        attempts: row.attempts,
        hintsUsed: row.hintsUsed,
        bestTimeMs: row.bestTimeMs,
        firstCompletedAt: null,
        lastPlayedAt: row.lastPlayedAt?.getTime() ?? null,
      };
    }
  }

  const knownVocabulary = new Set(
    (student.vocabulary ?? []).map((entry) => entry.wordId),
  );
  const reconciled = reconcileProgress(progress);

  return {
    levels: ALL_LEVELS.flatMap((level) => {
      const entry = reconciled.levels[level.id];

      return entry === undefined
        ? []
        : [
            {
              levelId: entry.levelId,
              status: entry.status,
              stars: entry.stars,
              attempts: entry.attempts,
              hintsUsed: entry.hintsUsed,
              bestTimeMs: entry.bestTimeMs,
              lastPlayedAt:
                entry.lastPlayedAt === null
                  ? null
                  : new Date(entry.lastPlayedAt).toISOString(),
            },
          ];
    }),
    timeline: timelineRows.map((attempt) => ({
      id: attempt._id.toString(),
      levelId: attempt.levelId,
      success: attempt.success,
      hintsUsed: attempt.hintsUsed,
      durationMs: attempt.durationMs,
      errorsDetected: [...attempt.errorsDetected],
      startedAt: attempt.startedAt.toISOString(),
      endedAt: toIso(attempt.endedAt),
    })),
    concepts: PROGRESS_CONCEPTS.map((concept) => ({
      id: concept.id,
      mastered: concept.vocabularyIds.every((wordId) =>
        knownVocabulary.has(wordId),
      ),
    })),
    sandbox: sandboxRows
      .filter((circuit) => circuit.clientId !== null)
      .map((circuit) => ({
        id: circuit.clientId ?? circuit._id.toString(),
        name: circuit.name,
        thumbnail: circuit.thumbnail ?? null,
        updatedAt: circuit.updatedAt.toISOString(),
      })),
  };
}

export const DASHBOARD_INDEXES = {
  progress: PROGRESS_INDEX,
  attemptsByGroup: ATTEMPTS_BY_GROUP_INDEX,
  attemptsByUser: ATTEMPTS_BY_USER_INDEX,
  sandbox: SANDBOX_INDEX,
} as const;
