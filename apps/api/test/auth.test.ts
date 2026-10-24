import { PICTURE_PATTERN_IDS } from '@circuits/shared';
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
  AuditLogModel,
  GroupModel,
  InviteModel,
  SessionModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../src/db/models/index.js';
import { hashSecret, pictureSecretFromPattern } from '../src/services/secrets.js';
import { hashToken } from '../src/services/tokens.js';

const TEST_DB_NAME = 'circuits_auth_test';
const ADULT_PASSWORD = 'Correct-Horse-2026';
const NEW_PASSWORD = 'Nouveau-Secret-2026';
const COOKIE_SECRET = 'test-cookie-secret-0123456789abcdef';
const PUBLIC_ORIGIN = 'https://zap.test';
const STUDENT_PATTERN = ['renard', 'pomme', 'ballon'] as const;

let replSet: MongoMemoryReplSet;
let app: FastifyInstance;
let adultHash: string;
let pictureHash: string;

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
): Promise<UserDocument> {
  return UserModel.create({
    role: 'eleve',
    displayName,
    avatarId,
    pictureSecretHash: pictureHash,
  });
}

interface Fixture {
  admin: UserDocument;
  coach: UserDocument;
  otherCoach: UserDocument;
  student: UserDocument;
  otherStudent: UserDocument;
  foreignStudent: UserDocument;
  parent: UserDocument;
  group: GroupDocument;
  otherGroup: GroupDocument;
}

async function createFixture(): Promise<Fixture> {
  const admin = await createAdult('admin', 'admin');
  const coach = await createAdult('encadrant', 'coach');
  const otherCoach = await createAdult('encadrant', 'other');
  const student = await createStudent('Lina', 'renard');
  const otherStudent = await createStudent('Noé', 'panda');
  const foreignStudent = await createStudent('Mila', 'fusee');
  const parent = await createAdult('parent', 'parent', {
    parentOf: [student._id],
  });
  const joinedAt = new Date();

  const group = await GroupModel.create({
    name: 'CE2 B',
    joinCode: 'ABC234',
    createdBy: coach._id,
    members: [
      { userId: coach._id, roleInGroup: 'encadrant', joinedAt },
      { userId: student._id, roleInGroup: 'eleve', joinedAt },
      { userId: otherStudent._id, roleInGroup: 'eleve', joinedAt },
    ],
  });
  const otherGroup = await GroupModel.create({
    name: 'Autre groupe',
    joinCode: 'XYZ789',
    createdBy: otherCoach._id,
    members: [
      { userId: otherCoach._id, roleInGroup: 'encadrant', joinedAt },
      { userId: foreignStudent._id, roleInGroup: 'eleve', joinedAt },
    ],
  });

  return {
    admin,
    coach,
    otherCoach,
    student,
    otherStudent,
    foreignStudent,
    parent,
    group,
    otherGroup,
  };
}

function cookieValue(
  response: LightMyRequestResponse,
  name: string,
): string | null {
  return response.cookies.find((cookie) => cookie.name === name)?.value ?? null;
}

function cookieHeader(values: Record<string, string | null>): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function login(
  username: string,
  password = ADULT_PASSWORD,
  target: FastifyInstance = app,
): Promise<{ response: LightMyRequestResponse; cookie: string }> {
  const response = await target.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'user-agent': 'vitest' },
    payload: { username, password },
  });

  return {
    response,
    cookie: cookieValue(response, 'zap_session') ?? '',
  };
}

async function me(
  cookie: string,
  extraCookies: Record<string, string | null> = {},
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: {
      cookie: cookieHeader({ zap_session: cookie, ...extraCookies }),
    },
  });
}

async function loginChild(
  fixture: Fixture,
  options: {
    studentId?: string;
    pattern?: readonly string[];
    joinCode?: string | null;
    pinCookie?: string | null;
  } = {},
): Promise<LightMyRequestResponse> {
  const payload: Record<string, unknown> = {
    studentId: options.studentId ?? fixture.student._id.toString(),
    pattern: options.pattern ?? STUDENT_PATTERN,
  };

  if (options.joinCode !== null) {
    payload['joinCode'] = options.joinCode ?? fixture.group.joinCode;
  }

  return app.inject({
    method: 'POST',
    url: '/api/auth/children/login',
    headers: {
      'user-agent': 'vitest-child',
      cookie: cookieHeader({
        zap_device: options.pinCookie ?? null,
      }),
    },
    payload,
  });
}

async function pinDevice(
  coachCookie: string,
  groupId: string,
): Promise<{ response: LightMyRequestResponse; pinCookie: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/device-pin',
    headers: { cookie: cookieHeader({ zap_session: coachCookie }) },
    payload: { groupId },
  });

  return {
    response,
    pinCookie: cookieValue(response, 'zap_device') ?? '',
  };
}

function tokenFromUrl(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

describe('adult login and sessions', () => {
  it('logs in, renews an adult session and never exposes credentials', async () => {
    await createAdult('admin', 'admin');

    const { response, cookie } = await login(' Admin ');
    expect(response.statusCode).toBe(200);
    expect(cookie.length).toBeGreaterThan(20);

    const body = response.json();
    expect(body.user).toMatchObject({
      role: 'admin',
      displayName: 'admin',
      username: 'admin',
      group: null,
    });
    expect(body.session.kind).toBe('adult');
    expect(body.user).not.toHaveProperty('_id');
    expect(body.user).not.toHaveProperty('__v');
    expect(body.user).not.toHaveProperty('email');
    expect(body.user).not.toHaveProperty('passwordHash');

    const setCookie = response.headers['set-cookie'];
    expect(String(setCookie)).toMatch(/HttpOnly/i);
    expect(String(setCookie)).toMatch(/SameSite=Lax/i);
    expect(String(setCookie)).not.toMatch(/Secure/i);

    const stored = await SessionModel.findOne().select('+tokenHash');
    expect(stored?.tokenHash).toBe(hashToken(cookie));
    expect(stored?.tokenHash).not.toBe(cookie);

    const meResponse = await me(cookie);
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().user.username).toBe('admin');

    const earlyExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await SessionModel.updateOne(
      { _id: stored?._id },
      { $set: { expiresAt: earlyExpiry } },
    );

    const renewed = await me(cookie);
    expect(renewed.statusCode).toBe(200);
    const renewedSession = await SessionModel.findById(stored?._id);
    expect(renewedSession?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 25 * 24 * 60 * 60 * 1000,
    );
  });

  it('rejects a wrong password and locks after eight failures', async () => {
    await createAdult('parent', 'parent');

    for (let attempt = 1; attempt < 8; attempt += 1) {
      const { response } = await login('parent', 'wrong-password');
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('invalid_credentials');
    }

    const locked = await login('parent', 'wrong-password');
    expect(locked.response.statusCode).toBe(423);
    expect(locked.response.json().error.code).toBe('account_locked');

    const stored = await UserModel.findOne({ username: 'parent' });
    expect(stored?.failedLogins).toBe(0);
    expect(stored?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    const stillLocked = await login('parent');
    expect(stillLocked.response.statusCode).toBe(423);

    await UserModel.updateOne(
      { username: 'parent' },
      { $set: { lockedUntil: null } },
    );
    const unlocked = await login('parent');
    expect(unlocked.response.statusCode).toBe(200);
  });

  it('rejects disabled accounts and unknown usernames with the same message', async () => {
    await createAdult('encadrant', 'coach', { disabledAt: new Date() });

    const disabled = await login('coach');
    expect(disabled.response.statusCode).toBe(401);
    expect(disabled.response.json().error.message).toMatch(
      /identifiant ou mot de passe/i,
    );

    const unknown = await login('nobody');
    expect(unknown.response.statusCode).toBe(401);
    expect(unknown.response.json().error.message).toBe(
      disabled.response.json().error.message,
    );
  });

  it('expires and clears sessions at the database level', async () => {
    await createAdult('admin', 'admin');
    const { cookie } = await login('admin');

    await SessionModel.updateMany(
      {},
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const expired = await me(cookie);
    expect(expired.statusCode).toBe(401);
    expect(await SessionModel.countDocuments()).toBe(0);
  });

  it('marks cookies Secure when the API runs over HTTPS', async () => {
    await createAdult('admin', 'admin');
    const secureApp = buildApp({
      logger: false,
      cookieSecret: COOKIE_SECRET,
      secureCookies: true,
      publicOrigin: PUBLIC_ORIGIN,
      rateLimitMax: 1000,
    });

    try {
      await secureApp.ready();
      const { response } = await login('admin', ADULT_PASSWORD, secureApp);
      expect(response.statusCode).toBe(200);
      expect(String(response.headers['set-cookie'])).toMatch(/Secure/i);
    } finally {
      await secureApp.close();
    }
  });

  it('rate limits the login route', async () => {
    await createAdult('admin', 'admin');
    const limitedApp = buildApp({
      logger: false,
      cookieSecret: COOKIE_SECRET,
      secureCookies: false,
      publicOrigin: PUBLIC_ORIGIN,
      rateLimitMax: 2,
    });

    try {
      await limitedApp.ready();
      const first = await login('admin', 'wrong-password', limitedApp);
      const second = await login('admin', 'wrong-password', limitedApp);
      const third = await login('admin', 'wrong-password', limitedApp);

      expect(first.response.statusCode).toBe(401);
      expect(second.response.statusCode).toBe(401);
      expect(third.response.statusCode).toBe(429);
      expect(third.response.json().error.code).toBe('rate_limited');
    } finally {
      await limitedApp.close();
    }
  });

  it('rejects state-changing requests from another origin', async () => {
    const evil = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: 'https://evil.test' },
    });
    expect(evil.statusCode).toBe(403);
    expect(evil.json().error.code).toBe('origin_not_allowed');

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: PUBLIC_ORIGIN },
    });
    expect(allowed.statusCode).toBe(200);
  });

  it('logs out and revokes the session', async () => {
    await createAdult('admin', 'admin');
    const { cookie } = await login('admin');

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: cookieHeader({ zap_session: cookie }) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(await SessionModel.countDocuments()).toBe(0);
    expect((await me(cookie)).statusCode).toBe(401);
  });

  it('changes an adult password without asking the old one', async () => {
    await createAdult('encadrant', 'coach');
    const { cookie } = await login('coach');

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie: cookieHeader({ zap_session: cookie }) },
      payload: { newPassword: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    expect(response.json().sessionsRevoked).toBeGreaterThanOrEqual(1);

    const freshCookie = cookieValue(response, 'zap_session') ?? '';
    expect(freshCookie.length).toBeGreaterThan(20);
    expect((await me(freshCookie)).statusCode).toBe(200);
    expect((await me(cookie)).statusCode).toBe(401);

    expect((await login('coach')).response.statusCode).toBe(401);
    expect((await login('coach', NEW_PASSWORD)).response.statusCode).toBe(200);

    const audit = await AuditLogModel.findOne({ action: 'change_password' });
    expect(audit).not.toBeNull();

    const short = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie: cookieHeader({ zap_session: freshCookie }) },
      payload: { newPassword: 'trop-court' },
    });
    expect(short.statusCode).toBe(400);
    expect(short.json().error.code).toBe('validation_failed');
  });
});

describe('adult invitations', () => {
  it('creates, previews and accepts a parent invitation once', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');

    const created = await app.inject({
      method: 'POST',
      url: '/api/auth/invites',
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
      payload: {
        role: 'parent',
        username: 'parent1',
        displayName: 'Parent Un',
        childId: fixture.student._id.toString(),
      },
    });

    expect(created.statusCode).toBe(201);
    const body = created.json();
    expect(body.invite.url).toMatch(
      new RegExp(`^${PUBLIC_ORIGIN}/invitation/[A-Za-z0-9_-]+$`),
    );
    expect(body.invite.url).not.toContain('tokenHash');
    expect(body.invite.expiresAt).toBeTruthy();

    const token = tokenFromUrl(body.invite.url);
    const stored = await InviteModel.findOne({ tokenHash: hashToken(token) });
    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).not.toBe(token);

    const preview = await app.inject({
      method: 'GET',
      url: `/api/auth/invites/${token}`,
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({
      type: 'parent',
      role: 'parent',
      displayName: 'Parent Un',
      username: 'parent1',
      childName: 'Lina',
    });

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/auth/invites/${token}/accept`,
      headers: { 'user-agent': 'vitest' },
      payload: { password: NEW_PASSWORD },
    });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().user).toMatchObject({
      role: 'parent',
      username: 'parent1',
    });
    expect(cookieValue(accepted, 'zap_session')).toBeTruthy();

    const parent = await UserModel.findOne({ username: 'parent1' });
    expect(parent?.parentOf.map(String)).toContain(
      fixture.student._id.toString(),
    );
    expect((await InviteModel.findOne({ tokenHash: hashToken(token) }))?.usedAt)
      .toBeInstanceOf(Date);

    const second = await app.inject({
      method: 'POST',
      url: `/api/auth/invites/${token}/accept`,
      payload: { password: 'Autre-Mot-De-Passe-2026' },
    });
    expect(second.statusCode).toBe(410);
    expect(second.json().error.code).toBe('invite_unusable');
  });

  it('creates an encadrant invitation and rejects duplicates', async () => {
    await createFixture();
    const coachLogin = await login('coach');

    const payload = {
      role: 'encadrant',
      username: 'coach2',
      displayName: 'Coach Deux',
    };
    const created = await app.inject({
      method: 'POST',
      url: '/api/auth/invites',
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
      payload,
    });
    expect(created.statusCode).toBe(201);

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/invites',
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);

    const token = tokenFromUrl(created.json().invite.url);
    const accepted = await app.inject({
      method: 'POST',
      url: `/api/auth/invites/${token}/accept`,
      payload: { password: NEW_PASSWORD },
    });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().user.role).toBe('encadrant');
    expect(await UserModel.exists({ username: 'coach2', role: 'encadrant' }))
      .not.toBeNull();
  });

  it('limits parent invitations to the teacher’s own students', async () => {
    const fixture = await createFixture();
    const otherLogin = await login('other');

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/invites',
      headers: {
        cookie: cookieHeader({ zap_session: otherLogin.cookie }),
      },
      payload: {
        role: 'parent',
        username: 'parent2',
        displayName: 'Parent Deux',
        childId: fixture.student._id.toString(),
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('reports expired and unknown invitations', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const created = await app.inject({
      method: 'POST',
      url: '/api/auth/invites',
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
      payload: {
        role: 'parent',
        username: 'parent3',
        displayName: 'Parent Trois',
        childId: fixture.student._id.toString(),
      },
    });
    const token = tokenFromUrl(created.json().invite.url);

    await InviteModel.updateOne(
      { tokenHash: hashToken(token) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const expired = await app.inject({
      method: 'GET',
      url: `/api/auth/invites/${token}`,
    });
    expect(expired.statusCode).toBe(410);

    const unknown = await app.inject({
      method: 'GET',
      url: '/api/auth/invites/abcdefghijklmnopqrstuvwxyz0123456789',
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('creates a one-time password reset link for an adult', async () => {
    await createFixture();
    const adminLogin = await login('admin');
    const parentLogin = await login('parent');

    const created = await app.inject({
      method: 'POST',
      url: '/api/auth/password-resets',
      headers: {
        cookie: cookieHeader({ zap_session: adminLogin.cookie }),
      },
      payload: { username: 'parent' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().invite.type).toBe('password_reset');

    const token = tokenFromUrl(created.json().invite.url);
    const preview = await app.inject({
      method: 'GET',
      url: `/api/auth/invites/${token}`,
    });
    expect(preview.json()).toMatchObject({
      type: 'password_reset',
      role: null,
      username: 'parent',
    });

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/auth/invites/${token}/accept`,
      payload: { password: NEW_PASSWORD },
    });
    expect(accepted.statusCode).toBe(201);
    expect(cookieValue(accepted, 'zap_session')).toBeTruthy();
    expect((await me(parentLogin.cookie)).statusCode).toBe(401);
    expect((await login('parent')).response.statusCode).toBe(401);
    expect((await login('parent', NEW_PASSWORD)).response.statusCode).toBe(200);
    expect(await AuditLogModel.exists({ action: 'reset_password' })).not.toBeNull();
  });

  it('refuses reset links from a non-admin and for a student', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const adminLogin = await login('admin');

    const coachAttempt = await app.inject({
      method: 'POST',
      url: '/api/auth/password-resets',
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
      payload: { username: 'parent' },
    });
    expect(coachAttempt.statusCode).toBe(403);

    const studentAttempt = await app.inject({
      method: 'POST',
      url: '/api/auth/password-resets',
      headers: {
        cookie: cookieHeader({ zap_session: adminLogin.cookie }),
      },
      payload: { username: fixture.student.displayName.toLowerCase() },
    });
    expect(studentAttempt.statusCode).toBe(404);
  });
});

describe('child authentication', () => {
  it('lists a group from its code and hides unknown or archived groups', async () => {
    const fixture = await createFixture();

    const response = await app.inject({
      method: 'GET',
      url: `/api/auth/children/group/${fixture.group.joinCode}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      group: { name: 'CE2 B', joinCode: 'ABC234' },
      pinned: false,
    });
    expect(response.json().students.map((student: { displayName: string }) =>
      student.displayName,
    )).toEqual(['Lina', 'Noé']);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/auth/children/group/ZZZZZZ',
    });
    expect(missing.statusCode).toBe(404);

    await GroupModel.updateOne(
      { _id: fixture.group._id },
      { $set: { archivedAt: new Date() } },
    );
    const archived = await app.inject({
      method: 'GET',
      url: `/api/auth/children/group/${fixture.group.joinCode}`,
    });
    expect(archived.statusCode).toBe(404);
  });

  it('logs a child in with three pictures and keeps an absolute eight-hour session', async () => {
    const fixture = await createFixture();

    const response = await loginChild(fixture);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toMatchObject({
      role: 'eleve',
      displayName: 'Lina',
      username: null,
      group: { name: 'CE2 B', joinCode: 'ABC234' },
    });
    expect(body.session.kind).toBe('child');

    const cookie = cookieValue(response, 'zap_session') ?? '';
    expect(cookie.length).toBeGreaterThan(20);
    expect(String(response.headers['set-cookie'])).toMatch(/HttpOnly/i);

    const stored = await SessionModel.findOne().select('+tokenHash');
    const expected = 8 * 60 * 60 * 1000;
    const actual = (stored?.expiresAt.getTime() ?? 0) - Date.now();
    expect(actual).toBeGreaterThan(expected - 60_000);
    expect(actual).toBeLessThanOrEqual(expected);
    expect(stored?.groupId?.toString()).toBe(fixture.group._id.toString());

    const meResponse = await me(cookie);
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().user.group.joinCode).toBe('ABC234');
  });

  it('locks a student after five wrong pictures and asks for the teacher', async () => {
    const fixture = await createFixture();

    for (let attempt = 1; attempt < 5; attempt += 1) {
      const wrong = await loginChild(fixture, {
        pattern: ['panda', 'panda', 'panda'],
      });
      expect(wrong.statusCode).toBe(401);
      expect(wrong.json().error.code).toBe('picture_wrong');
    }

    const locked = await loginChild(fixture, {
      pattern: ['panda', 'panda', 'panda'],
    });
    expect(locked.statusCode).toBe(423);
    expect(locked.json().error.code).toBe('picture_locked');
    expect(locked.json().error.message).toMatch(/encadrant/i);

    const correctWhileLocked = await loginChild(fixture);
    expect(correctWhileLocked.statusCode).toBe(423);

    const stored = await UserModel.findById(fixture.student._id);
    expect(stored?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    await UserModel.updateOne(
      { _id: fixture.student._id },
      { $set: { lockedUntil: null, failedLogins: 0 } },
    );

    const correct = await loginChild(fixture);
    expect(correct.statusCode).toBe(200);
    expect((await UserModel.findById(fixture.student._id))?.failedLogins).toBe(0);
  });

  it('requires the group code unless the device is pinned and rejects outsiders', async () => {
    const fixture = await createFixture();

    const withoutCode = await loginChild(fixture, { joinCode: null });
    expect(withoutCode.statusCode).toBe(400);
    expect(withoutCode.json().error.code).toBe('join_code_required');

    const outsider = await app.inject({
      method: 'POST',
      url: '/api/auth/children/login',
      payload: {
        joinCode: fixture.group.joinCode,
        studentId: fixture.foreignStudent._id.toString(),
        pattern: STUDENT_PATTERN,
      },
    });
    expect(outsider.statusCode).toBe(401);
  });

  it('lets a teacher reset a picture password and revokes child sessions', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const childLogin = await loginChild(fixture);
    const childCookie = cookieValue(childLogin, 'zap_session') ?? '';
    expect((await me(childCookie)).statusCode).toBe(200);

    const reset = await app.inject({
      method: 'POST',
      url: `/api/auth/students/${fixture.student._id.toString()}/picture-password/reset`,
      headers: {
        cookie: cookieHeader({ zap_session: coachLogin.cookie }),
      },
    });

    expect(reset.statusCode).toBe(200);
    const body = reset.json();
    expect(body.pattern).toHaveLength(3);
    expect(body.labels).toHaveLength(3);
    expect(new Set(body.pattern).size).toBe(3);
    for (const picture of body.pattern) {
      expect(PICTURE_PATTERN_IDS).toContain(picture);
    }

    expect((await me(childCookie)).statusCode).toBe(401);

    const oldPattern = await loginChild(fixture);
    expect(oldPattern.statusCode).toBe(401);

    const newPattern = await loginChild(fixture, { pattern: body.pattern });
    expect(newPattern.statusCode).toBe(200);
    expect(await AuditLogModel.exists({ action: 'reset_picture_password' }))
      .not.toBeNull();
  });

  it('refuses picture resets from another teacher or a parent', async () => {
    const fixture = await createFixture();
    const otherLogin = await login('other');
    const parentLogin = await login('parent');

    const otherAttempt = await app.inject({
      method: 'POST',
      url: `/api/auth/students/${fixture.student._id.toString()}/picture-password/reset`,
      headers: {
        cookie: cookieHeader({ zap_session: otherLogin.cookie }),
      },
    });
    expect(otherAttempt.statusCode).toBe(403);

    const parentAttempt = await app.inject({
      method: 'POST',
      url: `/api/auth/students/${fixture.student._id.toString()}/picture-password/reset`,
      headers: {
        cookie: cookieHeader({ zap_session: parentLogin.cookie }),
      },
    });
    expect(parentAttempt.statusCode).toBe(403);
  });
});

describe('device pinning', () => {
  it('pins a group, lists it without a session and logs a child in without a code', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');

    const { response, pinCookie } = await pinDevice(
      coachLogin.cookie,
      fixture.group._id.toString(),
    );
    expect(response.statusCode).toBe(200);
    expect(response.json().group.joinCode).toBe('ABC234');
    expect(pinCookie.length).toBeGreaterThan(10);

    const pinned = await app.inject({
      method: 'GET',
      url: '/api/auth/device-pin',
      headers: { cookie: cookieHeader({ zap_device: pinCookie }) },
    });
    expect(pinned.statusCode).toBe(200);
    expect(pinned.json()).toMatchObject({
      pinned: true,
      group: { joinCode: 'ABC234' },
    });
    expect(pinned.json().students).toHaveLength(2);

    const childLogin = await loginChild(fixture, {
      joinCode: null,
      pinCookie,
    });
    expect(childLogin.statusCode).toBe(200);
    expect(childLogin.json().user.group.joinCode).toBe('ABC234');

    const foreign = await loginChild(fixture, {
      studentId: fixture.foreignStudent._id.toString(),
      joinCode: null,
      pinCookie,
    });
    expect(foreign.statusCode).toBe(401);
  });

  it('rejects a forged pin cookie and a teacher without access', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const otherLogin = await login('other');

    const forbidden = await pinDevice(
      otherLogin.cookie,
      fixture.group._id.toString(),
    );
    expect(forbidden.response.statusCode).toBe(403);

    const { pinCookie } = await pinDevice(
      coachLogin.cookie,
      fixture.group._id.toString(),
    );
    const [groupId, expiry] = pinCookie.split('.');
    const forged = `${fixture.otherGroup._id.toString()}.${expiry}`;
    expect(groupId).toBe(fixture.group._id.toString());

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/device-pin',
      headers: { cookie: cookieHeader({ zap_device: forged }) },
    });
    expect(response.statusCode).toBe(404);
  });

  it('unpins only for an adult and then refuses the shortcut', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const { pinCookie } = await pinDevice(
      coachLogin.cookie,
      fixture.group._id.toString(),
    );
    const childLogin = await loginChild(fixture, { joinCode: null, pinCookie });
    const childCookie = cookieValue(childLogin, 'zap_session') ?? '';

    const childAttempt = await app.inject({
      method: 'DELETE',
      url: '/api/auth/device-pin',
      headers: { cookie: cookieHeader({ zap_session: childCookie }) },
    });
    expect(childAttempt.statusCode).toBe(403);

    const adultUnpin = await app.inject({
      method: 'DELETE',
      url: '/api/auth/device-pin',
      headers: {
        cookie: cookieHeader({
          zap_session: coachLogin.cookie,
          zap_device: pinCookie,
        }),
      },
    });
    expect(adultUnpin.statusCode).toBe(200);
    expect(String(adultUnpin.headers['set-cookie'])).toMatch(
      /zap_device=;/,
    );

    // The pin lives only in the signed cookie, so the browser honours the
    // deletion; a replay of the old cookie would still be accepted, as with
    // any cookie-based state.
    const pinned = await app.inject({
      method: 'GET',
      url: '/api/auth/device-pin',
    });
    expect(pinned.statusCode).toBe(404);
  });

  it('lets an admin pin any group', async () => {
    const fixture = await createFixture();
    const adminLogin = await login('admin');

    const { response } = await pinDevice(
      adminLogin.cookie,
      fixture.otherGroup._id.toString(),
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().group.joinCode).toBe('XYZ789');
  });
});
