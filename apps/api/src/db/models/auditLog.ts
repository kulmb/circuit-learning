import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export interface AuditLog {
  actorId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: Types.ObjectId;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

const auditLogSchema = new Schema<AuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    targetType: { type: String, required: true, trim: true, maxlength: 80 },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    collection: 'auditlogs',
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
    autoIndex: false,
  },
);

export const AuditLogModel: Model<AuditLog> =
  (mongoose.models['AuditLog'] as Model<AuditLog> | undefined) ??
  model<AuditLog>('AuditLog', auditLogSchema);
