import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const LEVEL_PROGRESS_STATUSES = [
  'locked',
  'unlocked',
  'completed',
] as const;

export type LevelProgressStatus = (typeof LEVEL_PROGRESS_STATUSES)[number];

export interface LevelProgress {
  userId: Types.ObjectId;
  levelId: string;
  status: LevelProgressStatus;
  stars: number;
  attempts: number;
  hintsUsed: number;
  bestTimeMs: number | null;
  firstCompletedAt: Date | null;
  lastPlayedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LevelProgressDocument = HydratedDocument<LevelProgress>;

const levelProgressSchema = new Schema<LevelProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    levelId: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      required: true,
      enum: LEVEL_PROGRESS_STATUSES,
      default: 'locked',
    },
    stars: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre d’étoiles doit être compris entre 0 et 3.'],
      max: [3, 'Le nombre d’étoiles doit être compris entre 0 et 3.'],
      validate: {
        validator: Number.isInteger,
        message: 'Le nombre d’étoiles doit être entier.',
      },
    },
    attempts: { type: Number, default: 0, min: 0 },
    hintsUsed: { type: Number, default: 0, min: 0 },
    bestTimeMs: { type: Number, default: null, min: 0 },
    firstCompletedAt: { type: Date, default: null },
    lastPlayedAt: { type: Date, default: null },
  },
  {
    collection: 'levelprogress',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

levelProgressSchema.index(
  { userId: 1, levelId: 1 },
  { name: 'levelprogress_user_level_unique', unique: true },
);

export const LevelProgressModel: Model<LevelProgress> =
  (mongoose.models['LevelProgress'] as Model<LevelProgress> | undefined) ??
  model<LevelProgress>('LevelProgress', levelProgressSchema);
