import { AVATAR_IDS, serializeCircuit } from '@circuits/shared';
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
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  UserModel,
  type GroupDocument,
  type UserDocument,
} from '../src/db/models/index.js';
import {
  hashSecret,
  pictureSecretFromPattern,
  verifySecret,
} from '../src/services/secrets.js';

const TEST_DB_NAME = 'circuits_manage_test';
const ADULT_PASSWORD = 'Correct-Horse-2026';
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
  parent: UserDocument;
  otherParent: UserDocument;
  lina: UserDocument;
  noe: UserDocument;
  mila: UserDocument;
  groupA: GroupDocument;
  groupB: GroupDocument;
}

async function createFixture(): Promise<Fixture> {
  const admin = await createAdult('admin', 'admin');
  const coach = await createAdult('encadrant', 'coach');
  const otherCoach = await createAdult('encadrant', 'other');
  const lina = await createStudent('Lina', 'renard');
  const noe = await createStudent('Noé', 'panda');
  const mila = await createStudent('Mila', 'fusee');
  const parent = await createAdult('parent', 'parent', {
    parentOf: [lina._id],
  });
  const otherParent = await createAdult('parent', 'parent2', {
    parentOf: [mila._id],
  });
  const joinedAt = new Date();
  const groupA = await GroupModel.create({
    name: 'CE2 A',
    joinCode: 'ABC234',
    createdBy: coach._id,
    members: [
      { userId: coach._id, roleInGroup: 'encadrant', joinedAt },
      { userId: lina._id, roleInGroup: 'eleve', joinedAt },
      { userId: noe._id, roleInGroup: 'eleve', joinedAt },
    ],
  });
  const groupB = await GroupModel.create({
    name: 'CE2 B',
    joinCode: 'XYZ789',
    createdBy: otherCoach._id,
    members: [
      { userId: otherCoach._id, roleInGroup: 'encadrant', joinedAt },
      { userId: mila._id, roleInGroup: 'eleve', joinedAt },
    ],
  });

  return {
    admin,
    coach,
    otherCoach,
    parent,
    otherParent,
    lina,
    noe,
    mila,
    groupA,
    groupB,
  };
}

function cookieValue(
  response: LightMyRequestResponse,
  name: string,
): string | null {
  return response.cookies.find((cookie) => cookie.name === name)?.value ?? null;
}

function cookieHeader(cookie: string | null): string {
  return cookie === null || cookie === '' ? '' : `zap_session=${cookie}`;
}

async function login(username: string, password = ADULT_PASSWORD) {
  const response = await app.inject({
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

async function loginChild(
  student: UserDocument,
  group: GroupDocument,
  pattern: readonly string[] = STUDENT_PATTERN,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/children/login',
    payload: {
      joinCode: group.joinCode,
      studentId: student._id.toString(),
      pattern,
    },
  });
  expect(response.statusCode).toBe(200);

  return cookieValue(response, 'zap_session') ?? '';
}

async function get(
  url: string,
  cookie: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'GET',
    url,
    headers: { cookie: cookieHeader(cookie) },
  });
}

async function send(
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  cookie: string,
  payload?: Record<string, unknown>,
): Promise<LightMyRequestResponse> {
  const headers = { cookie: cookieHeader(cookie) };

  if (payload === undefined) {
    return app.inject({ method, url, headers });
  }

  return app.inject({ method, url, headers, payload });
}

describe('group management', () => {
  it('creates a group for a teacher and lists only accessible groups', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const adminLogin = await login('admin');
    const parentLogin = await login('parent');

    const created = await send('POST', '/api/groups', coachLogin.cookie, {
      name: '  CE2 C  ',
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().group).toMatchObject({
      name: 'CE2 C',
      studentCount: 0,
      canManage: true,
      archived: false,
    });
    expect(created.json().group.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const stored = await GroupModel.findById(created.json().group.id);
    expect(stored?.createdBy.toString()).toBe(fixture.coach._id.toString());
    expect(
      stored?.members.some(
        (member) =>
          member.userId.equals(fixture.coach._id) &&
          member.roleInGroup === 'encadrant',
      ),
    ).toBe(true);

    const coachGroups = await get('/api/groups', coachLogin.cookie);
    expect(coachGroups.statusCode).toBe(200);
    expect(coachGroups.json().groups.map((group: { name: string }) => group.name))
      .toEqual(['CE2 A', 'CE2 C']);

    const adminGroups = await get('/api/groups', adminLogin.cookie);
    expect(adminGroups.json().groups).toHaveLength(3);

    const parentGroups = await get('/api/groups', parentLogin.cookie);
    expect(parentGroups.statusCode).toBe(403);
  });

  it('renames, archives and rekeys only as the group creator', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const otherLogin = await login('other');
    const adminLogin = await login('admin');
    const childCookie = await loginChild(fixture.lina, fixture.groupA);

    const renamed = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      coachLogin.cookie,
      { name: 'CE2 Alpha' },
    );
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json().group.name).toBe('CE2 Alpha');

    const foreign = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      otherLogin.cookie,
      { name: 'Volé' },
    );
    expect(foreign.statusCode).toBe(403);

    const adminRename = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      adminLogin.cookie,
      { name: 'CE2 A' },
    );
    expect(adminRename.statusCode).toBe(200);

    const rekeyed = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/join-code`,
      coachLogin.cookie,
    );
    expect(rekeyed.statusCode).toBe(200);
    const newCode = rekeyed.json().group.joinCode;
    expect(newCode).not.toBe('ABC234');
    expect(newCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(
      (await app.inject({
        method: 'GET',
        url: '/api/auth/children/group/ABC234',
      })).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({
        method: 'GET',
        url: `/api/auth/children/group/${newCode}`,
      })).statusCode,
    ).toBe(200);

    const archived = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      coachLogin.cookie,
      { archived: true },
    );
    expect(archived.statusCode).toBe(200);
    expect(archived.json().group.archived).toBe(true);
    expect((await get('/api/auth/me', childCookie)).statusCode).toBe(401);
    expect(
      (await app.inject({
        method: 'GET',
        url: `/api/auth/children/group/${newCode}`,
      })).statusCode,
    ).toBe(404);

    const visible = await get('/api/groups', coachLogin.cookie);
    expect(visible.json().groups.map((group: { name: string }) => group.name))
      .toEqual([]);
    const withArchived = await get('/api/groups?includeArchived=true', coachLogin.cookie);
    expect(withArchived.json().groups.map((group: { name: string }) => group.name))
      .toEqual(['CE2 A']);

    const addToArchived = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students`,
      coachLogin.cookie,
      { displayName: 'Zoé', avatarId: 'chat' },
    );
    expect(addToArchived.statusCode).toBe(400);
    expect(addToArchived.json().error.code).toBe('group_archived');

    const reopened = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      coachLogin.cookie,
      { archived: false },
    );
    expect(reopened.statusCode).toBe(200);
    expect(
      (await app.inject({
        method: 'GET',
        url: `/api/auth/children/group/${newCode}`,
      })).statusCode,
    ).toBe(200);
  });

  it('lets a co-teacher see and fill a group without renaming it', async () => {
    const fixture = await createFixture();
    fixture.groupA.members.push({
      userId: fixture.otherCoach._id,
      roleInGroup: 'encadrant',
      joinedAt: new Date(),
    });
    await fixture.groupA.save();

    const otherLogin = await login('other');

    const detail = await get(
      `/api/groups/${fixture.groupA._id.toString()}`,
      otherLogin.cookie,
    );
    expect(detail.statusCode).toBe(200);
    expect(detail.json().group.canManage).toBe(false);
    expect(detail.json().group.students).toHaveLength(2);

    const rename = await send(
      'PATCH',
      `/api/groups/${fixture.groupA._id.toString()}`,
      otherLogin.cookie,
      { name: 'Interdit' },
    );
    expect(rename.statusCode).toBe(403);

    const addStudent = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students`,
      otherLogin.cookie,
      { displayName: 'Zoé', avatarId: 'chat' },
    );
    expect(addStudent.statusCode).toBe(201);
  });
});

describe('student management', () => {
  it('creates a student with a one-time picture password', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');

    const created = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students`,
      coachLogin.cookie,
      { displayName: '  Zoé  ', avatarId: 'chat' },
    );

    expect(created.statusCode).toBe(201);
    const body = created.json();
    expect(body.student).toMatchObject({
      displayName: 'Zoé',
      avatarId: 'chat',
      pictureLocked: false,
    });
    expect(body.picturePassword.pattern).toHaveLength(3);
    expect(body.picturePassword.labels).toHaveLength(3);

    const stored = await UserModel.findById(body.student.id).select(
      '+pictureSecretHash',
    );

    if (stored === null) {
      throw new Error('The student was not stored');
    }

    expect(stored.role).toBe('eleve');
    expect(stored.username).toBeNull();
    expect(stored.email).toBeNull();
    expect(stored.passwordHash).toBeUndefined();
    expect(
      await verifySecret(
        stored.pictureSecretHash ?? '',
        pictureSecretFromPattern(body.picturePassword.pattern),
      ),
    ).toBe(true);
    expect(
      await AuditLogModel.exists({
        action: 'create_student',
        targetId: stored._id,
      }),
    ).not.toBeNull();

    const childLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/children/login',
      payload: {
        joinCode: fixture.groupA.joinCode,
        studentId: body.student.id,
        pattern: body.picturePassword.pattern,
      },
    });
    expect(childLogin.statusCode).toBe(200);

    const invalidAvatar = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students`,
      coachLogin.cookie,
      { displayName: 'Zoé', avatarId: 'licorne-rose' },
    );
    expect(invalidAvatar.statusCode).toBe(400);
  });

  it('bulk creates students with one password per child', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');

    const created = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students/bulk`,
      coachLogin.cookie,
      { names: ['Ana', 'Bo', 'Cy'] },
    );

    expect(created.statusCode).toBe(201);
    expect(created.json().students).toHaveLength(3);
    for (const entry of created.json().students) {
      expect(entry.picturePassword.pattern).toHaveLength(3);
      expect(entry.picturePassword.labels).toHaveLength(3);
    }
    expect(
      created.json().students.map(
        (entry: { student: { avatarId: string } }) => entry.student.avatarId,
      ),
    ).toEqual([AVATAR_IDS[0], AVATAR_IDS[1], AVATAR_IDS[2]]);
    expect(await UserModel.countDocuments({ role: 'eleve' })).toBe(6);
    expect(
      (await GroupModel.findById(fixture.groupA._id))?.members.filter(
        (member) => member.roleInGroup === 'eleve',
      ),
    ).toHaveLength(5);

    const [first] = created.json().students;
    const childLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/children/login',
      payload: {
        joinCode: fixture.groupA.joinCode,
        studentId: first.student.id,
        pattern: first.picturePassword.pattern,
      },
    });
    expect(childLogin.statusCode).toBe(200);

    const empty = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students/bulk`,
      coachLogin.cookie,
      { names: [] },
    );
    expect(empty.statusCode).toBe(400);

    const tooMany = await send(
      'POST',
      `/api/groups/${fixture.groupA._id.toString()}/students/bulk`,
      coachLogin.cookie,
      { names: Array.from({ length: 41 }, (_, index) => `Élève ${index}`) },
    );
    expect(tooMany.statusCode).toBe(400);
  });

  it('moves a student only between groups the teacher can manage', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const adminLogin = await login('admin');
    const otherLogin = await login('other');
    const childCookie = await loginChild(fixture.noe, fixture.groupA);

    const target = await send('POST', '/api/groups', coachLogin.cookie, {
      name: 'CE2 C',
    });
    const targetId = target.json().group.id;

    const ownMove = await send(
      'PATCH',
      `/api/students/${fixture.noe._id.toString()}/group`,
      coachLogin.cookie,
      { groupId: targetId },
    );
    expect(ownMove.statusCode).toBe(200);
    expect(ownMove.json().student.groups.map((group: { name: string }) => group.name))
      .toEqual(['CE2 C']);
    expect((await get('/api/auth/me', childCookie)).statusCode).toBe(401);
    expect(
      (await GroupModel.findById(fixture.groupA._id))?.members.some((member) =>
        member.userId.equals(fixture.noe._id),
      ),
    ).toBe(false);
    expect(
      (await GroupModel.findById(targetId))?.members.some((member) =>
        member.userId.equals(fixture.noe._id),
      ),
    ).toBe(true);

    const foreignMove = await send(
      'PATCH',
      `/api/students/${fixture.mila._id.toString()}/group`,
      coachLogin.cookie,
      { groupId: targetId },
    );
    expect(foreignMove.statusCode).toBe(403);

    const toForeignGroup = await send(
      'PATCH',
      `/api/students/${fixture.noe._id.toString()}/group`,
      coachLogin.cookie,
      { groupId: fixture.groupB._id.toString() },
    );
    expect(toForeignGroup.statusCode).toBe(403);

    const adminMove = await send(
      'PATCH',
      `/api/students/${fixture.mila._id.toString()}/group`,
      adminLogin.cookie,
      { groupId: targetId },
    );
    expect(adminMove.statusCode).toBe(200);
    expect(adminMove.json().student.groups.map((group: { name: string }) => group.name))
      .toEqual(['CE2 C']);

    const foreignTeacherMove = await send(
      'PATCH',
      `/api/students/${fixture.lina._id.toString()}/group`,
      otherLogin.cookie,
      { groupId: fixture.groupB._id.toString() },
    );
    expect(foreignTeacherMove.statusCode).toBe(403);
  });
});

describe('visibility and privacy', () => {
  it('scopes student lists to the teacher, parent or admin', async () => {
    const fixture = await createFixture();
    const adminLogin = await login('admin');
    const coachLogin = await login('coach');
    const otherLogin = await login('other');
    const parentLogin = await login('parent');
    const childCookie = await loginChild(fixture.lina, fixture.groupA);

    const adminList = await get('/api/students', adminLogin.cookie);
    expect(adminList.statusCode).toBe(200);
    expect(adminList.json().students.map((student: { displayName: string }) => student.displayName))
      .toEqual(['Lina', 'Mila', 'Noé']);

    const coachList = await get('/api/students', coachLogin.cookie);
    expect(coachList.json().students.map((student: { displayName: string }) => student.displayName))
      .toEqual(['Lina', 'Noé']);

    const otherList = await get('/api/students', otherLogin.cookie);
    expect(otherList.json().students.map((student: { displayName: string }) => student.displayName))
      .toEqual(['Mila']);

    const parentList = await get('/api/students', parentLogin.cookie);
    expect(parentList.json().students.map((student: { displayName: string }) => student.displayName))
      .toEqual(['Lina']);

    const coachForeignGroup = await get(
      `/api/students?groupId=${fixture.groupB._id.toString()}`,
      coachLogin.cookie,
    );
    expect(coachForeignGroup.statusCode).toBe(403);

    const parentGroup = await get(
      `/api/students?groupId=${fixture.groupA._id.toString()}`,
      parentLogin.cookie,
    );
    expect(parentGroup.statusCode).toBe(200);
    expect(parentGroup.json().students).toHaveLength(1);

    const parentForeignGroup = await get(
      `/api/students?groupId=${fixture.groupB._id.toString()}`,
      parentLogin.cookie,
    );
    expect(parentForeignGroup.statusCode).toBe(403);

    const adminGroup = await get(
      `/api/students?groupId=${fixture.groupB._id.toString()}`,
      adminLogin.cookie,
    );
    expect(adminGroup.json().students).toHaveLength(1);

    expect((await get('/api/students', childCookie)).statusCode).toBe(403);
  });

  it('guards student details, exports, deletion and parent links', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const otherLogin = await login('other');
    const parentLogin = await login('parent');
    const otherParentLogin = await login('parent2');
    const childCookie = await loginChild(fixture.lina, fixture.groupA);

    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}`, coachLogin.cookie))
        .statusCode,
    ).toBe(200);
    expect(
      (await get(`/api/students/${fixture.mila._id.toString()}`, coachLogin.cookie))
        .statusCode,
    ).toBe(403);
    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}`, parentLogin.cookie))
        .statusCode,
    ).toBe(200);
    expect(
      (await get(`/api/students/${fixture.mila._id.toString()}`, parentLogin.cookie))
        .statusCode,
    ).toBe(403);
    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}`, childCookie))
        .statusCode,
    ).toBe(403);

    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}/export`, otherLogin.cookie))
        .statusCode,
    ).toBe(403);
    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}/export`, childCookie))
        .statusCode,
    ).toBe(403);

    const parents = await get(
      `/api/students/${fixture.lina._id.toString()}/parents`,
      coachLogin.cookie,
    );
    expect(parents.statusCode).toBe(200);
    expect(parents.json().parents.map((parent: { username: string }) => parent.username))
      .toEqual(['parent']);

    const parentAttempt = await send(
      'POST',
      `/api/students/${fixture.lina._id.toString()}/parents`,
      parentLogin.cookie,
      { username: 'parent2' },
    );
    expect(parentAttempt.statusCode).toBe(403);

    const linked = await send(
      'POST',
      `/api/students/${fixture.lina._id.toString()}/parents`,
      coachLogin.cookie,
      { username: 'parent2' },
    );
    expect(linked.statusCode).toBe(200);
    expect(linked.json().parent.username).toBe('parent2');

    const otherParentChild = await get(
      `/api/students/${fixture.lina._id.toString()}`,
      otherParentLogin.cookie,
    );
    expect(otherParentChild.statusCode).toBe(200);
    const otherParentList = await get('/api/students', otherParentLogin.cookie);
    expect(otherParentList.json().students).toHaveLength(2);

    const unlinked = await send(
      'DELETE',
      `/api/students/${fixture.lina._id.toString()}/parents/${fixture.otherParent._id.toString()}`,
      coachLogin.cookie,
    );
    expect(unlinked.statusCode).toBe(200);
    expect(
      (await get(`/api/students/${fixture.lina._id.toString()}`, otherParentLogin.cookie))
        .statusCode,
    ).toBe(403);

    const foreignLink = await send(
      'POST',
      `/api/students/${fixture.lina._id.toString()}/parents`,
      otherLogin.cookie,
      { username: 'parent2' },
    );
    expect(foreignLink.statusCode).toBe(403);
  });

  it('exports all student data without secrets', async () => {
    const fixture = await createFixture();
    const parentLogin = await login('parent');

    await LevelProgressModel.create({
      userId: fixture.lina._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 3,
      attempts: 2,
      hintsUsed: 1,
    });
    await LevelAttemptModel.create({
      userId: fixture.lina._id,
      groupId: fixture.groupA._id,
      levelId: 'light-01',
      success: true,
      hintsUsed: 1,
      errorsDetected: ['court-circuit'],
    });
    await SandboxCircuitModel.create({
      userId: fixture.lina._id,
      name: 'Mon circuit',
      data: serializeCircuit({ components: [], wires: [] }),
    });
    await UserModel.updateOne(
      { _id: fixture.lina._id },
      { $set: { vocabulary: [{ wordId: 'circuitFerme', unlockedAt: new Date() }] } },
    );

    const response = await get(
      `/api/students/${fixture.lina._id.toString()}/export`,
      parentLogin.cookie,
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="eleve-/,
    );
    const body = response.json();
    expect(body.student.displayName).toBe('Lina');
    expect(body.student.vocabulary[0].wordId).toBe('circuitFerme');
    expect(body.groups).toEqual([
      expect.objectContaining({ name: 'CE2 A' }),
    ]);
    expect(body.parents).toEqual([
      expect.objectContaining({ displayName: 'parent' }),
    ]);
    expect(body.progress[0]).toMatchObject({
      levelId: 'light-01',
      stars: 3,
      status: 'completed',
    });
    expect(body.attempts[0]).toMatchObject({
      levelId: 'light-01',
      errorsDetected: ['court-circuit'],
    });
    expect(body.sandboxCircuits[0].name).toBe('Mon circuit');
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|pictureSecretHash|username|email/);
    expect(
      await AuditLogModel.exists({
        action: 'export_student',
        targetId: fixture.lina._id,
      }),
    ).not.toBeNull();
  });

  it('deletes a student only with the exact name and audits it', async () => {
    const fixture = await createFixture();
    const coachLogin = await login('coach');
    const otherLogin = await login('other');
    const parentLogin = await login('parent');
    const childCookie = await loginChild(fixture.lina, fixture.groupA);

    await LevelProgressModel.create({
      userId: fixture.lina._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 2,
    });
    await LevelAttemptModel.create({
      userId: fixture.lina._id,
      groupId: fixture.groupA._id,
      levelId: 'light-01',
    });
    await SandboxCircuitModel.create({
      userId: fixture.lina._id,
      name: 'Brouillon',
      data: serializeCircuit({ components: [], wires: [] }),
    });

    const wrongName = await send(
      'DELETE',
      `/api/students/${fixture.lina._id.toString()}`,
      coachLogin.cookie,
      { confirmName: 'Noé' },
    );
    expect(wrongName.statusCode).toBe(400);
    expect(wrongName.json().error.code).toBe('confirmation_mismatch');
    expect(await UserModel.exists({ _id: fixture.lina._id })).not.toBeNull();

    const foreign = await send(
      'DELETE',
      `/api/students/${fixture.lina._id.toString()}`,
      otherLogin.cookie,
      { confirmName: 'Lina' },
    );
    expect(foreign.statusCode).toBe(403);

    const otherParent = await send(
      'DELETE',
      `/api/students/${fixture.lina._id.toString()}`,
      (await login('parent2')).cookie,
      { confirmName: 'Lina' },
    );
    expect(otherParent.statusCode).toBe(403);

    const deleted = await send(
      'DELETE',
      `/api/students/${fixture.lina._id.toString()}`,
      parentLogin.cookie,
      { confirmName: 'Lina' },
    );
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ ok: true });
    expect(await UserModel.exists({ _id: fixture.lina._id })).toBeNull();
    expect(await LevelProgressModel.countDocuments({ userId: fixture.lina._id })).toBe(0);
    expect(await LevelAttemptModel.countDocuments({ userId: fixture.lina._id })).toBe(0);
    expect(await SandboxCircuitModel.countDocuments({ userId: fixture.lina._id })).toBe(0);
    expect((await get('/api/auth/me', childCookie)).statusCode).toBe(401);
    expect(
      (await GroupModel.findById(fixture.groupA._id))?.members.some((member) =>
        member.userId.equals(fixture.lina._id),
      ),
    ).toBe(false);
    expect(
      (await UserModel.findById(fixture.parent._id))?.parentOf.some((childId) =>
        childId.equals(fixture.lina._id),
      ),
    ).toBe(false);
    expect(
      await AuditLogModel.exists({
        action: 'delete_student',
        targetId: fixture.lina._id,
      }),
    ).not.toBeNull();
  });
});

describe('administration', () => {
  it('lists users, disables accounts and changes adult roles', async () => {
    const fixture = await createFixture();
    const adminLogin = await login('admin');
    const coachLogin = await login('coach');
    const parentLogin = await login('parent');

    const users = await get('/api/users?limit=2&offset=0', adminLogin.cookie);
    expect(users.statusCode).toBe(200);
    expect(users.json().users).toHaveLength(2);
    expect(users.json().total).toBe(8);
    expect(users.json().users[0]).not.toHaveProperty('passwordHash');
    expect(users.json().users[0]).not.toHaveProperty('pictureSecretHash');
    expect(users.json().users[0]).not.toHaveProperty('email');

    const studentsOnly = await get('/api/users?role=eleve', adminLogin.cookie);
    expect(studentsOnly.json().users).toHaveLength(3);

    const detail = await get(
      `/api/users/${fixture.coach._id.toString()}`,
      adminLogin.cookie,
    );
    expect(detail.statusCode).toBe(200);
    expect(detail.json().user).toMatchObject({
      role: 'encadrant',
      username: 'coach',
      disabled: false,
    });

    expect((await get('/api/users', coachLogin.cookie)).statusCode).toBe(403);

    const disabled = await send(
      'PATCH',
      `/api/users/${fixture.parent._id.toString()}/status`,
      adminLogin.cookie,
      { disabled: true },
    );
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json().user.disabled).toBe(true);
    expect((await get('/api/auth/me', parentLogin.cookie)).statusCode).toBe(401);
    expect((await login('parent')).response.statusCode).toBe(401);

    const enabled = await send(
      'PATCH',
      `/api/users/${fixture.parent._id.toString()}/status`,
      adminLogin.cookie,
      { disabled: false },
    );
    expect(enabled.statusCode).toBe(200);
    expect((await login('parent')).response.statusCode).toBe(200);

    const otherParentLogin = await login('parent2');
    const promoted = await send(
      'PATCH',
      `/api/users/${fixture.otherParent._id.toString()}/role`,
      adminLogin.cookie,
      { role: 'encadrant' },
    );
    expect(promoted.statusCode).toBe(200);
    expect(promoted.json().user.role).toBe('encadrant');
    expect((await get('/api/auth/me', otherParentLogin.cookie)).statusCode).toBe(401);
    const promotedLogin = await login('parent2');
    expect((await get('/api/groups', promotedLogin.cookie)).statusCode).toBe(200);

    const studentRole = await send(
      'PATCH',
      `/api/users/${fixture.lina._id.toString()}/role`,
      adminLogin.cookie,
      { role: 'parent' },
    );
    expect(studentRole.statusCode).toBe(400);
    expect(studentRole.json().error.code).toBe('student_role_locked');

    const selfDisable = await send(
      'PATCH',
      `/api/users/${fixture.admin._id.toString()}/status`,
      adminLogin.cookie,
      { disabled: true },
    );
    expect(selfDisable.statusCode).toBe(400);

    const selfRole = await send(
      'PATCH',
      `/api/users/${fixture.admin._id.toString()}/role`,
      adminLogin.cookie,
      { role: 'parent' },
    );
    expect(selfRole.statusCode).toBe(400);

    const audit = await get('/api/audit-logs?limit=10', adminLogin.cookie);
    expect(audit.statusCode).toBe(200);
    expect(audit.json().logs.length).toBeGreaterThan(0);
    expect(audit.json().logs[0].actorName).toBe('admin');
    expect((await get('/api/audit-logs', coachLogin.cookie)).statusCode).toBe(403);
  });

  it('refuses every management endpoint to a child session', async () => {
    const fixture = await createFixture();
    const childCookie = await loginChild(fixture.lina, fixture.groupA);

    const attempts = [
      await get('/api/groups', childCookie),
      await get(`/api/groups/${fixture.groupA._id.toString()}`, childCookie),
      await get('/api/students', childCookie),
      await get(`/api/students/${fixture.lina._id.toString()}`, childCookie),
      await get(`/api/students/${fixture.lina._id.toString()}/export`, childCookie),
      await get('/api/users', childCookie),
      await get('/api/audit-logs', childCookie),
      await send('POST', '/api/groups', childCookie, { name: 'Non' }),
      await send(
        'POST',
        `/api/groups/${fixture.groupA._id.toString()}/students`,
        childCookie,
        { displayName: 'Non', avatarId: 'chat' },
      ),
      await send(
        'PATCH',
        `/api/students/${fixture.lina._id.toString()}/group`,
        childCookie,
        { groupId: fixture.groupB._id.toString() },
      ),
      await send(
        'PATCH',
        `/api/users/${fixture.admin._id.toString()}/status`,
        childCookie,
        { disabled: true },
      ),
      await send(
        'DELETE',
        `/api/students/${fixture.lina._id.toString()}`,
        childCookie,
        { confirmName: 'Lina' },
      ),
    ];

    for (const attempt of attempts) {
      expect(attempt.statusCode).toBe(403);
    }
  });

  it('requires authentication on management endpoints', async () => {
    for (const url of ['/api/groups', '/api/students', '/api/users', '/api/audit-logs']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(401);
    }
  });
});
