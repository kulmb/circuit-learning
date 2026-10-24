import type { StudentExport } from '@circuits/shared';

import {
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  UserModel,
  type UserDocument,
} from '../db/models/index.js';
import { groupsForStudent } from '../auth/access.js';

function iso(value: Date | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toISOString();
}

/** Everything stored about a child, without any secret or adult credential. */
export async function buildStudentExport(
  student: UserDocument,
): Promise<StudentExport> {
  const [groups, parents, progress, attempts, circuits] = await Promise.all([
    groupsForStudent(student._id.toString()),
    UserModel.find({ role: 'parent', parentOf: student._id }),
    LevelProgressModel.find({ userId: student._id }),
    LevelAttemptModel.find({ userId: student._id }),
    SandboxCircuitModel.find({ userId: student._id }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    student: {
      id: student._id.toString(),
      displayName: student.displayName,
      avatarId: student.avatarId ?? null,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      vocabulary: student.vocabulary.map((entry) => ({
        wordId: entry.wordId,
        unlockedAt: entry.unlockedAt.toISOString(),
      })),
    },
    groups: groups
      .map((group) => {
        const membership = group.members.find((member) =>
          member.userId.equals(student._id),
        );

        return {
          id: group._id.toString(),
          name: group.name,
          joinedAt: (membership?.joinedAt ?? group.createdAt).toISOString(),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'fr')),
    parents: parents
      .map((parent) => ({
        id: parent._id.toString(),
        displayName: parent.displayName,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'fr')),
    progress: progress
      .map((entry) => ({
        levelId: entry.levelId,
        status: entry.status,
        stars: entry.stars,
        attempts: entry.attempts,
        hintsUsed: entry.hintsUsed,
        bestTimeMs: entry.bestTimeMs,
        firstCompletedAt: iso(entry.firstCompletedAt),
        lastPlayedAt: iso(entry.lastPlayedAt),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      }))
      .sort((left, right) => left.levelId.localeCompare(right.levelId)),
    attempts: attempts
      .map((attempt) => ({
        levelId: attempt.levelId,
        groupId: attempt.groupId?.toString() ?? null,
        startedAt: attempt.startedAt.toISOString(),
        endedAt: iso(attempt.endedAt),
        success: attempt.success,
        hintsUsed: attempt.hintsUsed,
        durationMs: attempt.durationMs ?? 0,
        errorsDetected: [...attempt.errorsDetected],
      }))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
    sandboxCircuits: circuits
      .map((circuit) => ({
        name: circuit.name,
        data: circuit.data,
        thumbnail: circuit.thumbnail ?? null,
        createdAt: circuit.createdAt.toISOString(),
        updatedAt: circuit.updatedAt.toISOString(),
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  };
}
