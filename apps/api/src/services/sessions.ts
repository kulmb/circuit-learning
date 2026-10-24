import mongoose, { Types } from 'mongoose';

import {
  SessionModel,
  UserModel,
  type SessionDocument,
  type SessionKind,
  type UserDocument,
} from '../db/models/index.js';
import { generateToken, hashToken } from './tokens.js';

export const ADULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHILD_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface CreateSessionOptions {
  userId: Types.ObjectId;
  kind: SessionKind;
  userAgent: string;
  groupId: Types.ObjectId | null;
}

export interface CreatedSession {
  token: string;
  session: SessionDocument;
}

export interface LoadedSession {
  session: SessionDocument;
  user: UserDocument;
  token: string;
}

export function sessionTtlMs(kind: SessionKind): number {
  return kind === 'adult' ? ADULT_SESSION_TTL_MS : CHILD_SESSION_TTL_MS;
}

export async function createSession(
  options: CreateSessionOptions,
): Promise<CreatedSession> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + sessionTtlMs(options.kind));

  const session = await SessionModel.create({
    userId: options.userId,
    tokenHash: hashToken(token),
    groupId: options.groupId,
    expiresAt,
    userAgent: options.userAgent.slice(0, 512),
    kind: options.kind,
  });

  return { token, session };
}

/**
 * Reads a session from its cookie token. Adult sessions slide: every visit
 * pushes the expiry back to thirty days. Child sessions keep the eight-hour
 * deadline they were created with, which matters on a shared tablet.
 */
export async function loadSession(
  token: string,
): Promise<LoadedSession | null> {
  if (token.length < 20 || token.length > 128) {
    return null;
  }

  const now = new Date();
  const session = await SessionModel.findOne({
    tokenHash: hashToken(token),
    expiresAt: mongoose.trusted({ $gt: now }),
  });

  if (session === null) {
    // Clean up an expired row immediately instead of waiting for the TTL
    // monitor, which only runs about once a minute.
    await SessionModel.deleteOne({ tokenHash: hashToken(token) });
    return null;
  }

  const user = await UserModel.findById(session.userId);

  if (
    user === null ||
    (user.disabledAt !== null && user.disabledAt !== undefined)
  ) {
    await SessionModel.deleteOne({ _id: session._id });
    return null;
  }

  if (session.kind === 'adult') {
    session.expiresAt = new Date(Date.now() + ADULT_SESSION_TTL_MS);
    await session.save();
  }

  return { session, user, token };
}

export async function deleteSession(token: string): Promise<void> {
  if (token.length < 20 || token.length > 128) {
    return;
  }

  await SessionModel.deleteOne({ tokenHash: hashToken(token) });
}
