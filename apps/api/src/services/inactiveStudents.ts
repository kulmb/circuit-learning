import mongoose from 'mongoose';

import {
  GroupModel,
  UserModel,
  type UserDocument,
} from '../db/models/index.js';
import { forbidden } from './errors.js';

export interface InactiveStudentRow {
  id: string;
  displayName: string;
  avatarId: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  lastActivityAt: string;
  groups: { id: string; name: string }[];
}

export interface InactiveStudentsReport {
  months: number;
  total: number;
  students: InactiveStudentRow[];
}

/**
 * Students whose last sign-in is older than the retention window. A student
 * who never signed in is measured from the account creation date. The admin
 * decides whether to delete; this service never deletes on its own.
 */
export async function listInactiveStudents(options: {
  actor: UserDocument;
  months: number;
  limit: number;
}): Promise<InactiveStudentsReport> {
  if (options.actor.role !== 'admin') {
    throw forbidden('Seul un administrateur peut voir cette liste.');
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - options.months);

  const filter = {
    role: 'eleve' as const,
    $or: [
      { lastSeenAt: mongoose.trusted({ $lt: cutoff }) },
      {
        lastSeenAt: null,
        createdAt: mongoose.trusted({ $lt: cutoff }),
      },
    ],
  };

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ lastSeenAt: 1, createdAt: 1 })
      .limit(options.limit),
    UserModel.countDocuments(filter),
  ]);

  const ids = users.map((user) => user._id);
  const idSet = new Set(ids.map((id) => id.toString()));
  const groups =
    ids.length === 0
      ? []
      : await GroupModel.find({
          'members.userId': mongoose.trusted({ $in: ids }),
        });

  const groupsByStudent = new Map<string, { id: string; name: string }[]>();

  for (const group of groups) {
    for (const member of group.members) {
      const key = member.userId.toString();

      if (!idSet.has(key)) {
        continue;
      }

      const list = groupsByStudent.get(key) ?? [];
      list.push({ id: group._id.toString(), name: group.name });
      groupsByStudent.set(key, list);
    }
  }

  const students = users
    .map((user) => {
      const lastActivityAt = user.lastSeenAt ?? user.createdAt;

      return {
        id: user._id.toString(),
        displayName: user.displayName,
        avatarId: user.avatarId ?? null,
        createdAt: user.createdAt.toISOString(),
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        lastActivityAt: lastActivityAt.toISOString(),
        groups: groupsByStudent.get(user._id.toString()) ?? [],
      };
    })
    .sort((left, right) =>
      left.lastActivityAt.localeCompare(right.lastActivityAt),
    );

  return {
    months: options.months,
    total,
    students,
  };
}
