import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '../db/models/index.js';
import {
  readSessionCookie,
  setSessionCookie,
  type CookieSettings,
} from '../services/cookies.js';
import { forbidden, unauthorized } from '../services/errors.js';
import { loadSession } from '../services/sessions.js';
import { canAccessGroup } from './access.js';
import type { AuthContext } from './types.js';

export interface GuardOptions {
  cookies: CookieSettings;
}

export function authOf(request: FastifyRequest): AuthContext {
  if (request.auth === null) {
    throw unauthorized();
  }

  return request.auth;
}

/**
 * Loads the session from the httpOnly cookie, renews adult sessions and makes
 * the authenticated user available to the route.
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  const token = readSessionCookie(request);

  if (token === null) {
    throw unauthorized();
  }

  const loaded = await loadSession(token);

  if (loaded === null) {
    throw unauthorized();
  }

  request.auth = { user: loaded.user, session: loaded.session, token };
}

export function createGuards(options: GuardOptions) {
  const authenticate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    await requireAuth(request);

    if (request.auth !== null) {
      setSessionCookie(
        reply,
        request.auth.token,
        request.auth.session.kind,
        options.cookies,
      );
    }
  };

  const requireRole = (
    ...roles: readonly UserRole[]
  ): ((request: FastifyRequest, reply: FastifyReply) => Promise<void>) => {
    return async (request, reply) => {
      await authenticate(request, reply);
      const context = authOf(request);

      if (!roles.includes(context.user.role)) {
        throw forbidden();
      }
    };
  };

  const requireGroupAccess = (
    getGroupId: (
      request: FastifyRequest,
    ) => string | Promise<string>,
  ): ((request: FastifyRequest, reply: FastifyReply) => Promise<void>) => {
    return async (request, reply) => {
      await authenticate(request, reply);
      const context = authOf(request);
      const groupId = await getGroupId(request);

      if (!(await canAccessGroup(context.user, groupId))) {
        throw forbidden('Tu n’as pas accès à ce groupe.');
      }
    };
  };

  return {
    requireAuth: authenticate,
    requireRole,
    requireGroupAccess,
  };
}
