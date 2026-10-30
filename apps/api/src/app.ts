import {
  API_HEALTH_PATH,
  apiErrorSchema,
  type HealthResponse,
} from '@circuits/shared';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import { ZodError } from 'zod';

import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { groupRoutes } from './routes/groups.js';
import { meRoutes } from './routes/me.js';
import { studentRoutes } from './routes/students.js';
import { userRoutes } from './routes/users.js';
import { ApiError } from './services/errors.js';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  cookieSecret?: string;
  secureCookies?: boolean;
  publicOrigin?: string;
  rateLimitMax?: number;
  trustProxy?: boolean;
}

export function buildApp({
  logger = true,
  cookieSecret = config.cookieSecret,
  secureCookies = config.secureCookies,
  publicOrigin = config.publicOrigin,
  rateLimitMax = 10,
  trustProxy = config.trustProxy,
}: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger,
    trustProxy,
    // Fastify's default request log writes the raw URL. Invite and password
    // reset tokens live in the path, so that would put account-takeover
    // credentials in the logs. Log the route template instead.
    logController: new LogController({ disableRequestLogging: true }),
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? null,
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request',
    );
  });

  app.decorateRequest('auth', null);

  // Service-worker caching is strict: only the public health probe may be
  // stored. Everything else (progress, sandbox, groups, students, auth) is
  // personal data and never enters CacheStorage.
  app.addHook('onSend', async (request, reply, payload) => {
    const pathname = request.url.split('?')[0] ?? request.url;

    if (pathname === API_HEALTH_PATH) {
      reply.header('Cache-Control', 'public');
    } else if (pathname.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store');
    }

    return payload;
  });

  const allowedOrigins = new Set([originOf(publicOrigin)]);
  if (config.nodeEnv !== 'production') {
    allowedOrigins.add('http://localhost:5173');
  }

  // SameSite=Lax already blocks cross-site form posts; this also rejects a
  // state-changing request sent by a page from another origin.
  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
      return;
    }

    const origin = request.headers.origin;

    if (
      typeof origin === 'string' &&
      origin.length > 0 &&
      !allowedOrigins.has(originOf(origin))
    ) {
      throw new ApiError(403, 'origin_not_allowed', 'Origine non autorisée.');
    }
  });

  void app.register(cookie, { secret: cookieSecret });
  void app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: {
        code: 'rate_limited',
        message: 'Trop de tentatives. Patiente un peu.',
      },
    }),
  });

  app.get<{ Reply: HealthResponse }>(API_HEALTH_PATH, async () => ({ ok: true }));

  void app.register(authRoutes, {
    cookies: { secure: secureCookies },
    publicOrigin,
    rateLimitMax,
  });
  void app.register(groupRoutes, { cookies: { secure: secureCookies } });
  void app.register(studentRoutes, { cookies: { secure: secureCookies } });
  void app.register(userRoutes, { cookies: { secure: secureCookies } });
  void app.register(meRoutes, { cookies: { secure: secureCookies } });

  app.setErrorHandler(
    (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof ApiError) {
        if (error.retryAfterSeconds !== undefined) {
          reply.header('Retry-After', String(error.retryAfterSeconds));
        }
        sendApiError(reply, error.statusCode, error.code, error.message);
        return;
      }

      if (error instanceof ZodError) {
        sendApiError(
          reply,
          400,
          'validation_failed',
          'Les informations envoyées ne sont pas valides.',
        );
        return;
      }

      if (isDuplicateKey(error)) {
        sendApiError(
          reply,
          409,
          'conflict',
          'Cet identifiant est déjà utilisé.',
        );
        return;
      }

      const statusCode = readStatusCode(error);

      if (statusCode === 429) {
        sendApiError(
          reply,
          429,
          'rate_limited',
          'Trop de tentatives. Patiente un peu.',
        );
        return;
      }

      if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
        const tooLarge = statusCode === 413;
        sendApiError(
          reply,
          statusCode,
          tooLarge ? 'payload_too_large' : 'bad_request',
          tooLarge
            ? 'La demande est trop grosse.'
            : 'La demande n’est pas valide.',
        );
        return;
      }

      request.log.error({ err: error }, 'Unhandled API error');
      sendApiError(
        reply,
        500,
        'internal_error',
        'Une erreur interne est survenue.',
      );
    },
  );

  app.setNotFoundHandler((_request, reply) => {
    sendApiError(reply, 404, 'not_found', 'Ressource introuvable.');
  });

  return app;
}

function sendApiError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
): void {
  reply.code(statusCode).send(apiErrorSchema.parse({ error: { code, message } }));
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readStatusCode(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
}

function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
