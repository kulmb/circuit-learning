import mongoose, { Types } from 'mongoose';

import {
  AVATAR_IDS,
  type AvatarId,
  type PicturePatternId,
} from '@circuits/shared';

import {
  AuditLogModel,
  GroupModel,
  SessionModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../db/models/index.js';
import {
  canManageStudent,
  groupsForStudent,
  requireGroupForUser,
  requireStudent,
  userCanAccessGroup,
} from '../auth/access.js';
import { ApiError, forbidden, notFound } from './errors.js';
import {
  listGroupsFor,
  requireActiveGroup,
} from './groupManagement.js';
import {
  picturePasswordLabels,
  randomPicturePattern,
} from './picturePasswords.js';
import { hashSecret, pictureSecretFromPattern } from './secrets.js';

export interface StudentWithGroups {
  student: UserDocument;
  groups: GroupDocument[];
}

export interface CreatedStudent extends StudentWithGroups {
  picturePassword: {
    pattern: PicturePatternId[];
    labels: string[];
  };
}

async function groupsForDto(
  actor: UserDocument,
  studentIds: readonly Types.ObjectId[],
): Promise<Map<string, GroupDocument[]>> {
  const map = new Map<string, GroupDocument[]>();

  if (studentIds.length === 0) {
    return map;
  }

  const groups = await GroupModel.find({
    'members.userId': mongoose.trusted({ $in: studentIds }),
  });
  const wanted = new Set(studentIds.map((id) => id.toString()));

  for (const group of groups) {
    if (actor.role !== 'admin' && !userCanAccessGroup(actor, group)) {
      continue;
    }

    for (const member of group.members) {
      if (member.roleInGroup !== 'eleve') {
        continue;
      }

      const key = member.userId.toString();

      if (!wanted.has(key)) {
        continue;
      }

      const existing = map.get(key) ?? [];
      existing.push(group);
      map.set(key, existing);
    }
  }

  return map;
}

async function studentWithGroups(
  actor: UserDocument,
  student: UserDocument,
): Promise<StudentWithGroups> {
  const map = await groupsForDto(actor, [student._id]);

  return { student, groups: map.get(student._id.toString()) ?? [] };
}

export async function getStudentFor(
  actor: UserDocument,
  studentId: string,
): Promise<StudentWithGroups> {
  const student = await requireStudent(studentId);

  if (!(await canManageStudent(actor, studentId))) {
    throw forbidden('Tu n’as pas accès à cet élève.');
  }

  return studentWithGroups(actor, student);
}

export async function listStudentsFor(
  actor: UserDocument,
  groupId: string | undefined,
): Promise<StudentWithGroups[]> {
  if (actor.role === 'eleve') {
    throw forbidden();
  }

  let filterIds: Types.ObjectId[] | null = null;

  if (groupId !== undefined) {
    if (actor.role === 'parent') {
      const group = await GroupModel.findById(groupId);

      if (
        group === null ||
        !actor.parentOf.some((childId) =>
          group.members.some((member) => member.userId.equals(childId)),
        )
      ) {
        throw forbidden('Tu n’as pas accès à ce groupe.');
      }

      filterIds = actor.parentOf.filter((childId) =>
        group.members.some((member) => member.userId.equals(childId)),
      );
    } else {
      const group = await requireGroupForUser(actor, groupId);
      filterIds = group.members
        .filter((member) => member.roleInGroup === 'eleve')
        .map((member) => member.userId);
    }
  } else if (actor.role === 'parent') {
    filterIds = actor.parentOf;
  } else if (actor.role === 'encadrant') {
    const accessible = await listGroupsFor(actor, true);
    filterIds = accessible.flatMap((group) =>
      group.members
        .filter((member) => member.roleInGroup === 'eleve')
        .map((member) => member.userId),
    );
  }

  let students: UserDocument[];

  if (filterIds === null) {
    students = await UserModel.find({ role: 'eleve' });
  } else if (filterIds.length === 0) {
    students = [];
  } else {
    students = await UserModel.find({
      role: 'eleve',
      _id: mongoose.trusted({ $in: filterIds }),
    });
  }

  students.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'fr'),
  );
  const groupMap = await groupsForDto(
    actor,
    students.map((student) => student._id),
  );

  return students.map((student) => ({
    student,
    groups: groupMap.get(student._id.toString()) ?? [],
  }));
}

export async function createStudent(
  actor: UserDocument,
  groupId: string,
  values: { displayName: string; avatarId: AvatarId },
): Promise<CreatedStudent> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  const group = await requireActiveGroup(actor, groupId);
  const pattern = randomPicturePattern();
  const pictureSecretHash = await hashSecret(
    pictureSecretFromPattern(pattern),
  );
  const session = await mongoose.startSession();
  let created: UserDocument | null = null;

  try {
    created = await session.withTransaction(async () => {
      const [student] = await UserModel.create(
        [
          {
            role: 'eleve',
            displayName: values.displayName,
            avatarId: values.avatarId,
            pictureSecretHash,
          },
        ],
        { session },
      );

      if (student === undefined) {
        throw new Error('La création de l’élève a échoué.');
      }

      await GroupModel.updateOne(
        { _id: group._id },
        {
          $push: {
            members: {
              userId: student._id,
              roleInGroup: 'eleve',
              joinedAt: new Date(),
            },
          },
        },
        { session },
      );

      await AuditLogModel.create(
        [
          {
            actorId: actor._id,
            action: 'create_student',
            targetType: 'user',
            targetId: student._id,
          },
        ],
        { session },
      );

      return student;
    });
  } finally {
    await session.endSession();
  }

  if (created === null) {
    throw new Error('La création de l’élève a échoué.');
  }

  return {
    student: created,
    groups: [group],
    picturePassword: {
      pattern,
      labels: picturePasswordLabels(pattern),
    },
  };
}

export async function createStudentsBulk(
  actor: UserDocument,
  groupId: string,
  names: readonly string[],
): Promise<CreatedStudent[]> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  const group = await requireActiveGroup(actor, groupId);
  const prepared: Array<{
    displayName: string;
    avatarId: AvatarId;
    pattern: PicturePatternId[];
    pictureSecretHash: string;
    labels: string[];
  }> = [];

  for (const [index, name] of names.entries()) {
    const pattern = randomPicturePattern();
    prepared.push({
      displayName: name,
      avatarId: AVATAR_IDS[index % AVATAR_IDS.length] ?? 'renard',
      pattern,
      pictureSecretHash: await hashSecret(pictureSecretFromPattern(pattern)),
      labels: picturePasswordLabels(pattern),
    });
  }

  const session = await mongoose.startSession();
  let created: UserDocument[] = [];

  try {
    created = await session.withTransaction(async () => {
      const docs = await UserModel.create(
        prepared.map((item) => ({
          role: 'eleve',
          displayName: item.displayName,
          avatarId: item.avatarId,
          pictureSecretHash: item.pictureSecretHash,
        })),
        { session, ordered: true },
      );

      await GroupModel.updateOne(
        { _id: group._id },
        {
          $push: {
            members: {
              $each: docs.map((student) => ({
                userId: student._id,
                roleInGroup: 'eleve',
                joinedAt: new Date(),
              })),
            },
          },
        },
        { session },
      );

      await AuditLogModel.create(
        [
          {
            actorId: actor._id,
            action: 'bulk_create_students',
            targetType: 'group',
            targetId: group._id,
          },
        ],
        { session },
      );

      return docs;
    });
  } finally {
    await session.endSession();
  }

  return created.map((student, index) => {
    const item = prepared[index];

    if (item === undefined) {
      throw new Error('La création des élèves a échoué.');
    }

    return {
      student,
      groups: [group],
      picturePassword: {
        pattern: item.pattern,
        labels: item.labels,
      },
    };
  });
}

export async function moveStudentToGroup(
  actor: UserDocument,
  studentId: string,
  targetGroupId: string,
): Promise<StudentWithGroups> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  const target = await requireActiveGroup(actor, targetGroupId);
  const student = await requireStudent(studentId);
  const currentGroups = await groupsForStudent(studentId);

  if (actor.role !== 'admin') {
    if (!(await canManageStudent(actor, studentId))) {
      throw forbidden('Tu n’as pas accès à cet élève.');
    }

    if (currentGroups.some((group) => !userCanAccessGroup(actor, group))) {
      throw forbidden(
        'Cet élève appartient aussi à un groupe que tu ne gères pas.',
      );
    }
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await GroupModel.updateMany(
        { 'members.userId': student._id },
        { $pull: { members: { userId: student._id } } },
        { session },
      );
      await GroupModel.updateOne(
        { _id: target._id },
        {
          $push: {
            members: {
              userId: student._id,
              roleInGroup: 'eleve',
              joinedAt: new Date(),
            },
          },
        },
        { session },
      );
      await SessionModel.deleteMany({
        userId: student._id,
        kind: 'child',
      }).session(session);
      await AuditLogModel.create(
        [
          {
            actorId: actor._id,
            action: 'move_student',
            targetType: 'user',
            targetId: student._id,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return { student, groups: [target] };
}

function parentSummary(parent: UserDocument) {
  return {
    id: parent._id.toString(),
    displayName: parent.displayName,
    username: parent.username,
  };
}

export async function listParentsFor(
  actor: UserDocument,
  studentId: string,
): Promise<ReturnType<typeof parentSummary>[]> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  await getStudentFor(actor, studentId);
  const parents = await UserModel.find({
    role: 'parent',
    parentOf: new Types.ObjectId(studentId),
  });

  return parents
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'fr'))
    .map(parentSummary);
}

export async function linkParentToStudent(
  actor: UserDocument,
  studentId: string,
  username: string,
): Promise<ReturnType<typeof parentSummary>> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  await getStudentFor(actor, studentId);
  const parent = await UserModel.findOne({ username, role: 'parent' });

  if (
    parent === null ||
    (parent.disabledAt !== null && parent.disabledAt !== undefined)
  ) {
    throw notFound('Compte parent introuvable.');
  }

  const updated = await UserModel.updateOne(
    { _id: parent._id },
    { $addToSet: { parentOf: new Types.ObjectId(studentId) } },
  );

  if ((updated.modifiedCount ?? 0) > 0) {
    await AuditLogModel.create({
      actorId: actor._id,
      action: 'link_parent',
      targetType: 'user',
      targetId: new Types.ObjectId(studentId),
    });
  }

  return parentSummary(parent);
}

export async function unlinkParentFromStudent(
  actor: UserDocument,
  studentId: string,
  parentId: string,
): Promise<void> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  await getStudentFor(actor, studentId);

  if (!mongoose.Types.ObjectId.isValid(parentId)) {
    throw notFound('Compte parent introuvable.');
  }

  const parent = await UserModel.findOne({
    _id: new Types.ObjectId(parentId),
    role: 'parent',
  });

  if (parent === null) {
    throw notFound('Compte parent introuvable.');
  }

  const updated = await UserModel.updateOne(
    { _id: parent._id },
    { $pull: { parentOf: new Types.ObjectId(studentId) } },
  );

  if ((updated.modifiedCount ?? 0) > 0) {
    await AuditLogModel.create({
      actorId: actor._id,
      action: 'unlink_parent',
      targetType: 'user',
      targetId: new Types.ObjectId(studentId),
    });
  }
}

export function assertStudentName(
  student: UserDocument,
  confirmName: string,
): void {
  if (student.displayName !== confirmName) {
    throw new ApiError(
      400,
      'confirmation_mismatch',
      'Écris exactement le prénom de l’élève pour confirmer.',
    );
  }
}

