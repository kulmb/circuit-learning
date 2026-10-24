import mongoose from 'mongoose';

import {
  AuditLogModel,
  EMAIL_PATTERN,
  SessionModel,
  UserModel,
} from '../db/models/index.js';
import {
  hashSecret,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from './secrets.js';

export interface CreateAdminOptions {
  email: string;
  password: string;
  displayName?: string;
}

export interface CreateAdminResult {
  userId: string;
  created: boolean;
}

export interface ChangePasswordOptions {
  email: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  userId: string;
  sessionsRevoked: number;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validateEmail(email: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Adresse e-mail invalide.');
  }
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Le mot de passe ne peut pas dépasser ${MAX_PASSWORD_LENGTH} caractères.`,
    );
  }
}

/**
 * Creates the first administrator, or completes an existing admin account that
 * has no password yet. An existing password is never overwritten here: use
 * changeAccountPassword() for that.
 */
export async function createAdminAccount(
  options: CreateAdminOptions,
): Promise<CreateAdminResult> {
  const email = normalizeEmail(options.email);
  validateEmail(email);
  validatePassword(options.password);

  const displayName = options.displayName?.trim() || 'Administrateur';
  const existing = await UserModel.findOne({ email }).select('+passwordHash');

  if (existing !== null) {
    if (existing.role !== 'admin') {
      throw new Error(`Le compte ${email} existe déjà avec un autre rôle.`);
    }

    let changed = false;

    if (existing.passwordHash === null || existing.passwordHash === undefined) {
      existing.passwordHash = await hashSecret(options.password);
      changed = true;
    }

    if (options.displayName !== undefined && existing.displayName !== displayName) {
      existing.displayName = displayName;
      changed = true;
    }

    if (changed) {
      await existing.save();
    }

    return { userId: existing._id.toString(), created: false };
  }

  const user = await UserModel.create({
    role: 'admin',
    displayName,
    email,
    passwordHash: await hashSecret(options.password),
  });

  return { userId: user._id.toString(), created: true };
}

/**
 * Replaces an adult's password and signs every existing session out. Runs in a
 * transaction so a failure never leaves the password changed without the
 * session revocation and the audit entry.
 */
export async function changeAccountPassword(
  options: ChangePasswordOptions,
): Promise<ChangePasswordResult> {
  const email = normalizeEmail(options.email);
  validateEmail(email);
  validatePassword(options.newPassword);

  const passwordHash = await hashSecret(options.newPassword);
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const user = await UserModel.findOne({ email })
        .select('+passwordHash')
        .session(session);

      if (user === null) {
        throw new Error(`Aucun compte avec l’adresse ${email}.`);
      }

      if (user.role === 'eleve') {
        throw new Error(
          'Un élève utilise son mot de passe image, pas un mot de passe texte.',
        );
      }

      if (user.disabledAt !== null && user.disabledAt !== undefined) {
        throw new Error('Ce compte est désactivé.');
      }

      user.passwordHash = passwordHash;
      user.failedLogins = 0;
      user.lockedUntil = null;
      await user.save({ session });

      const sessions = await SessionModel.deleteMany({
        userId: user._id,
      }).session(session);

      await AuditLogModel.create(
        [
          {
            actorId: user._id,
            action: 'change_password',
            targetType: 'user',
            targetId: user._id,
          },
        ],
        { session },
      );

      return {
        userId: user._id.toString(),
        sessionsRevoked: sessions.deletedCount ?? 0,
      };
    });
  } finally {
    await session.endSession();
  }
}
