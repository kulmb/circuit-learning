import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';

import { buildApp } from '../../src/app.js';
import {
  connectDatabase,
  disconnectDatabase,
} from '../../src/db/connection.js';
import {
  GroupModel,
  LevelProgressModel,
  UserModel,
} from '../../src/db/models/index.js';
import {
  hashSecret,
  pictureSecretFromPattern,
} from '../../src/services/secrets.js';
import {
  E2E_ACCOUNTS,
  E2E_ADULT_PASSWORD,
  E2E_CHILD_IDS,
  E2E_CHILD_NAMES,
  E2E_CHILD_PATTERN,
  E2E_GROUPS,
  E2E_IDS,
} from './fixtures.js';

const DATABASE_NAME = 'circuits_e2e';
const API_PORT = Number.parseInt(process.env['E2E_API_PORT'] ?? '3101', 10);
const PUBLIC_ORIGIN =
  process.env['E2E_PUBLIC_ORIGIN'] ?? 'http://127.0.0.1:4174';
const COOKIE_SECRET = 'circuits-de-zap-e2e-cookie-secret-0123456789';

function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

async function seed(): Promise<void> {
  const now = new Date();
  const [adultHash, pictureHash] = await Promise.all([
    hashSecret(E2E_ADULT_PASSWORD),
    hashSecret(pictureSecretFromPattern(E2E_CHILD_PATTERN)),
  ]);

  const teacherA = await UserModel.create({
    _id: objectId(E2E_IDS.teacherA),
    role: 'encadrant',
    displayName: E2E_ACCOUNTS.teacherA.displayName,
    username: E2E_ACCOUNTS.teacherA.username,
    passwordHash: adultHash,
    lastSeenAt: now,
  });
  const teacherB = await UserModel.create({
    _id: objectId(E2E_IDS.teacherB),
    role: 'encadrant',
    displayName: E2E_ACCOUNTS.teacherB.displayName,
    username: E2E_ACCOUNTS.teacherB.username,
    passwordHash: adultHash,
    lastSeenAt: now,
  });

  const lina = await UserModel.create({
    _id: objectId(E2E_IDS.lina),
    role: 'eleve',
    displayName: 'Lina',
    avatarId: 'renard',
    pictureSecretHash: pictureHash,
  });

  const parent = await UserModel.create({
    _id: objectId(E2E_IDS.parent),
    role: 'parent',
    displayName: E2E_ACCOUNTS.parent.displayName,
    username: E2E_ACCOUNTS.parent.username,
    passwordHash: adultHash,
    parentOf: [lina._id],
    lastSeenAt: now,
  });

  const children = [];
  for (let index = 0; index < E2E_CHILD_IDS.length; index += 1) {
    const id = E2E_CHILD_IDS[index];
    const name = E2E_CHILD_NAMES[index];

    if (id === undefined || name === undefined) {
      continue;
    }

    children.push(
      await UserModel.create({
        _id: objectId(id),
        role: 'eleve',
        displayName: name,
        avatarId: index % 2 === 0 ? 'panda' : 'fusee',
        pictureSecretHash: pictureHash,
      }),
    );
  }

  await GroupModel.create({
    _id: objectId(E2E_GROUPS.a.id),
    name: E2E_GROUPS.a.name,
    joinCode: E2E_GROUPS.a.joinCode,
    createdBy: teacherA._id,
    members: [
      {
        userId: teacherA._id,
        roleInGroup: 'encadrant',
        joinedAt: now,
      },
      {
        userId: lina._id,
        roleInGroup: 'eleve',
        joinedAt: now,
      },
      ...children.map((child) => ({
        userId: child._id,
        roleInGroup: 'eleve' as const,
        joinedAt: now,
      })),
    ],
  });

  await GroupModel.create({
    _id: objectId(E2E_GROUPS.b.id),
    name: E2E_GROUPS.b.name,
    joinCode: E2E_GROUPS.b.joinCode,
    createdBy: teacherB._id,
    members: [
      {
        userId: teacherB._id,
        roleInGroup: 'encadrant',
        joinedAt: now,
      },
    ],
  });

  // The parent screen shows two completed levels and five stars.
  await LevelProgressModel.create({
    userId: lina._id,
    levelId: 'light-01',
    status: 'completed',
    stars: 3,
    attempts: 2,
    hintsUsed: 0,
    bestTimeMs: 41_000,
    firstCompletedAt: new Date(now.getTime() - 86_400_000),
    lastPlayedAt: new Date(now.getTime() - 3_600_000),
  });
  await LevelProgressModel.create({
    userId: lina._id,
    levelId: 'light-02',
    status: 'completed',
    stars: 2,
    attempts: 1,
    hintsUsed: 1,
    bestTimeMs: 63_000,
    firstCompletedAt: new Date(now.getTime() - 43_200_000),
    lastPlayedAt: new Date(now.getTime() - 1_800_000),
  });

  const progressCount = await LevelProgressModel.countDocuments({
    userId: lina._id,
  });
  console.log(
    `E2E fixtures: ${String(children.length + 1)} children, ${String(progressCount)} progress rows, parent ${parent.username ?? ''}`,
  );
}

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '7.0.28' },
});

await connectDatabase(replSet.getUri(DATABASE_NAME));
await seed();

const app = buildApp({
  logger: false,
  cookieSecret: COOKIE_SECRET,
  secureCookies: false,
  publicOrigin: PUBLIC_ORIGIN,
  rateLimitMax: 1000,
  trustProxy: false,
});

await app.listen({ host: '127.0.0.1', port: API_PORT });
console.log(`E2E API ready on ${PUBLIC_ORIGIN} -> 127.0.0.1:${String(API_PORT)}`);

let closing = false;

async function shutdown(signal: string): Promise<void> {
  if (closing) {
    return;
  }

  closing = true;
  console.log(`E2E API stopping (${signal})`);
  await app.close().catch(() => undefined);
  await disconnectDatabase().catch(() => undefined);
  await mongoose.connection.close().catch(() => undefined);
  await replSet.stop().catch(() => undefined);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT').finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM').finally(() => process.exit(0));
});
