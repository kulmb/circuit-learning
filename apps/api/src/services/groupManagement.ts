import { OBJECT_ID_PATTERN } from '@circuits/shared';

import {
  AuditLogModel,
  GroupModel,
  SessionModel,
  type GroupDocument,
  type UserDocument,
} from '../db/models/index.js';
import {
  userCanAccessGroup,
  userCanManageGroup,
} from '../auth/access.js';
import { ApiError, forbidden, notFound } from './errors.js';
import { generateJoinCode } from './joinCode.js';

async function nextJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateJoinCode();

    if ((await GroupModel.exists({ joinCode: code })) === null) {
      return code;
    }
  }

  throw new ApiError(
    500,
    'join_code_unavailable',
    'Impossible de créer un code de groupe.',
  );
}

export async function listGroupsFor(
  actor: UserDocument,
  includeArchived: boolean,
): Promise<GroupDocument[]> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  const groups = await GroupModel.find(
    includeArchived ? {} : { archivedAt: null },
  );

  return groups
    .filter((group) => userCanAccessGroup(actor, group))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function createGroup(
  actor: UserDocument,
  name: string,
): Promise<GroupDocument> {
  if (actor.role !== 'admin' && actor.role !== 'encadrant') {
    throw forbidden();
  }

  const group = await GroupModel.create({
    name,
    joinCode: await nextJoinCode(),
    createdBy: actor._id,
    members:
      actor.role === 'encadrant'
        ? [
            {
              userId: actor._id,
              roleInGroup: 'encadrant',
              joinedAt: new Date(),
            },
          ]
        : [],
  });

  await AuditLogModel.create({
    actorId: actor._id,
    action: 'create_group',
    targetType: 'group',
    targetId: group._id,
  });

  return group;
}

async function groupForManagement(
  actor: UserDocument,
  groupId: string,
): Promise<GroupDocument> {
  if (!OBJECT_ID_PATTERN.test(groupId)) {
    throw notFound('Groupe introuvable.');
  }

  const group = await GroupModel.findById(groupId);

  if (group === null) {
    throw notFound('Groupe introuvable.');
  }

  if (!userCanManageGroup(actor, group)) {
    throw forbidden('Seul le créateur du groupe peut le modifier.');
  }

  return group;
}

export interface GroupChanges {
  name?: string | undefined;
  archived?: boolean | undefined;
}

export async function updateGroup(
  actor: UserDocument,
  groupId: string,
  changes: GroupChanges,
): Promise<GroupDocument> {
  const group = await groupForManagement(actor, groupId);

  if (changes.name !== undefined && changes.name !== group.name) {
    group.name = changes.name;
  }

  if (changes.archived !== undefined) {
    const wasArchived = group.archivedAt !== null;
    group.archivedAt = changes.archived ? new Date() : null;

    if (changes.archived && !wasArchived) {
      // A child must sign in again after the group reopens.
      await SessionModel.deleteMany({
        groupId: group._id,
        kind: 'child',
      });
    }
  }

  await group.save();

  if (changes.name !== undefined) {
    await AuditLogModel.create({
      actorId: actor._id,
      action: 'rename_group',
      targetType: 'group',
      targetId: group._id,
    });
  }

  if (changes.archived !== undefined) {
    await AuditLogModel.create({
      actorId: actor._id,
      action: changes.archived ? 'archive_group' : 'unarchive_group',
      targetType: 'group',
      targetId: group._id,
    });
  }

  return group;
}

export async function regenerateJoinCode(
  actor: UserDocument,
  groupId: string,
): Promise<GroupDocument> {
  const group = await groupForManagement(actor, groupId);
  group.joinCode = await nextJoinCode();
  await group.save();

  await AuditLogModel.create({
    actorId: actor._id,
    action: 'regenerate_join_code',
    targetType: 'group',
    targetId: group._id,
  });

  return group;
}

export async function requireActiveGroup(
  actor: UserDocument,
  groupId: string,
): Promise<GroupDocument> {
  if (!OBJECT_ID_PATTERN.test(groupId)) {
    throw notFound('Groupe introuvable.');
  }

  const group = await GroupModel.findById(groupId);

  if (group === null) {
    throw notFound('Groupe introuvable.');
  }

  if (!userCanAccessGroup(actor, group)) {
    throw forbidden('Tu n’as pas accès à ce groupe.');
  }

  if (group.archivedAt !== null) {
    throw new ApiError(
      400,
      'group_archived',
      'Ce groupe est archivé. Réactive-le d’abord.',
    );
  }

  return group;
}
