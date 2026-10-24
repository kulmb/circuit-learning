import { OBJECT_ID_PATTERN } from '@circuits/shared';
import { Types } from 'mongoose';

import {
  GroupModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../db/models/index.js';
import { notFound } from '../services/errors.js';

export async function canAccessGroup(
  user: UserDocument,
  groupId: string,
): Promise<boolean> {
  if (!OBJECT_ID_PATTERN.test(groupId)) {
    return false;
  }

  const group = await GroupModel.findById(groupId);

  return group !== null && userCanAccessGroup(user, group);
}

function userCanAccessGroup(
  user: UserDocument,
  group: GroupDocument,
): boolean {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'encadrant') {
    return (
      group.createdBy.equals(user._id) ||
      group.members.some(
        (member) =>
          member.roleInGroup === 'encadrant' &&
          member.userId.equals(user._id),
      )
    );
  }

  if (user.role === 'parent') {
    return group.members.some((member) =>
      user.parentOf.some((childId) => childId.equals(member.userId)),
    );
  }

  if (user.role === 'eleve') {
    return group.members.some((member) => member.userId.equals(user._id));
  }

  return false;
}

/** A teacher may only touch a student who belongs to one of their groups. */
export async function canManageStudent(
  user: UserDocument,
  studentId: string,
): Promise<boolean> {
  if (!OBJECT_ID_PATTERN.test(studentId)) {
    return false;
  }

  if (user.role === 'admin') {
    const student = await UserModel.exists({
      _id: new Types.ObjectId(studentId),
      role: 'eleve',
    });

    return student !== null;
  }

  if (user.role === 'parent') {
    return user.parentOf.some((childId) => childId.toString() === studentId);
  }

  if (user.role !== 'encadrant') {
    return false;
  }

  const groups = await GroupModel.find({ 'members.userId': studentId });

  return groups.some(
    (group) =>
      group.createdBy.equals(user._id) ||
      group.members.some(
        (member) =>
          member.roleInGroup === 'encadrant' &&
          member.userId.equals(user._id),
      ),
  );
}

export async function requireStudent(
  studentId: string,
): Promise<UserDocument> {
  if (!OBJECT_ID_PATTERN.test(studentId)) {
    throw notFound('Élève introuvable.');
  }

  const student = await UserModel.findOne({
    _id: new Types.ObjectId(studentId),
    role: 'eleve',
  });

  if (student === null) {
    throw notFound('Élève introuvable.');
  }

  return student;
}
