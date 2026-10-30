import type { PicturePatternId } from '@circuits/shared';
import mongoose, { Types } from 'mongoose';

import {
  AuditLogModel,
  GroupModel,
  SessionModel,
  UserModel,
  type GroupDocument,
  type SessionDocument,
  type UserDocument,
} from '../db/models/index.js';
import { canManageStudent } from '../auth/access.js';
import { ApiError, forbidden, notFound } from './errors.js';
import {
  picturePasswordLabels,
  randomPicturePattern,
} from './picturePasswords.js';
import {
  hashSecret,
  pictureSecretFromPattern,
  verifySecret,
} from './secrets.js';
import { createSession } from './sessions.js';

export const CHILD_MAX_FAILED_LOGINS = 5;
export const CHILD_LOCK_MS = 10 * 60 * 1000;

const WRONG_PICTURE_MESSAGE =
  'Ce n’est pas le bon dessin. Essaie encore.';
const LOCKED_MESSAGE = 'Demande de l’aide à ton encadrant.';

export interface ChildGroup {
  group: GroupDocument;
  students: UserDocument[];
}

async function listStudents(group: GroupDocument): Promise<UserDocument[]> {
  const ids = group.members
    .filter((member) => member.roleInGroup === 'eleve')
    .map((member) => member.userId);

  if (ids.length === 0) {
    return [];
  }

  const students = await UserModel.find({
    _id: mongoose.trusted({ $in: ids }),
    role: 'eleve',
    disabledAt: null,
  });

  return students.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'fr'),
  );
}

export async function findGroupByJoinCode(
  joinCode: string,
): Promise<ChildGroup> {
  const group = await GroupModel.findOne({
    joinCode,
    archivedAt: null,
  });

  if (group === null) {
    throw notFound('Groupe introuvable.');
  }

  return { group, students: await listStudents(group) };
}

export async function findPinnedGroup(
  groupId: string,
): Promise<ChildGroup | null> {
  if (!Types.ObjectId.isValid(groupId)) {
    return null;
  }

  const group = await GroupModel.findOne({
    _id: new Types.ObjectId(groupId),
    archivedAt: null,
  });

  if (group === null) {
    return null;
  }

  return { group, students: await listStudents(group) };
}

async function resolveGroup(
  joinCode: string | undefined,
  pinnedGroupId: string | null,
): Promise<GroupDocument> {
  if (pinnedGroupId !== null) {
    const pinned = await findPinnedGroup(pinnedGroupId);

    if (pinned === null) {
      throw notFound('Groupe introuvable.');
    }

    return pinned.group;
  }

  if (joinCode === undefined) {
    throw new ApiError(
      400,
      'join_code_required',
      'Entre le code du groupe.',
    );
  }

  return (await findGroupByJoinCode(joinCode)).group;
}

export interface ChildLoginOptions {
  joinCode?: string | undefined;
  studentId: string;
  pattern: readonly PicturePatternId[];
  pinnedGroupId: string | null;
  userAgent: string;
}

export interface ChildLoginResult {
  user: UserDocument;
  session: SessionDocument;
  token: string;
  group: GroupDocument;
}

export async function loginChild(
  options: ChildLoginOptions,
): Promise<ChildLoginResult> {
  const group = await resolveGroup(options.joinCode, options.pinnedGroupId);
  const studentId = new Types.ObjectId(options.studentId);
  const member = group.members.find(
    (candidate) =>
      candidate.roleInGroup === 'eleve' &&
      candidate.userId.equals(studentId),
  );

  if (member === undefined) {
    throw new ApiError(
      401,
      'child_login_failed',
      'Choisis ton avatar dans le groupe.',
    );
  }

  const student = await UserModel.findOne({
    _id: studentId,
    role: 'eleve',
  }).select('+pictureSecretHash');

  if (
    student === null ||
    (student.disabledAt !== null && student.disabledAt !== undefined)
  ) {
    throw forbidden(LOCKED_MESSAGE);
  }

  if (
    student.lockedUntil !== null &&
    student.lockedUntil.getTime() > Date.now()
  ) {
    throw new ApiError(423, 'picture_locked', LOCKED_MESSAGE);
  }

  if (
    student.pictureSecretHash === null ||
    student.pictureSecretHash === undefined
  ) {
    throw forbidden(LOCKED_MESSAGE);
  }

  const valid = await verifySecret(
    student.pictureSecretHash,
    pictureSecretFromPattern(options.pattern),
  );

  if (!valid) {
    const now = new Date();
    const nextCount = {
      $add: [{ $ifNull: ['$failedLogins', 0] }, 1],
    };
    const reachedLimit = {
      $gte: [nextCount, CHILD_MAX_FAILED_LOGINS],
    };

    // One atomic pipeline update: concurrent wrong taps cannot overwrite one
    // another's counter, and the threshold and lock are written together.
    const failed = await UserModel.findOneAndUpdate(
      {
        _id: student._id,
        $or: [
          { lockedUntil: null },
          { lockedUntil: mongoose.trusted({ $lte: now }) },
        ],
      },
      [
        {
          $set: {
            failedLogins: {
              $cond: [reachedLimit, 0, nextCount],
            },
            lockedUntil: {
              $cond: [
                reachedLimit,
                new Date(now.getTime() + CHILD_LOCK_MS),
                '$lockedUntil',
              ],
            },
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true },
    );

    if (failed === null) {
      throw new ApiError(423, 'picture_locked', LOCKED_MESSAGE);
    }

    if (
      failed.lockedUntil !== null &&
      failed.lockedUntil !== undefined &&
      failed.lockedUntil.getTime() > now.getTime()
    ) {
      throw new ApiError(423, 'picture_locked', LOCKED_MESSAGE);
    }

    throw new ApiError(401, 'picture_wrong', WRONG_PICTURE_MESSAGE);
  }

  const now = new Date();
  student.failedLogins = 0;
  student.lockedUntil = null;
  student.lastSeenAt = now;
  await UserModel.updateOne(
    { _id: student._id },
    {
      $set: {
        failedLogins: 0,
        lockedUntil: null,
        lastSeenAt: now,
      },
    },
  );

  const created = await createSession({
    userId: student._id,
    kind: 'child',
    userAgent: options.userAgent,
    groupId: group._id,
  });

  return {
    user: student,
    session: created.session,
    token: created.token,
    group,
  };
}

export interface PictureResetResult {
  pattern: PicturePatternId[];
  labels: string[];
}

/**
 * A teacher resets a child's tap password. The new sequence is returned once
 * so it can be shown or printed; only its argon2id hash is stored.
 */
export async function resetStudentPicturePassword(options: {
  actor: UserDocument;
  studentId: string;
}): Promise<PictureResetResult> {
  if (options.actor.role !== 'admin' && options.actor.role !== 'encadrant') {
    throw forbidden();
  }

  if (!(await canManageStudent(options.actor, options.studentId))) {
    throw forbidden('Tu n’as pas accès à cet élève.');
  }

  const student = await UserModel.findOne({
    _id: new Types.ObjectId(options.studentId),
    role: 'eleve',
  }).select('+pictureSecretHash');

  if (student === null) {
    throw notFound('Élève introuvable.');
  }

  const pattern = randomPicturePattern();
  student.pictureSecretHash = await hashSecret(
    pictureSecretFromPattern(pattern),
  );
  student.failedLogins = 0;
  student.lockedUntil = null;
  await student.save();

  await SessionModel.deleteMany({
    userId: student._id,
    kind: 'child',
  });

  await AuditLogModel.create({
    actorId: options.actor._id,
    action: 'reset_picture_password',
    targetType: 'user',
    targetId: student._id,
  });

  return {
    pattern,
    labels: picturePasswordLabels(pattern),
  };
}
