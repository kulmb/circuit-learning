import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from 'mongoose';

/**
 * A per-username, per-IP failure counter. The account itself is never locked,
 * so an attacker from one address cannot deny service to the real user from
 * another address.
 */
export interface LoginThrottle {
  /** `${username}:${ip}`, normalized before storage. */
  key: string;
  username: string;
  ip: string;
  failures: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LoginThrottleDocument = HydratedDocument<LoginThrottle>;

const loginThrottleSchema = new Schema<LoginThrottle>(
  {
    key: { type: String, required: true, trim: true, maxlength: 200 },
    username: { type: String, required: true, trim: true, maxlength: 80 },
    ip: { type: String, required: true, trim: true, maxlength: 100 },
    failures: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
  },
  {
    collection: 'loginthrottles',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

loginThrottleSchema.index(
  { key: 1 },
  { name: 'loginthrottles_key_unique', unique: true },
);
loginThrottleSchema.index(
  { username: 1 },
  { name: 'loginthrottles_username' },
);
// Forget accumulated counters after one quiet day.
loginThrottleSchema.index(
  { updatedAt: 1 },
  {
    name: 'loginthrottles_updated_ttl',
    expireAfterSeconds: 24 * 60 * 60,
  },
);

export const LoginThrottleModel: Model<LoginThrottle> =
  (mongoose.models['LoginThrottle'] as Model<LoginThrottle> | undefined) ??
  model<LoginThrottle>('LoginThrottle', loginThrottleSchema);
