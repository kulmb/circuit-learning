import {
  attemptParamsSchema,
  attemptStartedResponseSchema,
  finishAttemptRequestSchema,
  finishAttemptResponseSchema,
  playerProgressResponseSchema,
  sandboxInputSchema,
  sandboxListResponseSchema,
  sandboxParamsSchema,
  sandboxResponseSchema,
  startAttemptRequestSchema,
} from '@circuits/shared';
import type { FastifyPluginAsync } from 'fastify';

import { authOf, createGuards } from '../auth/guards.js';
import type { CookieSettings } from '../services/cookies.js';
import {
  toSandboxCircuit,
} from '../http/dto.js';
import { sendDto } from '../http/respond.js';
import {
  buildPlayerProgress,
  finishLevelAttempt,
  startLevelAttempt,
  toProgressResponse,
} from '../services/progress.js';
import {
  listSandboxCircuits,
  saveSandboxCircuit,
} from '../services/sandbox.js';

export interface MeRoutesOptions {
  cookies: CookieSettings;
}

export const meRoutes: FastifyPluginAsync<MeRoutesOptions> = async (
  app,
  options,
) => {
  const guards = createGuards({ cookies: options.cookies });
  const childOnly = guards.requireRole('eleve');

  app.get(
    '/api/me/progress',
    { preHandler: childOnly },
    async (request, reply) => {
      const progress = await buildPlayerProgress(authOf(request).user._id);

      sendDto(
        reply,
        playerProgressResponseSchema,
        toProgressResponse(progress),
      );
    },
  );

  app.post(
    '/api/me/attempts/start',
    { preHandler: childOnly },
    async (request, reply) => {
      const body = startAttemptRequestSchema.parse(request.body);
      const context = authOf(request);
      const attempt = await startLevelAttempt({
        userId: context.user._id,
        groupId: context.session.groupId,
        levelId: body.levelId,
        attemptId: body.attemptId,
      });

      sendDto(
        reply,
        attemptStartedResponseSchema,
        {
          attemptId: attempt.clientId ?? attempt._id.toString(),
          levelId: attempt.levelId,
          startedAt: attempt.startedAt.getTime(),
        },
        201,
      );
    },
  );

  app.post(
    '/api/me/attempts/:attemptId/finish',
    { preHandler: childOnly },
    async (request, reply) => {
      const params = attemptParamsSchema.parse(request.params);
      const body = finishAttemptRequestSchema.parse(request.body);
      const progress = await finishLevelAttempt({
        userId: authOf(request).user._id,
        attemptId: params.attemptId,
        payload: body,
      });

      sendDto(reply, finishAttemptResponseSchema, {
        progress: toProgressResponse(progress),
      });
    },
  );

  app.get(
    '/api/me/sandbox',
    { preHandler: childOnly },
    async (request, reply) => {
      const circuits = await listSandboxCircuits(authOf(request).user._id);

      sendDto(reply, sandboxListResponseSchema, {
        circuits: circuits.map(toSandboxCircuit),
      });
    },
  );

  app.put(
    '/api/me/sandbox/:id',
    { preHandler: childOnly },
    async (request, reply) => {
      const params = sandboxParamsSchema.parse(request.params);
      const body = sandboxInputSchema.parse(request.body);
      const circuit = await saveSandboxCircuit({
        userId: authOf(request).user._id,
        id: params.id,
        input: {
          name: body.name,
          data: body.data,
          thumbnail: body.thumbnail,
        },
      });

      sendDto(reply, sandboxResponseSchema, {
        circuit: toSandboxCircuit(circuit),
      });
    },
  );
};
