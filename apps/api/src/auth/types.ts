import type {
  SessionDocument,
  UserDocument,
} from '../db/models/index.js';

export interface AuthContext {
  user: UserDocument;
  session: SessionDocument;
  token: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}
