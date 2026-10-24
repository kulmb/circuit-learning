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
  expiresAt: Date;
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
    expiresAt: { type: Date, required: true },
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

export const SessionModel: Model<Session> =
  (mongoose.models['Session'] as Model<Session> | undefined) ??
  model<Session>('Session', sessionSchema);
