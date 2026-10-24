import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { USERNAME_PATTERN } from '../../services/username.js';

export const INVITE_TYPES = [
  'encadrant',
  'parent',
  'password_reset',
] as const;

export type InviteType = (typeof INVITE_TYPES)[number];

export interface Invite {
  tokenHash: string;
  type: InviteType;
  targetUserId: Types.ObjectId | null;
  childId: Types.ObjectId | null;
  /** Planned account for an encadrant or parent invitation. */
  username: string | null;
  displayName: string | null;
  createdBy: Types.ObjectId | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InviteDocument = HydratedDocument<Invite>;

const inviteSchema = new Schema<Invite>(
  {
    tokenHash: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: INVITE_TYPES },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    username: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: USERNAME_PATTERN,
    },
    displayName: { type: String, default: null, trim: true, maxlength: 80 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    collection: 'invites',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

inviteSchema.index(
  { tokenHash: 1 },
  { name: 'invites_token_hash_unique', unique: true },
);
inviteSchema.index(
  { expiresAt: 1 },
  { name: 'invites_expires_ttl', expireAfterSeconds: 0 },
);

inviteSchema.pre('validate', function validateInviteTargets() {
  if (
    this.type === 'parent' &&
    (this.childId === null || this.childId === undefined)
  ) {
    this.invalidate('childId', 'Une invitation parent doit viser un enfant.');
  }

  if (
    this.type === 'password_reset' &&
    (this.targetUserId === null || this.targetUserId === undefined)
  ) {
    this.invalidate(
      'targetUserId',
      'Une invitation de mot de passe doit viser un compte.',
    );
  }

  const hasText = (value: string | null | undefined): boolean =>
    typeof value === 'string' && value.trim().length > 0;

  if (
    this.type !== 'password_reset' &&
    (!hasText(this.username) || !hasText(this.displayName))
  ) {
    this.invalidate(
      'username',
      'Une invitation doit contenir le futur identifiant et son nom.',
    );
  }
});

export const InviteModel: Model<Invite> =
  (mongoose.models['Invite'] as Model<Invite> | undefined) ??
  model<Invite>('Invite', inviteSchema);
