import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

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
});

export const InviteModel: Model<Invite> =
  (mongoose.models['Invite'] as Model<Invite> | undefined) ??
  model<Invite>('Invite', inviteSchema);
