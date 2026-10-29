import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const SESSION_KINDS = ['adult', 'child'] as const;

export type SessionKind = (typeof SESSION_KINDS)[number];

export interface Session {
  userId: Types.ObjectId;
  /** SHA-256 of the random cookie token. The raw token never reaches MongoDB. */
  tokenHash: string | null;
  /** Group chosen by a child when signing in on a shared device. */
  groupId: Types.ObjectId | null;
  expiresAt: Date;
  /**
   * Hard deadline that sliding renewal must never pass. Null on sessions
   * created before the field existed; sessions.ts falls back to createdAt.
   */
  absoluteExpiresAt: Date | null;
  userAgent: string;
  kind: SessionKind;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<Session>;

const sessionSchema = new Schema<Session>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: { type: String, default: null, select: false },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, default: null },
    userAgent: { type: String, default: '', trim: true, maxlength: 512 },
    kind: { type: String, required: true, enum: SESSION_KINDS },
  },
  {
    collection: 'sessions',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

sessionSchema.index(
  { expiresAt: 1 },
  { name: 'sessions_expires_ttl', expireAfterSeconds: 0 },
);
sessionSchema.index({ userId: 1 }, { name: 'sessions_user_id' });
// Only sessions created by the authentication routes carry a token hash; the
// index stays partial so old or test-created rows remain valid.
sessionSchema.index(
  { tokenHash: 1 },
  {
    name: 'sessions_token_hash_unique',
    unique: true,
    partialFilterExpression: { tokenHash: { $type: 'string' } },
  },
);

export const SessionModel: Model<Session> =
  (mongoose.models['Session'] as Model<Session> | undefined) ??
  model<Session>('Session', sessionSchema);
