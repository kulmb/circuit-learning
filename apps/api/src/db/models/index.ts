export {
  AuditLogModel,
  type AuditLog,
  type AuditLogDocument,
} from './auditLog.js';
export {
  GroupModel,
  GROUP_MEMBER_ROLES,
  type Group,
  type GroupDocument,
  type GroupMember,
  type GroupMemberRole,
} from './group.js';
export {
  InviteModel,
  INVITE_TYPES,
  type Invite,
  type InviteDocument,
  type InviteType,
} from './invite.js';
export {
  LevelAttemptModel,
  type LevelAttempt,
  type LevelAttemptDocument,
} from './levelAttempt.js';
export {
  LevelProgressModel,
  LEVEL_PROGRESS_STATUSES,
  type LevelProgress,
  type LevelProgressDocument,
  type LevelProgressStatus,
} from './levelProgress.js';
export {
  SandboxCircuitModel,
  MAX_SANDBOX_DATA_BYTES,
  isValidSandboxData,
  sandboxDataBytes,
  type SandboxCircuit,
  type SandboxCircuitDocument,
} from './sandboxCircuit.js';
export {
  SessionModel,
  SESSION_KINDS,
  type Session,
  type SessionDocument,
  type SessionKind,
} from './session.js';
export {
  EMAIL_PATTERN,
  UserModel,
  USER_ROLES,
  type User,
  type UserDocument,
  type UserRole,
  type VocabularyEntry,
} from './user.js';

import { AuditLogModel } from './auditLog.js';
import { GroupModel } from './group.js';
import { InviteModel } from './invite.js';
import { LevelAttemptModel } from './levelAttempt.js';
import { LevelProgressModel } from './levelProgress.js';
import { SandboxCircuitModel } from './sandboxCircuit.js';
import { SessionModel } from './session.js';
import { UserModel } from './user.js';

/** Creates the indexes declared on every schema (idempotent). */
export async function syncModelIndexes(): Promise<void> {
  await Promise.all([
    UserModel.syncIndexes(),
    GroupModel.syncIndexes(),
    SessionModel.syncIndexes(),
    InviteModel.syncIndexes(),
    LevelProgressModel.syncIndexes(),
    LevelAttemptModel.syncIndexes(),
    SandboxCircuitModel.syncIndexes(),
    AuditLogModel.syncIndexes(),
  ]);
}
