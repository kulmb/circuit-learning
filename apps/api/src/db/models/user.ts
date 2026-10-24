import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const USER_ROLES = ['admin', 'encadrant', 'parent', 'eleve'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface VocabularyEntry {
  wordId: string;
  unlockedAt: Date;
}

export interface User {
  role: UserRole;
  displayName: string;
  avatarId: string | null;
  email: string | null;
  passwordHash: string | null;
  pictureSecretHash: string | null;
  failedLogins: number;
  lockedUntil: Date | null;
  lastSeenAt: Date | null;
  disabledAt: Date | null;
  parentOf: Types.ObjectId[];
  vocabulary: VocabularyEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const vocabularySchema = new Schema<VocabularyEntry>(
  {
    wordId: { type: String, required: true, trim: true, maxlength: 80 },
    unlockedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false, strict: 'throw' },
);

const userSchema = new Schema<User>(
  {
    role: { type: String, required: true, enum: USER_ROLES },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    avatarId: { type: String, default: null, trim: true, maxlength: 80 },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: EMAIL_PATTERN,
      // An empty input means "no email", not an empty unique key.
      set: (value: string | null | undefined) =>
        value === undefined || value === null || value.trim() === ''
          ? null
          : value,
    },
    passwordHash: { type: String, default: null, select: false },
    pictureSecretHash: { type: String, default: null, select: false },
    failedLogins: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    disabledAt: { type: Date, default: null },
    parentOf: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    vocabulary: { type: [vocabularySchema], default: [] },
  },
  {
    collection: 'users',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

// Mongoose cannot express a partial unique index with `unique: true` on the
// field. Only documents that actually have an email participate.
userSchema.index(
  { email: 1 },
  {
    name: 'users_email_unique',
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  },
);

userSchema.pre('validate', function validateRoles() {
  if (this.role === 'eleve') {
    if (this.email !== null && this.email !== undefined) {
      this.invalidate('email', 'Un élève ne peut pas avoir d’adresse e-mail.');
    }
    if (this.passwordHash !== null && this.passwordHash !== undefined) {
      this.invalidate('passwordHash', 'Un élève ne peut pas avoir de mot de passe.');
    }
  } else if (
    this.pictureSecretHash !== null &&
    this.pictureSecretHash !== undefined
  ) {
    this.invalidate(
      'pictureSecretHash',
      'Seul un élève peut avoir un mot de passe image.',
    );
  }
});

export const UserModel: Model<User> =
  (mongoose.models['User'] as Model<User> | undefined) ??
  model<User>('User', userSchema);
