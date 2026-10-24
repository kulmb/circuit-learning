import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export interface LevelAttempt {
  userId: Types.ObjectId;
  groupId: Types.ObjectId | null;
  levelId: string;
  startedAt: Date;
  endedAt: Date | null;
  success: boolean;
  hintsUsed: number;
  errorsDetected: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type LevelAttemptDocument = HydratedDocument<LevelAttempt>;

const levelAttemptSchema = new Schema<LevelAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    levelId: { type: String, required: true, trim: true, maxlength: 80 },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    success: { type: Boolean, default: false },
    hintsUsed: { type: Number, default: 0, min: 0 },
    errorsDetected: { type: [String], default: [] },
  },
  {
    collection: 'levelattempts',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

levelAttemptSchema.index(
  { userId: 1, startedAt: -1 },
  { name: 'levelattempts_user_started' },
);
levelAttemptSchema.index(
  { groupId: 1, levelId: 1 },
  { name: 'levelattempts_group_level' },
);

export const LevelAttemptModel: Model<LevelAttempt> =
  (mongoose.models['LevelAttempt'] as Model<LevelAttempt> | undefined) ??
  model<LevelAttempt>('LevelAttempt', levelAttemptSchema);
