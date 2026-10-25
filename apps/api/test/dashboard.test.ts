import { PROGRESS_CONCEPTS } from '@circuits/shared';
import { ALL_LEVELS } from '@circuits/shared/levels';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/db/connection.js';
import {
  GroupModel,
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../src/db/models/index.js';
import { DASHBOARD_INDEXES } from '../src/services/dashboard.js';
import { hashSecret, pictureSecretFromPattern } from '../src/services/secrets.js';

const TEST_DB_NAME = 'circuits_dashboard_test';
const ADULT_PASSWORD = 'Correct-Horse-2026';
const COOKIE_SECRET = 'test-cookie-secret-0123456789abcdef';
const PUBLIC_ORIGIN = 'https://zap.test';
const STUDENT_PATTERN = ['renard', 'pomme', 'ballon'] as const;

let replSet: MongoMemoryReplSet;
let app: FastifyInstance;
let adultHash: string;
let pictureHash: string;
let group: GroupDocument;
let lina: UserDocument;
let noe: UserDocument;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.28' },
  });
  await connectDatabase(replSet.getUri(TEST_DB_NAME));
  [adultHash, pictureHash] = await Promise.all([
    hashSecret(ADULT_PASSWORD),
    hashSecret(pictureSecretFromPattern(STUDENT_PATTERN)),
  ]);
  app = buildApp({
    logger: false,
    cookieSecret: COOKIE_SECRET,
    secureCookies: false,
    publicOrigin: PUBLIC_ORIGIN,
    rateLimitMax: 1000,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await disconnectDatabase();
  await replSet.stop();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );

  await createAdult('admin', 'admin');
  const coach = await createAdult('encadrant', 'coach');
  await createAdult('encadrant', 'other');
  lina = await createStudent('Lina', 'renard', [
    'circuitFerme',
    'interrupteur',
    'conducteur',
    'isolant',
    'serie',
    'parallele',
    'courtCircuit',
    'moteur',
    'polarite',
    'tension',
    'courant',
    'resistance',
    'variateur',
    'puissance',
    'combinaison',
  ]);
  noe = await createStudent('Noé', 'panda', ['circuitFerme']);
  await createAdult('parent', 'parent', { parentOf: [lina._id] });

  group = await GroupModel.create({
    name: 'CE2 A',
    joinCode: 'ABC234',
    createdBy: coach._id,
    members: [
      {
        userId: coach._id,
        roleInGroup: 'encadrant',
        joinedAt: new Date(),
      },
      { userId: lina._id, roleInGroup: 'eleve', joinedAt: new Date() },
      { userId: noe._id, roleInGroup: 'eleve', joinedAt: new Date() },
    ],
  });

  const now = new Date();
  const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const latest = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const old = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  await LevelProgressModel.create([
    {
      userId: lina._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 3,
      attempts: 2,
      hintsUsed: 0,
      bestTimeMs: 5000,
      firstCompletedAt: recent,
      lastPlayedAt: recent,
    },
    {
      userId: noe._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 1,
      attempts: 4,
      hintsUsed: 3,
      bestTimeMs: 9000,
      firstCompletedAt: recent,
      lastPlayedAt: recent,
    },
    {
      userId: lina._id,
      levelId: 'light-02',
      status: 'unlocked',
      attempts: 1,
      hintsUsed: 2,
      lastPlayedAt: recent,
    },
  ]);

  await LevelAttemptModel.create([
    {
      userId: lina._id,
      groupId: group._id,
      levelId: 'light-01',
      startedAt: recent,
      endedAt: recent,
      success: true,
      hintsUsed: 0,
      durationMs: 5000,
      errorsDetected: ['open_circuit'],
    },
    {
      userId: lina._id,
      groupId: group._id,
      levelId: 'light-07',
      startedAt: latest,
      endedAt: latest,
      success: false,
      hintsUsed: 1,
      durationMs: 8000,
      errorsDetected: ['short_circuit'],
    },
    {
      userId: noe._id,
      groupId: group._id,
      levelId: 'light-07',
      startedAt: latest,
      endedAt: latest,
      success: false,
      hintsUsed: 2,
      durationMs: 7000,
      errorsDetected: ['short_circuit'],
    },
    {
      userId: lina._id,
      groupId: group._id,
      levelId: 'light-01',
      startedAt: old,
      endedAt: old,
      success: false,
      hintsUsed: 3,
      durationMs: 10000,
      errorsDetected: ['open_circuit'],
    },
  ]);

  await SandboxCircuitModel.create({
    userId: lina._id,
    clientId: 'sandbox-lina-dashboard',
    name: 'Ma lampe',
    data: { version: 1, components: [], wires: [] },
    thumbnail: 'data:image/png;base64,abc',
  });

});

async function createAdult(
  role: 'admin' | 'encadrant' | 'parent',
  username: string,
  extra: Record<string, unknown> = {},
): Promise<UserDocument> {
  return UserModel.create({
    role,
    displayName: username,
    username,
    passwordHash: adultHash,
    ...extra,
  });
}

async function createStudent(
  displayName: string,
  avatarId: string,
  vocabulary: string[],
): Promise<UserDocument> {
  return UserModel.create({
    role: 'eleve',
    displayName,
    avatarId,
    pictureSecretHash: pictureHash,
    vocabulary: vocabulary.map((wordId) => ({
      wordId,
      unlockedAt: new Date(),
    })),
  });
}

async function login(username: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: ADULT_PASSWORD },
  });
  expect(response.statusCode).toBe(200);

  return (
    response.cookies.find((cookie) => cookie.name === 'zap_session')?.value ??
    ''
  );
}

async function loginChild(): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/children/login',
    payload: {
      joinCode: group.joinCode,
      studentId: lina._id.toString(),
      pattern: STUDENT_PATTERN,
    },
  });
  expect(response.statusCode).toBe(200);

  return (
    response.cookies.find((cookie) => cookie.name === 'zap_session')?.value ??
    ''
  );
}

async function get(
  url: string,
  cookie: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'GET',
    url,
    headers: { cookie: `zap_session=${cookie}` },
  });
}

describe('group dashboard', () => {
  it('aggregates progress, difficulties and active students', async () => {
    const coach = await login('coach');
    const response = await get(
      `/api/groups/${group._id.toString()}/dashboard`,
      coach,
    );

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.group).toMatchObject({ name: 'CE2 A', joinCode: 'ABC234' });
    expect(body.totalStudents).toBe(2);
    expect(body.activeStudents).toBe(2);
    expect(body.students).toHaveLength(2);
    expect(body.students[0].levels).toHaveLength(ALL_LEVELS.length);

    const level1 = body.levels.find(
      (entry: { levelId: string }) => entry.levelId === 'light-01',
    );
    expect(level1).toMatchObject({
      totalStudents: 2,
      completed: 2,
      started: 2,
      completionRate: 1,
      averageAttempts: 3,
      averageHints: 1.5,
    });

    const level2 = body.levels.find(
      (entry: { levelId: string }) => entry.levelId === 'light-02',
    );
    expect(level2).toMatchObject({
      completed: 0,
      started: 1,
      completionRate: 0,
      averageAttempts: 1,
      averageHints: 2,
    });

    expect(body.difficulties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          levelId: 'light-07',
          code: 'short_circuit',
          students: 2,
          attempts: 2,
        }),
        expect.objectContaining({
          levelId: 'light-01',
          code: 'open_circuit',
          students: 1,
          attempts: 2,
        }),
      ]),
    );
  });

  it('limits the group dashboard to its teachers and admins', async () => {
    const other = await login('other');
    const parent = await login('parent');
    const child = await loginChild();
    const url = `/api/groups/${group._id.toString()}/dashboard`;

    expect((await get(url, other)).statusCode).toBe(403);
    expect((await get(url, parent)).statusCode).toBe(403);
    expect((await get(url, child)).statusCode).toBe(403);
  });
});

describe('student dashboard', () => {
  it('returns the timeline, concepts and sandbox thumbnails', async () => {
    const parent = await login('parent');
    const response = await get(
      `/api/students/${lina._id.toString()}/dashboard`,
      parent,
    );

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.timeline[0]).toMatchObject({
      levelId: 'light-07',
      success: false,
      hintsUsed: 1,
      errorsDetected: ['short_circuit'],
    });
    expect(body.timeline).toHaveLength(3);
    expect(body.concepts).toHaveLength(PROGRESS_CONCEPTS.length);
    expect(body.concepts.every((concept: { mastered: boolean }) => concept.mastered))
      .toBe(true);
    expect(body.sandbox).toEqual([
      expect.objectContaining({
        id: 'sandbox-lina-dashboard',
        name: 'Ma lampe',
        thumbnail: 'data:image/png;base64,abc',
      }),
    ]);
  });

  it('keeps each parent and teacher inside their own children', async () => {
    const other = await login('other');
    const coach = await login('coach');
    const parent = await login('parent');
    const child = await loginChild();
    const linaUrl = `/api/students/${lina._id.toString()}/dashboard`;
    const noeUrl = `/api/students/${noe._id.toString()}/dashboard`;

    expect((await get(linaUrl, coach)).statusCode).toBe(200);
    expect((await get(linaUrl, parent)).statusCode).toBe(200);
    expect((await get(noeUrl, parent)).statusCode).toBe(403);
    expect((await get(linaUrl, other)).statusCode).toBe(403);
    expect((await get(linaUrl, child)).statusCode).toBe(403);
  });
});

describe('dashboard indexes', () => {
  it('uses the declared indexes in the aggregation plans', async () => {
    const groupId = group._id;
    const userIds = [lina._id, noe._id];
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const plans = await Promise.all([
      LevelProgressModel.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', levels: { $push: '$levelId' } } },
        { $project: { levels: 1 } },
      ])
        .hint(DASHBOARD_INDEXES.progress)
        .explain('executionStats'),
      LevelAttemptModel.aggregate([
        { $match: { groupId, startedAt: { $gte: since } } },
        { $group: { _id: '$userId' } },
      ])
        .hint(DASHBOARD_INDEXES.attemptsByGroup)
        .explain('executionStats'),
      LevelAttemptModel.aggregate([
        { $match: { userId: lina._id } },
        { $sort: { startedAt: -1 } },
        { $limit: 25 },
      ])
        .hint(DASHBOARD_INDEXES.attemptsByUser)
        .explain('executionStats'),
      SandboxCircuitModel.aggregate([
        { $match: { userId: lina._id } },
        { $sort: { updatedAt: -1 } },
      ])
        .hint(DASHBOARD_INDEXES.sandbox)
        .explain('executionStats'),
    ]);

    const serialized = JSON.stringify(plans);
    expect(serialized).toContain('IXSCAN');
    expect(serialized).toContain(DASHBOARD_INDEXES.progress);
    expect(serialized).toContain(DASHBOARD_INDEXES.attemptsByGroup);
    expect(serialized).toContain(DASHBOARD_INDEXES.attemptsByUser);
    expect(serialized).toContain(DASHBOARD_INDEXES.sandbox);
  });
});
