import type { UserDocument } from '../db/models/index.js';
import { UserModel } from '../db/models/index.js';
import { ApiError } from './errors.js';
import { verifySecret } from './secrets.js';
import { createSession, type CreatedSession } from './sessions.js';

export const ADULT_MAX_FAILED_LOGINS = 8;
export const ADULT_LOCK_MS = 15 * 60 * 1000;

/**
 * A fixed argon2id hash. Verifying it when the account does not exist keeps
 * the response time of a failed login roughly constant.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Y/0B4bGtSXm9f0a2Evh1+w$LVQ0uxIFRi/QnllYPyoBb9jH7tb12aIK61e/Ns5dmFU';

export interface AdultLoginOptions {
  username: string;
  password: string;
  userAgent: string;
}

export interface AdultLoginResult {
  user: UserDocument;
  created: CreatedSession;
}

function invalidCredentials(): ApiError {
  return new ApiError(
    401,
    'invalid_credentials',
    'Identifiant ou mot de passe incorrect.',
  );
}

function accountLocked(): ApiError {
  return new ApiError(
    423,
    'account_locked',
    'Ce compte est bloqué pendant quelques minutes. Réessaie plus tard.',
  );
}

export async function loginAdult(
  options: AdultLoginOptions,
): Promise<AdultLoginResult> {
  const user = await UserModel.findOne({ username: options.username }).select(
    '+passwordHash',
  );

  if (
    user === null ||
    user.role === 'eleve' ||
    user.passwordHash === null ||
    user.passwordHash === undefined
  ) {
    await verifySecret(DUMMY_PASSWORD_HASH, options.password);
    throw invalidCredentials();
  }

  if (user.disabledAt !== null && user.disabledAt !== undefined) {
    await verifySecret(DUMMY_PASSWORD_HASH, options.password);
    throw invalidCredentials();
  }

  if (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now()) {
    throw accountLocked();
  }

  const valid = await verifySecret(user.passwordHash, options.password);

  if (!valid) {
    user.failedLogins += 1;

    if (user.failedLogins >= ADULT_MAX_FAILED_LOGINS) {
      user.failedLogins = 0;
      user.lockedUntil = new Date(Date.now() + ADULT_LOCK_MS);
      await user.save();
      throw accountLocked();
    }

    await user.save();
    throw invalidCredentials();
  }

  user.failedLogins = 0;
  user.lockedUntil = null;
  user.lastSeenAt = new Date();
  await user.save();

  const created = await createSession({
    userId: user._id,
    kind: 'adult',
    userAgent: options.userAgent,
    groupId: null,
  });

  return { user, created };
}
