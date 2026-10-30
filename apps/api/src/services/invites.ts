import mongoose, { Types } from 'mongoose';

import {
  AuditLogModel,
  InviteModel,
  SessionModel,
  UserModel,
  type InviteDocument,
  type InviteType,
  type SessionDocument,
  type UserDocument,
} from '../db/models/index.js';
import { canManageStudent, requireStudent } from '../auth/access.js';
import { ApiError, forbidden, notFound } from './errors.js';
import { hashSecret } from './secrets.js';
import { createSession } from './sessions.js';
import { generateToken, hashToken } from './tokens.js';

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * A password reset link is a direct account-takeover credential. Keep it much
 * shorter than a role invitation, which a person may open days later.
 */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export interface InviteWithToken {
  invite: InviteDocument;
  token: string;
}

export interface CreateRoleInviteOptions {
  actor: UserDocument;
  role: 'encadrant' | 'parent';
  username: string;
  displayName: string;
  childId?: string | undefined;
  publicOrigin: string;
}

interface NewInviteValues {
  tokenHash: string;
  type: InviteType;
  targetUserId?: Types.ObjectId | null;
  childId?: Types.ObjectId | null;
  username?: string | null;
  displayName?: string | null;
  createdBy?: Types.ObjectId | null;
  expiresAt: Date;
}

export function publicInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/invitation/${token}`;
}

async function assertUsernameAvailable(username: string): Promise<void> {
  const existing = await UserModel.exists({ username });

  if (existing !== null) {
    throw new ApiError(409, 'username_taken', 'Cet identifiant est déjà pris.');
  }

  const pending = await InviteModel.exists({
    username,
    usedAt: null,
    expiresAt: mongoose.trusted({ $gt: new Date() }),
  });

  if (pending !== null) {
    throw new ApiError(
      409,
      'username_taken',
      'Une invitation utilise déjà cet identifiant.',
    );
  }
}

async function newInvite(values: NewInviteValues): Promise<InviteDocument> {
  return (await InviteModel.create(values)) as InviteDocument;
}

export async function createRoleInvite(
  options: CreateRoleInviteOptions,
): Promise<InviteWithToken> {
  if (options.actor.role !== 'admin' && options.actor.role !== 'encadrant') {
    throw forbidden();
  }

  if (options.role === 'parent') {
    if (options.childId === undefined) {
      throw new ApiError(
        400,
        'validation_failed',
        'Une invitation parent doit viser un enfant.',
      );
    }

    await requireStudent(options.childId);

    if (!(await canManageStudent(options.actor, options.childId))) {
      throw forbidden('Tu n’as pas accès à cet élève.');
    }
  }

  await assertUsernameAvailable(options.username);

  const token = generateToken();
  const invite = await newInvite({
    tokenHash: hashToken(token),
    type: options.role,
    username: options.username,
    displayName: options.displayName,
    childId:
      options.childId === undefined
        ? null
        : new Types.ObjectId(options.childId),
    createdBy: options.actor._id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  await AuditLogModel.create({
    actorId: options.actor._id,
    action: 'create_invite',
    targetType: 'invite',
    targetId: invite._id,
  });

  return { invite, token };
}

export async function createPasswordResetInvite(options: {
  actor: UserDocument;
  username: string;
}): Promise<InviteWithToken> {
  if (options.actor.role !== 'admin') {
    throw forbidden(
      'Seul un administrateur peut créer un lien de mot de passe.',
    );
  }

  const target = await UserModel.findOne({ username: options.username });

  if (
    target === null ||
    target.role === 'eleve' ||
    (target.disabledAt !== null && target.disabledAt !== undefined)
  ) {
    throw notFound('Compte parent introuvable.');
  }

  const token = generateToken();
  const invite = await newInvite({
    tokenHash: hashToken(token),
    type: 'password_reset',
    targetUserId: target._id,
    createdBy: options.actor._id,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  await AuditLogModel.create({
    actorId: options.actor._id,
    action: 'create_password_reset',
    targetType: 'user',
    targetId: target._id,
  });

  return { invite, token };
}

async function findInviteByToken(
  token: string,
  session?: mongoose.ClientSession,
): Promise<InviteDocument | null> {
  const query = InviteModel.findOne({ tokenHash: hashToken(token) });

  if (session !== undefined) {
    query.session(session);
  }

  return query;
}

export interface InvitePreview {
  type: InviteType;
  role: 'encadrant' | 'parent' | null;
  displayName: string;
  username: string | null;
  childName: string | null;
  expiresAt: Date;
}

export async function previewInvite(
  token: string,
): Promise<InvitePreview> {
  const invite = await findInviteByToken(token);

  if (invite === null) {
    throw notFound('Cette invitation est introuvable.');
  }

  if (invite.usedAt !== null || invite.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      410,
      'invite_unusable',
      'Cette invitation n’est plus valable.',
    );
  }

  if (invite.type === 'password_reset') {
    const target =
      invite.targetUserId === null
        ? null
        : await UserModel.findById(invite.targetUserId);

    if (target === null) {
      throw new ApiError(
        410,
        'invite_unusable',
        'Cette invitation n’est plus valable.',
      );
    }

    return {
      type: invite.type,
      role: null,
      displayName: target.displayName,
      username: target.username,
      childName: null,
      expiresAt: invite.expiresAt,
    };
  }

  let childName: string | null = null;

  if (invite.childId !== null) {
    const child = await UserModel.findById(invite.childId);
    childName = child?.displayName ?? null;
  }

  return {
    type: invite.type,
    role: invite.type,
    displayName: invite.displayName ?? 'Compte',
    username: invite.username,
    childName,
    expiresAt: invite.expiresAt,
  };
}

export interface AcceptedInvite {
  user: UserDocument;
  session: SessionDocument;
  token: string;
}

async function claimInvite(
  invite: InviteDocument,
  session: mongoose.ClientSession,
): Promise<void> {
  const claimed = await InviteModel.findOneAndUpdate(
    { _id: invite._id, usedAt: null },
    { $set: { usedAt: new Date() } },
    { session },
  );

  if (claimed === null) {
    throw new ApiError(
      410,
      'invite_unusable',
      'Cette invitation n’est plus valable.',
    );
  }
}

export async function acceptInvite(options: {
  token: string;
  password: string;
  userAgent: string;
}): Promise<AcceptedInvite> {
  // Check the token before paying the argon2 cost: an unknown or expired
  // token must not be able to consume CPU on every request.
  const preview = await findInviteByToken(options.token);

  if (preview === null) {
    throw notFound('Cette invitation est introuvable.');
  }

  if (preview.usedAt !== null || preview.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      410,
      'invite_unusable',
      'Cette invitation n’est plus valable.',
    );
  }

  const passwordHash = await hashSecret(options.password);
  const session = await mongoose.startSession();
  let acceptedUser: UserDocument | null = null;

  try {
    acceptedUser = await session.withTransaction(async () => {
      const invite = await findInviteByToken(options.token, session);

      if (invite === null) {
        throw notFound('Cette invitation est introuvable.');
      }

      if (invite.usedAt !== null || invite.expiresAt.getTime() <= Date.now()) {
        throw new ApiError(
          410,
          'invite_unusable',
          'Cette invitation n’est plus valable.',
        );
      }

      await claimInvite(invite, session);

      if (invite.type === 'password_reset') {
        if (invite.targetUserId === null) {
          throw new ApiError(
            410,
            'invite_unusable',
            'Cette invitation n’est plus valable.',
          );
        }

        const target = await UserModel.findById(invite.targetUserId).session(
          session,
        );

        if (
          target === null ||
          target.role === 'eleve' ||
          (target.disabledAt !== null && target.disabledAt !== undefined)
        ) {
          throw new ApiError(
            410,
            'invite_unusable',
            'Cette invitation n’est plus valable.',
          );
        }

        target.passwordHash = passwordHash;
        target.failedLogins = 0;
        target.lockedUntil = null;
        await target.save({ session });

        await SessionModel.deleteMany({ userId: target._id }).session(session);

        await AuditLogModel.create(
          [
            {
              actorId: target._id,
              action: 'reset_password',
              targetType: 'user',
              targetId: target._id,
            },
          ],
          { session },
        );

        return target;
      }

      if (invite.username === null || invite.displayName === null) {
        throw new ApiError(
          410,
          'invite_unusable',
          'Cette invitation n’est plus valable.',
        );
      }

      const existing = await UserModel.exists({
        username: invite.username,
      }).session(session);

      if (existing !== null) {
        throw new ApiError(
          409,
          'username_taken',
          'Cet identifiant est déjà pris.',
        );
      }

      const [user] = await UserModel.create(
        [
          {
            role: invite.type,
            displayName: invite.displayName,
            username: invite.username,
            passwordHash,
            parentOf:
              invite.type === 'parent' && invite.childId !== null
                ? [invite.childId]
                : [],
          },
        ],
        { session },
      );

      if (user === undefined) {
        throw new Error('La création du compte a échoué.');
      }

      await AuditLogModel.create(
        [
          {
            actorId: user._id,
            action: 'accept_invite',
            targetType: 'user',
            targetId: user._id,
          },
        ],
        { session },
      );

      return user;
    });
  } finally {
    await session.endSession();
  }

  if (acceptedUser === null) {
    throw new Error('L’invitation n’a pas créé de compte.');
  }

  const created = await createSession({
    userId: acceptedUser._id,
    kind: 'adult',
    userAgent: options.userAgent,
    groupId: null,
  });

  return {
    user: acceptedUser,
    session: created.session,
    token: created.token,
  };
}
