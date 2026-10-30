import type {
  LoginThrottleDocument,
  UserDocument,
} from '../db/models/index.js';
import { LoginThrottleModel, UserModel } from '../db/models/index.js';
import { ApiError } from './errors.js';
import { verifySecret } from './secrets.js';
import { createSession, type CreatedSession } from './sessions.js';
import { normalizeUsername } from './username.js';

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
  /** Client address behind Caddy; part of the lockout key. */
  ip: string;
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

function tooManyAttempts(retryAfter: number): ApiError {
  return new ApiError(
    429,
    'too_many_attempts',
    'Trop de tentatives. Réessaie dans quelques minutes.',
    retryAfter,
  );
}

function throttleKey(username: string, ip: string): string {
  return `${username}:${ip}`;
}

function retryAfterOf(lockedUntil: Date): number {
  return Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
  );
}

async function readThrottle(
  username: string,
  ip: string,
): Promise<LoginThrottleDocument | null> {
  return LoginThrottleModel.findOne({
    key: throttleKey(username, ip),
  });
}

/**
 * Atomically increments the username+IP counter. The account document is not
 * touched: a wrong password from one address never locks the real user out
 * from another address.
 */
async function registerFailure(
  username: string,
  ip: string,
): Promise<{ locked: boolean; retryAfter: number }> {
  const now = new Date();
  const key = throttleKey(username, ip);
  const nextCount = { $add: [{ $ifNull: ['$failures', 0] }, 1] };
  const reachedLimit = { $gte: [nextCount, ADULT_MAX_FAILED_LOGINS] };
  const lockedUntil = new Date(now.getTime() + ADULT_LOCK_MS);

  const throttle = await LoginThrottleModel.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          username,
          ip,
          failures: { $cond: [reachedLimit, 0, nextCount] },
          lockedUntil: {
            $cond: [reachedLimit, lockedUntil, { $ifNull: ['$lockedUntil', null] }],
          },
          createdAt: { $ifNull: ['$createdAt', now] },
          updatedAt: now,
        },
      },
    ],
    {
      upsert: true,
      returnDocument: 'after',
      updatePipeline: true,
      setDefaultsOnInsert: true,
    },
  );

  if (
    throttle !== null &&
    throttle.lockedUntil !== null &&
    throttle.lockedUntil.getTime() > now.getTime()
  ) {
    return {
      locked: true,
      retryAfter: retryAfterOf(throttle.lockedUntil),
    };
  }

  return { locked: false, retryAfter: 0 };
}

export async function clearAdultLoginThrottle(
  username: string,
): Promise<void> {
  await LoginThrottleModel.deleteMany({ username: normalizeUsername(username) });
}

export async function loginAdult(
  options: AdultLoginOptions,
): Promise<AdultLoginResult> {
  const username = normalizeUsername(options.username);
  const throttle = await readThrottle(username, options.ip);

  if (
    throttle !== null &&
    throttle.lockedUntil !== null &&
    throttle.lockedUntil.getTime() > Date.now()
  ) {
    throw tooManyAttempts(retryAfterOf(throttle.lockedUntil));
  }

  const user = await UserModel.findOne({ username }).select('+passwordHash');

  if (
    user === null ||
    user.role === 'eleve' ||
    user.passwordHash === null ||
    user.passwordHash === undefined
  ) {
    await verifySecret(DUMMY_PASSWORD_HASH, options.password);
    const failure = await registerFailure(username, options.ip);

    if (failure.locked) {
      throw tooManyAttempts(failure.retryAfter);
    }

    throw invalidCredentials();
  }

  if (user.disabledAt !== null && user.disabledAt !== undefined) {
    await verifySecret(DUMMY_PASSWORD_HASH, options.password);
    const failure = await registerFailure(username, options.ip);

    if (failure.locked) {
      throw tooManyAttempts(failure.retryAfter);
    }

    throw invalidCredentials();
  }

  const valid = await verifySecret(user.passwordHash, options.password);

  if (!valid) {
    const failure = await registerFailure(username, options.ip);

    if (failure.locked) {
      throw tooManyAttempts(failure.retryAfter);
    }

    throw invalidCredentials();
  }

  await LoginThrottleModel.deleteOne({
    key: throttleKey(username, options.ip),
  });
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
