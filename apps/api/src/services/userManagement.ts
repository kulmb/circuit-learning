import mongoose, { Types } from 'mongoose';

import {
  AuditLogModel,
  SessionModel,
  UserModel,
  type AuditLogDocument,
  type UserDocument,
  type UserRole,
} from '../db/models/index.js';
import { ApiError, forbidden, notFound } from './errors.js';

export const ADMIN_ROLES = ['admin', 'encadrant', 'parent'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

function requireAdmin(actor: UserDocument): void {
  if (actor.role !== 'admin') {
    throw forbidden('Seul un administrateur peut faire cela.');
  }
}

export interface UserPage {
  users: UserDocument[];
  total: number;
  limit: number;
  offset: number;
}

export async function listUsers(options: {
  actor: UserDocument;
  role?: UserRole | undefined;
  limit: number;
  offset: number;
}): Promise<UserPage> {
  requireAdmin(options.actor);
  const filter = options.role === undefined ? {} : { role: options.role };
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ displayName: 1 })
      .skip(options.offset)
      .limit(options.limit),
    UserModel.countDocuments(filter),
  ]);

  return { users, total, limit: options.limit, offset: options.offset };
}

export async function getUser(
  actor: UserDocument,
  userId: string,
): Promise<UserDocument> {
  requireAdmin(actor);

  if (!Types.ObjectId.isValid(userId)) {
    throw notFound('Compte introuvable.');
  }

  const user = await UserModel.findById(userId);

  if (user === null) {
    throw notFound('Compte introuvable.');
  }

  return user;
}

async function activeAdminCountExcluding(
  userId: Types.ObjectId,
): Promise<number> {
  return UserModel.countDocuments({
    role: 'admin',
    disabledAt: null,
    _id: mongoose.trusted({ $ne: userId }),
  });
}

export async function setUserDisabled(options: {
  actor: UserDocument;
  userId: string;
  disabled: boolean;
}): Promise<UserDocument> {
  requireAdmin(options.actor);

  if (!Types.ObjectId.isValid(options.userId)) {
    throw notFound('Compte introuvable.');
  }

  const target = await UserModel.findById(options.userId);

  if (target === null) {
    throw notFound('Compte introuvable.');
  }

  if (target._id.equals(options.actor._id)) {
    throw new ApiError(
      400,
      'self_lockout',
      'Tu ne peux pas désactiver ton propre compte.',
    );
  }

  if (
    options.disabled &&
    target.role === 'admin' &&
    (await activeAdminCountExcluding(target._id)) === 0
  ) {
    throw new ApiError(
      409,
      'last_admin',
      'Il doit rester au moins un administrateur actif.',
    );
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      target.disabledAt = options.disabled ? new Date() : null;
      await target.save({ session });

      if (options.disabled) {
        await SessionModel.deleteMany({ userId: target._id }).session(session);
      }

      await AuditLogModel.create(
        [
          {
            actorId: options.actor._id,
            action: options.disabled ? 'disable_user' : 'enable_user',
            targetType: 'user',
            targetId: target._id,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return target;
}

export async function setUserRole(options: {
  actor: UserDocument;
  userId: string;
  role: AdminRole;
}): Promise<UserDocument> {
  requireAdmin(options.actor);

  if (!Types.ObjectId.isValid(options.userId)) {
    throw notFound('Compte introuvable.');
  }

  const target = await UserModel.findById(options.userId);

  if (target === null) {
    throw notFound('Compte introuvable.');
  }

  if (target._id.equals(options.actor._id)) {
    throw new ApiError(
      400,
      'self_role_change',
      'Tu ne peux pas changer ton propre rôle.',
    );
  }

  if (target.role === 'eleve') {
    throw new ApiError(
      400,
      'student_role_locked',
      'Le rôle d’un élève ne se modifie pas : il se gère depuis son groupe.',
    );
  }

  if (
    target.role === 'admin' &&
    options.role !== 'admin' &&
    (await activeAdminCountExcluding(target._id)) === 0
  ) {
    throw new ApiError(
      409,
      'last_admin',
      'Il doit rester au moins un administrateur actif.',
    );
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      target.role = options.role;
      await target.save({ session });
      await SessionModel.deleteMany({ userId: target._id }).session(session);
      await AuditLogModel.create(
        [
          {
            actorId: options.actor._id,
            action: 'change_user_role',
            targetType: 'user',
            targetId: target._id,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return target;
}

export interface AuditLogPage {
  logs: AuditLogDocument[];
  actorNames: Map<string, string>;
  total: number;
  limit: number;
  offset: number;
}

export async function listAuditLogs(options: {
  actor: UserDocument;
  limit: number;
  offset: number;
}): Promise<AuditLogPage> {
  requireAdmin(options.actor);
  const [logs, total] = await Promise.all([
    AuditLogModel.find({})
      .sort({ createdAt: -1 })
      .skip(options.offset)
      .limit(options.limit),
    AuditLogModel.countDocuments({}),
  ]);
  const actorIds = [...new Set(logs.map((log) => log.actorId.toString()))].map(
    (id) => new Types.ObjectId(id),
  );
  const actors =
    actorIds.length === 0
      ? []
      : await UserModel.find({
          _id: mongoose.trusted({ $in: actorIds }),
        });
  const actorNames = new Map(
    actors.map((actor) => [actor._id.toString(), actor.displayName]),
  );

  return {
    logs,
    actorNames,
    total,
    limit: options.limit,
    offset: options.offset,
  };
}
