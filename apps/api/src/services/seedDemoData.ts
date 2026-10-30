import type { PicturePatternId } from '@circuits/shared';
import mongoose from 'mongoose';

import {
  GroupModel,
  UserModel,
  type UserDocument,
} from '../db/models/index.js';
import { createAdminAccount } from './adminAccounts.js';
import { generateJoinCode } from './joinCode.js';
import { randomPicturePattern } from './picturePasswords.js';
import { hashSecret, pictureSecretFromPattern } from './secrets.js';

export const DEMO_GROUP_NAME = 'Équipe Camelot';

export const DEMO_STUDENTS = [
  { displayName: 'Lina', avatarId: 'renard' },
  { displayName: 'Noé', avatarId: 'panda' },
  { displayName: 'Mila', avatarId: 'fusee' },
] as const;

export const DEMO_VOCABULARY = ['circuitFerme', 'fil'] as const;

export interface SeedOptions {
  adminUsername: string;
  adminPassword: string;
  adminName?: string;
  groupName?: string;
}

export interface SeedResult {
  adminId: string;
  groupId: string;
  joinCode: string;
  studentIds: string[];
  createdAdmin: boolean;
  createdGroup: boolean;
  createdStudents: number;
  /** The random demo tap pattern. Never printed by the production seed. */
  picturePattern: PicturePatternId[];
}

/**
 * Creates (or completes) the demo accounts. Safe to run more than once: the
 * admin is matched by username, the group by name and creator, and students by
 * name inside that group.
 */
export async function seedDemoData(
  options: SeedOptions,
): Promise<SeedResult> {
  const adminResult = await createAdminAccount({
    username: options.adminUsername,
    password: options.adminPassword,
    displayName: options.adminName,
  });
  const admin = await UserModel.findById(adminResult.userId);
  const createdAdmin = adminResult.created;

  if (admin === null) {
    throw new Error('L’administrateur vient d’être créé mais reste introuvable.');
  }

  const groupName = options.groupName?.trim() || DEMO_GROUP_NAME;

  let group = await GroupModel.findOne({
    name: groupName,
    createdBy: admin._id,
  });
  let createdGroup = false;

  if (group === null) {
    group = await GroupModel.create({
      name: groupName,
      joinCode: generateJoinCode(),
      createdBy: admin._id,
      members: [],
    });
    createdGroup = true;
  }

  const memberIds = group.members.map((member) => member.userId);
  const existingStudents = await UserModel.find({
    _id: mongoose.trusted({ $in: memberIds }),
    role: 'eleve',
    displayName: mongoose.trusted({
      $in: DEMO_STUDENTS.map((student) => student.displayName),
    }),
  });
  const picturePattern = randomPicturePattern();
  const pictureHash = await hashSecret(
    pictureSecretFromPattern(picturePattern),
  );
  const now = new Date();
  const students: UserDocument[] = [];
  let createdStudents = 0;

  for (const demo of DEMO_STUDENTS) {
    let student = existingStudents.find(
      (candidate) => candidate.displayName === demo.displayName,
    );

    if (student === undefined) {
      student = await UserModel.create({
        role: 'eleve',
        displayName: demo.displayName,
        avatarId: demo.avatarId,
        pictureSecretHash: pictureHash,
        vocabulary: DEMO_VOCABULARY.map((wordId) => ({
          wordId,
          unlockedAt: now,
        })),
      });
      createdStudents += 1;
    }

    if (!group.members.some((member) => member.userId.equals(student._id))) {
      group.members.push({
        userId: student._id,
        roleInGroup: 'eleve',
        joinedAt: now,
      });
    }

    students.push(student);
  }

  await group.save();

  return {
    adminId: admin._id.toString(),
    groupId: group._id.toString(),
    joinCode: group.joinCode,
    studentIds: students.map((student) => student._id.toString()),
    createdAdmin,
    createdGroup,
    createdStudents,
    picturePattern,
  };
}
