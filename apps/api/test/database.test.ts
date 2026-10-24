import { serializeCircuit } from '@circuits/shared';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/db/connection.js';
import {
  AuditLogModel,
  GroupModel,
  InviteModel,
  LevelAttemptModel,
  LevelProgressModel,
  SandboxCircuitModel,
  SessionModel,
  UserModel,
} from '../src/db/models/index.js';
import {
  deleteStudent,
  NotAStudentError,
  StudentNotFoundError,
} from '../src/services/deleteStudent.js';
import {
  generateJoinCode,
  JOIN_CODE_PATTERN,
} from '../src/services/joinCode.js';
import {
  DEMO_PICTURE_PATTERN,
  seedDemoData,
} from '../src/services/seedDemoData.js';
import {
  pictureSecretFromPattern,
  verifySecret,
} from '../src/services/secrets.js';

const TEST_DB_NAME = 'circuits_test';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    // Keep tests on the same major version as production (mongo:7).
    binary: { version: '7.0.28' },
  });

  await connectDatabase(replSet.getUri(TEST_DB_NAME));
});

afterAll(async () => {
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

function futureDate(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

async function indexNamed(
  model: { collection: { indexes: () => Promise<unknown[]> } },
  name: string,
): Promise<Record<string, unknown> | undefined> {
  const indexes = (await model.collection.indexes()) as Array<
    Record<string, unknown>
  >;

  return indexes.find((index) => index['name'] === name);
}

describe('indexes', () => {
  it('declares every required index from the schemas', async () => {
    const email = await indexNamed(UserModel, 'users_email_unique');
    expect(email).toMatchObject({
      key: { email: 1 },
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    });

    expect(await indexNamed(GroupModel, 'groups_join_code_unique')).toMatchObject({
      key: { joinCode: 1 },
      unique: true,
    });
    expect(await indexNamed(GroupModel, 'groups_members_user_id')).toMatchObject({
      key: { 'members.userId': 1 },
    });

    const sessionTtl = await indexNamed(SessionModel, 'sessions_expires_ttl');
    expect(sessionTtl).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
    expect(await indexNamed(SessionModel, 'sessions_user_id')).toMatchObject({
      key: { userId: 1 },
    });

    expect(
      await indexNamed(InviteModel, 'invites_token_hash_unique'),
    ).toMatchObject({ key: { tokenHash: 1 }, unique: true });
    expect(await indexNamed(InviteModel, 'invites_expires_ttl')).toMatchObject({
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
    });

    expect(
      await indexNamed(LevelProgressModel, 'levelprogress_user_level_unique'),
    ).toMatchObject({
      key: { userId: 1, levelId: 1 },
      unique: true,
    });

    expect(
      await indexNamed(LevelAttemptModel, 'levelattempts_user_started'),
    ).toMatchObject({ key: { userId: 1, startedAt: -1 } });
    expect(
      await indexNamed(LevelAttemptModel, 'levelattempts_group_level'),
    ).toMatchObject({ key: { groupId: 1, levelId: 1 } });
  });
});

describe('users', () => {
  it('allows several accounts without email but only one per email', async () => {
    await UserModel.create({
      role: 'admin',
      displayName: 'Admin',
      email: 'Admin@Example.com',
      passwordHash: 'hash',
    });
    await UserModel.create({
      role: 'admin',
      displayName: 'Sans e-mail 1',
      passwordHash: 'hash',
    });
    await UserModel.create({
      role: 'encadrant',
      displayName: 'Sans e-mail 2',
      email: '',
      passwordHash: 'hash',
    });

    const stored = await UserModel.findOne({ email: 'admin@example.com' });
    expect(stored?.displayName).toBe('Admin');

    await expect(
      UserModel.create({
        role: 'parent',
        displayName: 'Doublon',
        email: 'admin@example.com',
        passwordHash: 'hash',
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('keeps adult credentials and picture secrets on the right roles', async () => {
    await expect(
      UserModel.create({
        role: 'eleve',
        displayName: 'Lina',
        pictureSecretHash: 'hash',
        email: 'lina@example.com',
      }),
    ).rejects.toThrow(/adresse e-mail/i);

    await expect(
      UserModel.create({
        role: 'eleve',
        displayName: 'Lina',
        pictureSecretHash: 'hash',
        passwordHash: 'hash',
      }),
    ).rejects.toThrow(/mot de passe/i);

    await expect(
      UserModel.create({
        role: 'admin',
        displayName: 'Admin',
        pictureSecretHash: 'hash',
      }),
    ).rejects.toThrow(/mot de passe image/i);

    const student = await UserModel.create({
      role: 'eleve',
      displayName: 'Lina',
      avatarId: 'renard',
      pictureSecretHash: 'hash',
    });

    expect(student.email).toBeNull();
    expect(student.role).toBe('eleve');
  });
});

describe('groups', () => {
  it('generates six-character codes without 0, O, 1 or I', () => {
    for (let index = 0; index < 200; index += 1) {
      const code = generateJoinCode();

      expect(code).toHaveLength(6);
      expect(code).toMatch(JOIN_CODE_PATTERN);
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it('rejects a duplicate join code', async () => {
    const createdBy = new Types.ObjectId();

    await GroupModel.create({
      name: 'CE2 B',
      joinCode: 'ABC234',
      createdBy,
    });

    await expect(
      GroupModel.create({
        name: 'CE2 C',
        joinCode: 'ABC234',
        createdBy,
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('progress and attempts', () => {
  it('enforces one progress row per student and level', async () => {
    const userId = new Types.ObjectId();

    await LevelProgressModel.create({
      userId,
      levelId: 'light-01',
      status: 'completed',
      stars: 3,
    });

    await expect(
      LevelProgressModel.create({ userId, levelId: 'light-01' }),
    ).rejects.toMatchObject({ code: 11000 });

    await expect(
      LevelProgressModel.create({
        userId: new Types.ObjectId(),
        levelId: 'light-01',
        stars: 4,
      }),
    ).rejects.toThrow(/étoiles/i);

    await expect(
      LevelProgressModel.create({
        userId: new Types.ObjectId(),
        levelId: 'light-01',
        status: 'maybe' as unknown as 'locked',
      }),
    ).rejects.toThrow();
  });

  it('stores attempts with the denormalized group', async () => {
    const attempt = await LevelAttemptModel.create({
      userId: new Types.ObjectId(),
      groupId: new Types.ObjectId(),
      levelId: 'light-02',
      success: true,
      hintsUsed: 1,
      errorsDetected: ['open_circuit'],
    });

    expect(attempt.success).toBe(true);
    expect(attempt.errorsDetected).toEqual(['open_circuit']);
  });
});

describe('sandbox circuits', () => {
  it('accepts a serialized circuit', async () => {
    const data = serializeCircuit({ components: [], wires: [] });
    const saved = await SandboxCircuitModel.create({
      userId: new Types.ObjectId(),
      name: 'Mon circuit',
      data,
    });

    expect(saved.name).toBe('Mon circuit');
  });

  it('rejects invalid data and documents over 200 KB', async () => {
    const data = serializeCircuit({ components: [], wires: [] });

    await expect(
      SandboxCircuitModel.create({
        userId: new Types.ObjectId(),
        name: 'Invalide',
        data: { version: 999, components: [], wires: [] },
      }),
    ).rejects.toThrow(/invalide/i);

    await expect(
      SandboxCircuitModel.create({
        userId: new Types.ObjectId(),
        name: 'Trop gros',
        data: { ...data, blob: 'x'.repeat(201 * 1024) },
      }),
    ).rejects.toThrow(/200 Ko/i);
  });
});

describe('invites and audit logs', () => {
  it('requires the right target for parent and reset invites', async () => {
    await expect(
      InviteModel.create({
        tokenHash: 'parent-token',
        type: 'parent',
        expiresAt: futureDate(),
      }),
    ).rejects.toThrow(/enfant/i);

    await expect(
      InviteModel.create({
        tokenHash: 'reset-token',
        type: 'password_reset',
        expiresAt: futureDate(),
      }),
    ).rejects.toThrow(/compte/i);

    const invite = await InviteModel.create({
      tokenHash: 'encadrant-token',
      type: 'encadrant',
      expiresAt: futureDate(),
    });

    await expect(
      InviteModel.create({
        tokenHash: 'encadrant-token',
        type: 'encadrant',
        expiresAt: futureDate(),
      }),
    ).rejects.toMatchObject({ code: 11000 });

    expect(invite.usedAt).toBeNull();
  });

  it('keeps only createdAt on audit entries', async () => {
    const log = await AuditLogModel.create({
      actorId: new Types.ObjectId(),
      action: 'delete_student',
      targetType: 'user',
      targetId: new Types.ObjectId(),
    });
    const raw = log.toObject();

    expect(raw.createdAt).toBeInstanceOf(Date);
    expect('updatedAt' in raw).toBe(false);
  });
});

describe('seed', () => {
  it('creates the demo admin, group and students once', async () => {
    const first = await seedDemoData({
      adminEmail: 'Admin@Example.com',
      adminPassword: ADMIN_PASSWORD,
      adminName: 'Admin Démo',
    });

    expect(first.createdAdmin).toBe(true);
    expect(first.createdGroup).toBe(true);
    expect(first.createdStudents).toBe(3);
    expect(first.joinCode).toMatch(JOIN_CODE_PATTERN);
    expect(await UserModel.countDocuments()).toBe(4);
    expect(await GroupModel.countDocuments()).toBe(1);

    const admin = await UserModel.findOne({ email: 'admin@example.com' }).select(
      '+passwordHash',
    );

    expect(admin?.role).toBe('admin');
    if (admin?.passwordHash === null || admin?.passwordHash === undefined) {
      throw new Error('The admin password hash is missing');
    }
    expect(await verifySecret(admin.passwordHash, ADMIN_PASSWORD)).toBe(true);

    const group = await GroupModel.findById(first.groupId);
    expect(group?.members).toHaveLength(3);

    const [firstStudentId] = first.studentIds;
    if (firstStudentId === undefined) {
      throw new Error('The seed did not create students');
    }

    const student = await UserModel.findById(firstStudentId).select(
      '+pictureSecretHash',
    );
    expect(student?.avatarId).toBe('renard');
    if (
      student?.pictureSecretHash === null ||
      student?.pictureSecretHash === undefined
    ) {
      throw new Error('The student picture secret is missing');
    }
    expect(
      await verifySecret(
        student.pictureSecretHash,
        pictureSecretFromPattern(DEMO_PICTURE_PATTERN),
      ),
    ).toBe(true);

    const second = await seedDemoData({
      adminEmail: 'admin@example.com',
      adminPassword: ADMIN_PASSWORD,
      adminName: 'Admin Démo',
    });

    expect(second.createdAdmin).toBe(false);
    expect(second.createdGroup).toBe(false);
    expect(second.createdStudents).toBe(0);
    expect(second.joinCode).toBe(first.joinCode);
    expect(await UserModel.countDocuments()).toBe(4);
    expect(await GroupModel.countDocuments()).toBe(1);
    expect((await GroupModel.findById(first.groupId))?.members).toHaveLength(3);
  });
});

describe('deleteStudent', () => {
  it('removes the student and every trace in one transaction', async () => {
    const adminId = new Types.ObjectId();
    await UserModel.create({
      _id: adminId,
      role: 'admin',
      displayName: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'hash',
    });

    const student = await UserModel.create({
      role: 'eleve',
      displayName: 'Lina',
      avatarId: 'renard',
      pictureSecretHash: 'hash',
    });
    const other = await UserModel.create({
      role: 'eleve',
      displayName: 'Noé',
      avatarId: 'panda',
      pictureSecretHash: 'hash',
    });
    const parent = await UserModel.create({
      role: 'parent',
      displayName: 'Parent',
      email: 'parent@example.com',
      passwordHash: 'hash',
      parentOf: [student._id],
    });
    const group = await GroupModel.create({
      name: 'CE2 B',
      joinCode: 'ABC234',
      createdBy: adminId,
      members: [
        {
          userId: student._id,
          roleInGroup: 'eleve',
          joinedAt: new Date(),
        },
        {
          userId: other._id,
          roleInGroup: 'eleve',
          joinedAt: new Date(),
        },
      ],
    });

    await LevelProgressModel.create({
      userId: student._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 3,
    });
    await LevelAttemptModel.create({
      userId: student._id,
      groupId: group._id,
      levelId: 'light-01',
      success: true,
    });
    await SandboxCircuitModel.create({
      userId: student._id,
      name: 'Mon circuit',
      data: serializeCircuit({ components: [], wires: [] }),
    });
    await SessionModel.create([
      { userId: student._id, kind: 'child', expiresAt: futureDate() },
      { userId: parent._id, kind: 'adult', expiresAt: futureDate() },
    ]);
    await InviteModel.create([
      {
        tokenHash: 'parent-invite',
        type: 'parent',
        childId: student._id,
        expiresAt: futureDate(),
      },
      {
        tokenHash: 'reset-invite',
        type: 'password_reset',
        targetUserId: student._id,
        expiresAt: futureDate(),
      },
      {
        tokenHash: 'parent-reset',
        type: 'password_reset',
        targetUserId: parent._id,
        expiresAt: futureDate(),
      },
    ]);

    const result = await deleteStudent(student._id);

    expect(result).toEqual({
      groupsUpdated: 1,
      parentsUpdated: 1,
      progressDeleted: 1,
      attemptsDeleted: 1,
      circuitsDeleted: 1,
      sessionsDeleted: 1,
      invitesDeleted: 2,
    });

    expect(await UserModel.findById(student._id)).toBeNull();
    expect(await LevelProgressModel.countDocuments({ userId: student._id })).toBe(0);
    expect(await LevelAttemptModel.countDocuments({ userId: student._id })).toBe(0);
    expect(await SandboxCircuitModel.countDocuments({ userId: student._id })).toBe(0);
    expect(await SessionModel.countDocuments({ userId: student._id })).toBe(0);
    expect(
      await InviteModel.countDocuments(
        mongoose.trusted({
          $or: [{ childId: student._id }, { targetUserId: student._id }],
        }),
      ),
    ).toBe(0);

    const updatedGroup = await GroupModel.findById(group._id);
    expect(updatedGroup?.members).toHaveLength(1);
    expect(updatedGroup?.members[0]?.userId.equals(other._id)).toBe(true);

    const updatedParent = await UserModel.findById(parent._id);
    expect(updatedParent).not.toBeNull();
    expect(
      updatedParent?.parentOf.some((id) => id.equals(student._id)),
    ).toBe(false);

    expect(await UserModel.findById(other._id)).not.toBeNull();
    expect(await SessionModel.countDocuments({ userId: parent._id })).toBe(1);
    expect(await InviteModel.countDocuments()).toBe(1);
  });

  it('rolls back every deletion when a step fails', async () => {
    const student = await UserModel.create({
      role: 'eleve',
      displayName: 'Lina',
      pictureSecretHash: 'hash',
    });
    await LevelProgressModel.create({
      userId: student._id,
      levelId: 'light-01',
      status: 'completed',
      stars: 3,
    });

    const spy = vi
      .spyOn(GroupModel, 'updateMany')
      .mockImplementationOnce(() => {
        throw new Error('boom');
      });

    await expect(deleteStudent(student._id)).rejects.toThrow('boom');
    spy.mockRestore();

    expect(await UserModel.findById(student._id)).not.toBeNull();
    expect(await LevelProgressModel.countDocuments({ userId: student._id })).toBe(
      1,
    );
  });

  it('refuses to delete an account that is not a student', async () => {
    const admin = await UserModel.create({
      role: 'admin',
      displayName: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'hash',
    });

    await expect(deleteStudent(admin._id)).rejects.toBeInstanceOf(
      NotAStudentError,
    );
    expect(await UserModel.findById(admin._id)).not.toBeNull();
  });

  it('reports an unknown or malformed student id', async () => {
    await expect(deleteStudent(new Types.ObjectId())).rejects.toBeInstanceOf(
      StudentNotFoundError,
    );
    await expect(deleteStudent('not-an-object-id')).rejects.toBeInstanceOf(
      StudentNotFoundError,
    );
  });
});

describe('migration', () => {
  it('creates and drops every index', async () => {
    const db = mongoose.connection.getClient().db('migration_checks');
    await db.dropDatabase();

    const migrationUrl = new URL(
      '../migrations/20261024000001-create-indexes.js',
      import.meta.url,
    );
    const migration = (await import(migrationUrl.href)) as {
      up: (database: typeof db) => Promise<void>;
      down: (database: typeof db) => Promise<void>;
    };

    await migration.up(db);

    const names = async (collection: string): Promise<(string | undefined)[]> =>
      (await db.collection(collection).indexes()).map((index) => index.name);

    expect(await names('users')).toContain('users_email_unique');
    expect(await names('groups')).toContain('groups_join_code_unique');
    expect(await names('groups')).toContain('groups_members_user_id');
    expect(await names('sessions')).toContain('sessions_expires_ttl');
    expect(await names('sessions')).toContain('sessions_user_id');
    expect(await names('invites')).toContain('invites_token_hash_unique');
    expect(await names('invites')).toContain('invites_expires_ttl');
    expect(await names('levelprogress')).toContain(
      'levelprogress_user_level_unique',
    );
    expect(await names('levelattempts')).toContain(
      'levelattempts_user_started',
    );
    expect(await names('levelattempts')).toContain(
      'levelattempts_group_level',
    );

    const emailIndex = (await db.collection('users').indexes()).find(
      (index) => index.name === 'users_email_unique',
    );
    expect(emailIndex).toMatchObject({
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    });
    const sessionTtl = (await db.collection('sessions').indexes()).find(
      (index) => index.name === 'sessions_expires_ttl',
    );
    expect(sessionTtl?.expireAfterSeconds).toBe(0);

    await migration.down(db);

    expect(await names('users')).not.toContain('users_email_unique');
    expect(await names('groups')).not.toContain('groups_join_code_unique');
    expect(await names('groups')).not.toContain('groups_members_user_id');
    expect(await names('sessions')).not.toContain('sessions_expires_ttl');
    expect(await names('invites')).not.toContain('invites_token_hash_unique');
    expect(await names('levelprogress')).not.toContain(
      'levelprogress_user_level_unique',
    );
    expect(await names('levelattempts')).not.toContain(
      'levelattempts_user_started',
    );

    await db.dropDatabase();
  });
});
