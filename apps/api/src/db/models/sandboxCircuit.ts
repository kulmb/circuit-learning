import { deserializeCircuit } from '@circuits/shared';
import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const MAX_SANDBOX_DATA_BYTES = 200 * 1024;

export interface SandboxCircuit {
  userId: Types.ObjectId;
  /** Client-generated id used by PUT /api/me/sandbox/:id. */
  clientId: string | null;
  name: string;
  data: unknown;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SandboxCircuitDocument = HydratedDocument<SandboxCircuit>;

export function sandboxDataBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);

    return json === undefined ? Number.POSITIVE_INFINITY : Buffer.byteLength(json, 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function isValidSandboxData(value: unknown): boolean {
  try {
    deserializeCircuit(value);
  } catch {
    return false;
  }

  return sandboxDataBytes(value) <= MAX_SANDBOX_DATA_BYTES;
}

const sandboxCircuitSchema = new Schema<SandboxCircuit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: { type: String, default: null, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    data: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: isValidSandboxData,
        message: 'Le circuit est invalide ou dépasse 200 Ko.',
      },
    },
    thumbnail: { type: String, default: null },
  },
  {
    collection: 'sandboxcircuits',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

sandboxCircuitSchema.index(
  { userId: 1, clientId: 1 },
  {
    name: 'sandbox_user_client_unique',
    unique: true,
    partialFilterExpression: { clientId: { $type: 'string' } },
  },
);

export const SandboxCircuitModel: Model<SandboxCircuit> =
  (mongoose.models['SandboxCircuit'] as Model<SandboxCircuit> | undefined) ??
  model<SandboxCircuit>('SandboxCircuit', sandboxCircuitSchema);
