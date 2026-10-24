import mongoose, { Types } from 'mongoose';

import {
  AuditLogModel,
  GroupModel,
  InviteModel,
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  SessionModel,
  UserModel,
} from '../db/models/index.js';

export class StudentNotFoundError extends Error {
  constructor() {
    super('Élève introuvable.');
    this.name = 'StudentNotFoundError';
  }
}

export class NotAStudentError extends Error {
  constructor() {
    super('Ce compte n’est pas un élève.');
    this.name = 'NotAStudentError';
  }
}

export interface DeleteStudentResult {
  groupsUpdated: number;
  parentsUpdated: number;
  progressDeleted: number;
  attemptsDeleted: number;
  circuitsDeleted: number;
  sessionsDeleted: number;
  invitesDeleted: number;
}

function toObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new StudentNotFoundError();
  }

  return new Types.ObjectId(value);
}

export interface DeleteStudentOptions {
  /** When present, an audit entry is written in the same transaction. */
  actorId?: Types.ObjectId | undefined;
}

/**
 * Permanently deletes a student and everything attached to them in one
 * transaction. Parent links and group memberships are pulled from the
 * remaining documents; the student's audit trail is intentionally kept.
 */
export async function deleteStudent(
  userId: string | Types.ObjectId,
  options: DeleteStudentOptions = {},
): Promise<DeleteStudentResult> {
  const id = typeof userId === 'string' ? toObjectId(userId) : userId;
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const student = await UserModel.findById(id)
        .select('role')
        .session(session);

      if (student === null) {
        throw new StudentNotFoundError();
      }

      if (student.role !== 'eleve') {
        throw new NotAStudentError();
      }

      const [progress, attempts, circuits, sessions, invites] =
        await Promise.all([
          LevelProgressModel.deleteMany({ userId: id }).session(session),
          LevelAttemptModel.deleteMany({ userId: id }).session(session),
          SandboxCircuitModel.deleteMany({ userId: id }).session(session),
          SessionModel.deleteMany({ userId: id }).session(session),
          InviteModel.deleteMany(
            mongoose.trusted({
              $or: [{ targetUserId: id }, { childId: id }],
            }),
          ).session(session),
        ]);

      const groups = await GroupModel.updateMany(
        { 'members.userId': id },
        { $pull: { members: { userId: id } } },
      ).session(session);

      const parents = await UserModel.updateMany(
        { parentOf: id },
        { $pull: { parentOf: id } },
      ).session(session);

      await UserModel.deleteOne({ _id: id }).session(session);

      if (options.actorId !== undefined) {
        await AuditLogModel.create(
          [
            {
              actorId: options.actorId,
              action: 'delete_student',
              targetType: 'user',
              targetId: id,
            },
          ],
          { session },
        );
      }

      return {
        groupsUpdated: groups.modifiedCount,
        parentsUpdated: parents.modifiedCount,
        progressDeleted: progress.deletedCount ?? 0,
        attemptsDeleted: attempts.deletedCount ?? 0,
        circuitsDeleted: circuits.deletedCount ?? 0,
        sessionsDeleted: sessions.deletedCount ?? 0,
        invitesDeleted: invites.deletedCount ?? 0,
      };
    });
  } finally {
    await session.endSession();
  }
}
