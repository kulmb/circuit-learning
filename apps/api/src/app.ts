import Fastify, { type FastifyInstance } from 'fastify';

import { API_HEALTH_PATH, type HealthResponse } from '@circuits/shared';

export interface BuildAppOptions {
  logger?: boolean;
}

export function buildApp({ logger = true }: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger });

  app.get<{ Reply: HealthResponse }>(API_HEALTH_PATH, async () => ({ ok: true }));

  return app;
}
