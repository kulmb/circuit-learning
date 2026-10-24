import type {
  AuthSessionResponse,
  GroupChildrenResponse,
  InviteCreatedResponse,
  InvitePreviewResponse,
} from '@circuits/shared';

import type {
  GroupDocument,
  InviteDocument,
  SessionDocument,
  UserDocument,
} from '../db/models/index.js';
import type { ChildGroup } from '../services/children.js';
import { publicInviteUrl, type InvitePreview } from '../services/invites.js';

export function toGroupSummary(
  group: Pick<GroupDocument, '_id' | 'name' | 'joinCode'>,
): { id: string; name: string; joinCode: string } {
  return {
    id: group._id.toString(),
    name: group.name,
    joinCode: group.joinCode,
  };
}

export function toAuthUser(
  user: UserDocument,
  group: GroupDocument | null,
): AuthSessionResponse['user'] {
  return {
    id: user._id.toString(),
    role: user.role,
    displayName: user.displayName,
    username: user.username ?? null,
    avatarId: user.avatarId ?? null,
    group: group === null ? null : toGroupSummary(group),
  };
}

export function toSessionInfo(
  session: SessionDocument,
): AuthSessionResponse['session'] {
  return {
    kind: session.kind,
    expiresAt: session.expiresAt.toISOString(),
  };
}

export function toAuthSession(
  user: UserDocument,
  session: SessionDocument,
  group: GroupDocument | null,
): AuthSessionResponse {
  return {
    user: toAuthUser(user, group),
    session: toSessionInfo(session),
  };
}

export function toGroupChildren(
  childGroup: ChildGroup,
  pinned: boolean,
): GroupChildrenResponse {
  return {
    group: toGroupSummary(childGroup.group),
    students: childGroup.students.map((student) => ({
      id: student._id.toString(),
      displayName: student.displayName,
      avatarId: student.avatarId ?? null,
    })),
    pinned,
  };
}

export function toInviteCreated(
  invite: InviteDocument,
  token: string,
  origin: string,
): InviteCreatedResponse {
  return {
    invite: {
      id: invite._id.toString(),
      type: invite.type,
      username: invite.username,
      displayName: invite.displayName,
      expiresAt: invite.expiresAt.toISOString(),
      url: publicInviteUrl(origin, token),
    },
  };
}

export function toInvitePreview(
  preview: InvitePreview,
): InvitePreviewResponse {
  return {
    type: preview.type,
    role: preview.role,
    displayName: preview.displayName,
    username: preview.username,
    childName: preview.childName,
    expiresAt: preview.expiresAt.toISOString(),
  };
}
