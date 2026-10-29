import { serializeCircuit } from '@circuits/shared';
import {
  ALL_LEVELS,
  CHAPTER_1_LEVELS,
  type LevelDefinition,
} from '@circuits/shared/levels';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
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
import {
  MAX_ATTEMPTS_PER_DAY,
} from '../src/services/progress.js';
import {
  MAX_SANDBOX_CIRCUITS,
} from '../src/services/sandbox.js';
import {
  hashSecret,
  pictureSecretFromPattern,
} from '../src/services/secrets.js';

const TEST_DB_NAME = 'circuits_progress_test';
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
let linaCookie: string;
let noeCookie: string;

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
    logger: process.env['DEBUG_API'] === '1',
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

  lina = await UserModel.create({
    role: 'eleve',
    displayName: 'Lina',
    avatarId: 'renard',
    pictureSecretHash: pictureHash,
  });
  noe = await UserModel.create({
    role: 'eleve',
    displayName: 'Noé',
    avatarId: 'panda',
    pictureSecretHash: pictureHash,
  });
  group = await GroupModel.create({
    name: 'CE2 A',
    joinCode: 'ABC234',
    createdBy: new Types.ObjectId(),
    members: [
      {
        userId: lina._id,
        roleInGroup: 'eleve',
        joinedAt: new Date(),
      },
      {
        userId: noe._id,
        roleInGroup: 'eleve',
        joinedAt: new Date(),
      },
    ],
  });

  linaCookie = await loginChild(lina);
  noeCookie = await loginChild(noe);
});

async function loginChild(student: UserDocument): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/children/login',
    payload: {
      joinCode: group.joinCode,
      studentId: student._id.toString(),
      pattern: STUDENT_PATTERN,
    },
  });
  expect(response.statusCode).toBe(200);

  return response.cookies.find((cookie) => cookie.name === 'zap_session')
    ?.value ?? '';
}

async function get(url: string, cookie: string): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'GET',
    url,
    headers: { cookie: `zap_session=${cookie}` },
  });
}

async function start(
  cookie: string,
  levelId: string,
  attemptId?: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: '/api/me/attempts/start',
    headers: { cookie: `zap_session=${cookie}` },
    payload:
      attemptId === undefined ? { levelId } : { levelId, attemptId },
  });
}

async function finish(
  cookie: string,
  attemptId: string,
  result: {
    success: boolean;
    hintsUsed: number;
    durationMs: number;
    errorsDetected: string[];
  },
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: `/api/me/attempts/${attemptId}/finish`,
    headers: { cookie: `zap_session=${cookie}` },
    payload: result,
  });
}

function level(number: number): LevelDefinition {
  const definition = CHAPTER_1_LEVELS[number - 1];

  if (definition === undefined) {
    throw new Error(`Missing level ${number}`);
  }

  return definition;
}

describe('progress API', () => {
  it('starts with only the first level unlocked', async () => {
    const response = await get('/api/me/progress', linaCookie);

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.levels).toHaveLength(ALL_LEVELS.length);
    expect(body.levels[0]).toMatchObject({
      levelId: level(1).id,
      status: 'unlocked',
      stars: 0,
      attempts: 0,
    });
    expect(body.levels[1].status).toBe('locked');
    expect(
      body.levels.find(
        (entry: { levelId: string }) => entry.levelId === 'current-01',
      )?.status,
    ).toBe('locked');
    expect(body.vocabulary).toEqual([]);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('unlocks chapter 2 for an account that finished chapter 1 before it existed', async () => {
    await LevelProgressModel.create({
      userId: lina._id,
      levelId: 'light-10',
      status: 'completed',
      stars: 3,
      attempts: 1,
      hintsUsed: 0,
      bestTimeMs: 1000,
      firstCompletedAt: new Date(),
      lastPlayedAt: new Date(),
    });

    const response = await start(linaCookie, 'current-01');

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ levelId: 'current-01' });
  });

  it('refuses locked and unknown levels', async () => {
    const locked = await start(linaCookie, level(2).id);
    expect(locked.statusCode).toBe(403);
    expect(locked.json().error.code).toBe('level_locked');

    const unknown = await start(linaCookie, 'light-99');
    expect(unknown.statusCode).toBe(404);
  });

  it('unlocks the next level and vocabulary after a success', async () => {
    const started = await start(linaCookie, level(1).id, 'attempt-lina-0001');
    expect(started.statusCode).toBe(201);
    expect(started.json()).toMatchObject({
      attemptId: 'attempt-lina-0001',
      levelId: level(1).id,
    });

    const finished = await finish(linaCookie, 'attempt-lina-0001', {
      success: true,
      hintsUsed: 0,
      durationMs: 5000,
      errorsDetected: ['open_circuit', 'open_circuit'],
    });
    expect(finished.statusCode).toBe(200);

    const progress = finished.json().progress;
    const first = progress.levels.find(
      (entry: { levelId: string }) => entry.levelId === level(1).id,
    );
    expect(first).toMatchObject({
      status: 'completed',
      stars: 3,
      attempts: 1,
      hintsUsed: 0,
      bestTimeMs: 5000,
    });
    expect(first.firstCompletedAt).toEqual(expect.any(Number));
    expect(progress.levels[1].status).toBe('unlocked');
    expect(progress.vocabulary).toEqual(
      expect.arrayContaining(level(1).vocabularyIds),
    );

    const attempt = await LevelAttemptModel.findOne({
      clientId: 'attempt-lina-0001',
    });
    expect(attempt).toMatchObject({
      userId: lina._id,
      groupId: group._id,
      levelId: level(1).id,
      success: true,
      hintsUsed: 0,
      durationMs: 5000,
      errorsDetected: ['open_circuit'],
    });
    expect(attempt?.endedAt).toBeInstanceOf(Date);
  });

  it('is idempotent when the same attempt is finished twice', async () => {
    await start(linaCookie, level(1).id, 'attempt-lina-0002');
    const first = await finish(linaCookie, 'attempt-lina-0002', {
      success: true,
      hintsUsed: 0,
      durationMs: 4000,
      errorsDetected: [],
    });
    expect(first.statusCode).toBe(200);

    const second = await finish(linaCookie, 'attempt-lina-0002', {
      success: false,
      hintsUsed: 8,
      durationMs: 9000,
      errorsDetected: ['short_circuit'],
    });
    expect(second.statusCode).toBe(200);

    const row = await LevelProgressModel.findOne({
      userId: lina._id,
      levelId: level(1).id,
    });
    expect(row?.attempts).toBe(1);
    expect(row?.stars).toBe(3);
    expect(row?.bestTimeMs).toBe(4000);
    expect(
      (await LevelAttemptModel.findOne({ clientId: 'attempt-lina-0002' }))
        ?.errorsDetected,
    ).toEqual([]);
  });

  it('keeps the best stars and time while counting attempts', async () => {
    await start(linaCookie, level(1).id, 'attempt-lina-0003');
    const first = await finish(linaCookie, 'attempt-lina-0003', {
      success: true,
      hintsUsed: 0,
      durationMs: 6000,
      errorsDetected: [],
    });
    const firstCompletedAt = first.json().progress.levels[0].firstCompletedAt;

    await start(linaCookie, level(1).id, 'attempt-lina-0004');
    const second = await finish(linaCookie, 'attempt-lina-0004', {
      success: true,
      hintsUsed: 3,
      durationMs: 3000,
      errorsDetected: [],
    });

    const row = second.json().progress.levels[0];
    expect(row).toMatchObject({
      status: 'completed',
      stars: 3,
      attempts: 2,
      hintsUsed: 0,
      bestTimeMs: 3000,
      firstCompletedAt,
    });
  });

  it('computes stars on the server from the hint count', async () => {
    await start(noeCookie, level(1).id, 'attempt-noe-0001');
    const finished = await finish(noeCookie, 'attempt-noe-0001', {
      success: true,
      hintsUsed: 3,
      durationMs: 12000,
      errorsDetected: [],
    });

    expect(finished.json().progress.levels[0]).toMatchObject({
      status: 'completed',
      stars: 1,
      hintsUsed: 3,
    });
  });

  it('records a failed attempt without unlocking anything', async () => {
    await start(linaCookie, level(1).id, 'attempt-lina-0005');
    await finish(linaCookie, 'attempt-lina-0005', {
      success: true,
      hintsUsed: 0,
      durationMs: 2000,
      errorsDetected: [],
    });
    await start(linaCookie, level(2).id, 'attempt-lina-0006');
    const failed = await finish(linaCookie, 'attempt-lina-0006', {
      success: false,
      hintsUsed: 2,
      durationMs: 8000,
      errorsDetected: ['bulb_off'],
    });

    const second = failed.json().progress.levels[1];
    expect(second).toMatchObject({
      levelId: level(2).id,
      status: 'unlocked',
      stars: 0,
      attempts: 1,
      hintsUsed: 0,
    });
    expect(failed.json().progress.levels[2].status).toBe('locked');
    expect(failed.json().progress.vocabulary).toEqual(
      expect.arrayContaining(level(1).vocabularyIds),
    );
    expect(failed.json().progress.vocabulary).not.toContain(
      'circuitOuvert',
    );
  });

  it('makes start idempotent for a retried client id', async () => {
    const first = await start(linaCookie, level(1).id, 'attempt-retry-0001');
    const second = await start(linaCookie, level(1).id, 'attempt-retry-0001');

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().attemptId).toBe('attempt-retry-0001');
    expect(
      await LevelAttemptModel.countDocuments({
        userId: lina._id,
        clientId: 'attempt-retry-0001',
      }),
    ).toBe(1);
  });

  it('never lets a child finish another child’s attempt', async () => {
    await start(linaCookie, level(1).id, 'attempt-lina-0007');

    const response = await finish(noeCookie, 'attempt-lina-0007', {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });
    expect(response.statusCode).toBe(404);

    const unknown = await finish(noeCookie, 'attempt-does-not-exist', {
      success: true,
      hintsUsed: 0,
      durationMs: 1000,
      errorsDetected: [],
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('rejects adults and anonymous callers', async () => {
    const parent = await UserModel.create({
      role: 'parent',
      displayName: 'Parent',
      username: 'parent',
      passwordHash: adultHash,
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'parent', password: ADULT_PASSWORD },
    });
    const cookie =
      login.cookies.find((item) => item.name === 'zap_session')?.value ?? '';
    expect(parent.role).toBe('parent');
    expect((await get('/api/me/progress', cookie)).statusCode).toBe(403);

    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/me/progress',
    });
    expect(anonymous.statusCode).toBe(401);
  });
});

describe('sandbox API', () => {
  const document = serializeCircuit({ components: [], wires: [] });

  it('saves, updates and lists a child’s circuits', async () => {
    const saved = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/sandbox-lina-1',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: {
        name: '  Mon circuit  ',
        data: document,
        thumbnail: 'data:image/png;base64,abc',
      },
    });

    expect(saved.statusCode).toBe(200);
    expect(saved.json().circuit).toMatchObject({
      id: 'sandbox-lina-1',
      name: 'Mon circuit',
      thumbnail: 'data:image/png;base64,abc',
    });
    expect(saved.json().circuit.updatedAt).toEqual(expect.any(Number));

    const updated = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/sandbox-lina-1',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: { name: 'Version 2', data: document },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().circuit).toMatchObject({
      id: 'sandbox-lina-1',
      name: 'Version 2',
      thumbnail: null,
    });

    const list = await get('/api/me/sandbox', linaCookie);
    expect(list.statusCode).toBe(200);
    expect(list.json().circuits).toHaveLength(1);
    expect(list.json().circuits[0].id).toBe('sandbox-lina-1');
    expect(await SandboxCircuitModel.countDocuments({ userId: lina._id })).toBe(1);
  });

  it('isolates sandboxes per child', async () => {
    const payload = { name: 'Le mien', data: document };
    await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/shared-id',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload,
    });
    await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/shared-id',
      headers: { cookie: `zap_session=${noeCookie}` },
      payload: { ...payload, name: 'Le sien' },
    });

    const linaList = await get('/api/me/sandbox', linaCookie);
    const noeList = await get('/api/me/sandbox', noeCookie);
    expect(linaList.json().circuits).toHaveLength(1);
    expect(noeList.json().circuits).toHaveLength(1);
    expect(linaList.json().circuits[0].name).toBe('Le mien');
    expect(noeList.json().circuits[0].name).toBe('Le sien');
    expect(await SandboxCircuitModel.countDocuments()).toBe(2);
  });

  it('rejects invalid or oversized circuits', async () => {
    const invalid = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/sandbox-bad',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: {
        name: 'Invalide',
        data: { version: 999, components: [], wires: [] },
      },
    });
    expect(invalid.statusCode).toBe(400);

    const oversized = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/sandbox-big',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: {
        name: 'Trop gros',
        data: { ...document, blob: 'x'.repeat(201 * 1024) },
      },
    });
    expect(oversized.statusCode).toBe(400);
    expect(oversized.json().error.code).toBe('invalid_sandbox');

    const remoteThumbnail = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/sandbox-remote',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: {
        name: 'Vignette distante',
        data: document,
        thumbnail: 'https://example.test/pixel.png',
      },
    });
    expect(remoteThumbnail.statusCode).toBe(400);
  });

  it('caps the number of sandbox creations per child', async () => {
    await SandboxCircuitModel.insertMany(
      Array.from({ length: MAX_SANDBOX_CIRCUITS }, (_, index) => ({
        userId: lina._id,
        clientId: `quota-${index}`,
        name: `Création ${index}`,
        data: document,
        thumbnail: null,
      })),
    );

    const refused = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/new-one',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: { name: 'Nouvelle', data: document },
    });
    expect(refused.statusCode).toBe(429);
    expect(refused.json().error.code).toBe('sandbox_quota');

    const updated = await app.inject({
      method: 'PUT',
      url: '/api/me/sandbox/quota-0',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: { name: 'Mise à jour', data: document },
    });
    expect(updated.statusCode).toBe(200);
  });
});

describe('attempt quotas', () => {
  it('caps daily attempts but keeps an existing attempt idempotent', async () => {
    const today = new Date();
    await LevelAttemptModel.insertMany(
      Array.from({ length: MAX_ATTEMPTS_PER_DAY }, (_, index) => ({
        userId: lina._id,
        groupId: group._id,
        clientId: `quota-attempt-${index}`,
        levelId: 'light-01',
        startedAt: today,
        endedAt: null,
        success: false,
        hintsUsed: 0,
        durationMs: 0,
        errorsDetected: [],
      })),
    );

    const refused = await app.inject({
      method: 'POST',
      url: '/api/me/attempts/start',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: { levelId: 'light-01', attemptId: 'new-attempt' },
    });
    expect(refused.statusCode).toBe(429);
    expect(refused.json().error.code).toBe('attempt_quota');

    const existing = await app.inject({
      method: 'POST',
      url: '/api/me/attempts/start',
      headers: { cookie: `zap_session=${linaCookie}` },
      payload: { levelId: 'light-01', attemptId: 'quota-attempt-0' },
    });
    expect(existing.statusCode).toBe(201);
  });
});
