import {
  CHAPTER_1_LEVELS,
  getLevelById,
  initialPlayerProgress,
  starsForHints,
  type LevelDefinition,
  type PlayerProgress,
  type PlayerProgressResponse,
} from '@circuits/shared';
import mongoose, { Types } from 'mongoose';

import {
  LevelAttemptModel,
  LevelProgressModel,
  UserModel,
  type LevelAttemptDocument,
  type UserDocument,
} from '../db/models/index.js';
import { ApiError, notFound } from './errors.js';

export interface FinishPayload {
  success: boolean;
  hintsUsed: number;
  durationMs: number;
  errorsDetected: string[];
}

function levelStatus(
  progress: PlayerProgress,
  levelId: string,
): PlayerProgress['levels'][string]['status'] {
  return progress.levels[levelId]?.status ?? 'locked';
}

export async function buildPlayerProgress(
  userId: Types.ObjectId,
): Promise<PlayerProgress> {
  const [user, rows] = await Promise.all([
    UserModel.findById(userId).select('vocabulary'),
    LevelProgressModel.find({ userId }),
  ]);

  if (user === null) {
    throw notFound('Compte introuvable.');
  }

  const progress = initialPlayerProgress();

  for (const row of rows) {
    if (progress.levels[row.levelId] !== undefined) {
      progress.levels[row.levelId] = {
        levelId: row.levelId,
        status: row.status,
        stars: row.stars,
        attempts: row.attempts,
        hintsUsed: row.hintsUsed,
        bestTimeMs: row.bestTimeMs,
        firstCompletedAt: row.firstCompletedAt?.getTime() ?? null,
        lastPlayedAt: row.lastPlayedAt?.getTime() ?? null,
      };
    }
  }

  return {
    levels: progress.levels,
    vocabulary: [
      ...new Set((user.vocabulary ?? []).map((entry) => entry.wordId)),
    ],
  };
}

export function toProgressResponse(
  progress: PlayerProgress,
): PlayerProgressResponse {
  return {
    levels: CHAPTER_1_LEVELS.flatMap((level) => {
      const entry = progress.levels[level.id];

      return entry === undefined
        ? []
        : [
            {
              levelId: entry.levelId,
              status: entry.status,
              stars: entry.stars,
              attempts: entry.attempts,
              hintsUsed: entry.hintsUsed,
              bestTimeMs: entry.bestTimeMs,
              firstCompletedAt: entry.firstCompletedAt,
              lastPlayedAt: entry.lastPlayedAt,
            },
          ];
    }),
    vocabulary: [...progress.vocabulary],
  };
}

async function assertLevelUnlocked(
  userId: Types.ObjectId,
  levelId: string,
): Promise<LevelDefinition> {
  const level = getLevelById(levelId);

  if (level === undefined) {
    throw notFound('Ce niveau n’existe pas.');
  }

  const row = await LevelProgressModel.findOne({ userId, levelId });
  const progress = initialPlayerProgress();
  const status = row?.status ?? levelStatus(progress, levelId);

  if (status === 'locked') {
    throw new ApiError(
      403,
      'level_locked',
      'Ce niveau est encore verrouillé.',
    );
  }

  return level;
}

export async function startLevelAttempt(options: {
  userId: Types.ObjectId;
  groupId: Types.ObjectId | null;
  levelId: string;
  attemptId: string | undefined;
}): Promise<LevelAttemptDocument> {
  await assertLevelUnlocked(options.userId, options.levelId);

  const clientId =
    options.attemptId ?? new Types.ObjectId().toString();
  const now = new Date();

  const attempt = await LevelAttemptModel.findOneAndUpdate(
    { userId: options.userId, clientId },
    {
      $setOnInsert: {
        groupId: options.groupId,
        levelId: options.levelId,
        startedAt: now,
        endedAt: null,
        success: false,
        hintsUsed: 0,
        durationMs: 0,
        errorsDetected: [],
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  );

  if (attempt === null) {
    throw new Error('La tentative n’a pas pu être créée.');
  }

  if (attempt.levelId !== options.levelId) {
    throw new ApiError(
      409,
      'attempt_conflict',
      'Cet identifiant de tentative est déjà utilisé.',
    );
  }

  return attempt;
}

async function unlockNextLevel(
  userId: Types.ObjectId,
  level: LevelDefinition,
  session: mongoose.ClientSession,
): Promise<void> {
  if (level.nextLevelId === null) {
    return;
  }

  await LevelProgressModel.updateOne(
    { userId, levelId: level.nextLevelId },
    {
      $setOnInsert: {
        status: 'unlocked',
        stars: 0,
        attempts: 0,
        hintsUsed: 0,
        bestTimeMs: null,
        firstCompletedAt: null,
        lastPlayedAt: null,
      },
    },
    { upsert: true, session },
  );
  await LevelProgressModel.updateOne(
    { userId, levelId: level.nextLevelId, status: 'locked' },
    { $set: { status: 'unlocked' } },
    { session },
  );
}

async function addVocabulary(
  userId: Types.ObjectId,
  wordIds: readonly string[],
  now: Date,
  session: mongoose.ClientSession,
): Promise<void> {
  if (wordIds.length === 0) {
    return;
  }

  const user = await UserModel.findById(userId)
    .select('vocabulary')
    .session(session);

  if (user === null) {
    return;
  }

  const known = new Set(
    (user.vocabulary ?? []).map((entry) => entry.wordId),
  );
  const missing = [...new Set(wordIds)].filter((wordId) => !known.has(wordId));

  if (missing.length === 0) {
    return;
  }

  await UserModel.updateOne(
    { _id: userId },
    {
      $push: {
        vocabulary: {
          $each: missing.map((wordId) => ({ wordId, unlockedAt: now })),
        },
      },
    },
    { session },
  );
}

async function applySuccess(
  userId: Types.ObjectId,
  levelId: string,
  hintsUsed: number,
  durationMs: number,
  now: Date,
  session: mongoose.ClientSession,
): Promise<void> {
  const stars = starsForHints(hintsUsed);

  await LevelProgressModel.updateOne(
    { userId, levelId },
    [
      {
        $set: {
          status: 'completed',
          stars: { $max: ['$stars', stars] },
          hintsUsed: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              { $min: [{ $ifNull: ['$hintsUsed', hintsUsed] }, hintsUsed] },
              hintsUsed,
            ],
          },
          bestTimeMs: {
            $min: [{ $ifNull: ['$bestTimeMs', durationMs] }, durationMs],
          },
          firstCompletedAt: { $ifNull: ['$firstCompletedAt', now] },
        },
      },
    ],
    { session, updatePipeline: true },
  );
}

async function finishTransaction(options: {
  attempt: LevelAttemptDocument;
  level: LevelDefinition;
  payload: FinishPayload;
  now: Date;
}): Promise<boolean> {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const claimed = await LevelAttemptModel.findOneAndUpdate(
        {
          _id: options.attempt._id,
          userId: options.attempt.userId,
          endedAt: null,
        },
        {
          $set: {
            endedAt: options.now,
            success: options.payload.success,
            hintsUsed: options.payload.hintsUsed,
            durationMs: options.payload.durationMs,
            errorsDetected: options.payload.errorsDetected,
          },
        },
        { session },
      );

      if (claimed === null) {
        return false;
      }

      await LevelProgressModel.updateOne(
        { userId: options.attempt.userId, levelId: options.level.id },
        {
          $inc: { attempts: 1 },
          $set: { lastPlayedAt: options.now },
          $setOnInsert: {
            status: 'unlocked',
            stars: 0,
            hintsUsed: 0,
            bestTimeMs: null,
            firstCompletedAt: null,
          },
        },
        { upsert: true, session },
      );

      if (options.payload.success) {
        await applySuccess(
          options.attempt.userId,
          options.level.id,
          options.payload.hintsUsed,
          options.payload.durationMs,
          options.now,
          session,
        );
        await unlockNextLevel(options.attempt.userId, options.level, session);
        await addVocabulary(
          options.attempt.userId,
          options.level.vocabularyIds,
          options.now,
          session,
        );
      }

      return true;
    });
  } finally {
    await session.endSession();
  }
}

export async function finishLevelAttempt(options: {
  userId: Types.ObjectId;
  attemptId: string;
  payload: FinishPayload;
}): Promise<PlayerProgress> {
  const attempt = await LevelAttemptModel.findOne({
    userId: options.userId,
    clientId: options.attemptId,
  });

  if (attempt === null) {
    throw notFound('Tentative introuvable.');
  }

  if (attempt.endedAt !== null) {
    return buildPlayerProgress(options.userId);
  }

  const level = getLevelById(attempt.levelId);

  if (level === undefined) {
    throw new ApiError(
      400,
      'unknown_level',
      'Ce niveau n’existe pas.',
    );
  }

  const payload: FinishPayload = {
    success: options.payload.success,
    hintsUsed: Math.min(999, Math.max(0, Math.round(options.payload.hintsUsed))),
    durationMs: Math.min(
      24 * 60 * 60 * 1000,
      Math.max(0, Math.round(options.payload.durationMs)),
    ),
    errorsDetected: [
      ...new Set(
        options.payload.errorsDetected
          .map((code) => code.trim())
          .filter((code) => code.length > 0),
      ),
    ],
  };

  await finishTransaction({
    attempt,
    level,
    payload,
    now: new Date(),
  });

  return buildPlayerProgress(options.userId);
}

export async function progressForUser(
  user: UserDocument,
): Promise<PlayerProgressResponse> {
  return toProgressResponse(await buildPlayerProgress(user._id));
}
