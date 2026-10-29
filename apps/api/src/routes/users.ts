import {
  auditLogsQuerySchema,
  auditLogsResponseSchema,
  inactiveStudentsQuerySchema,
  inactiveStudentsResponseSchema,
  updateUserRoleRequestSchema,
  updateUserStatusRequestSchema,
  userParamsSchema,
  userResponseSchema,
  usersQuerySchema,
  usersResponseSchema,
} from '@circuits/shared';
import type { FastifyPluginAsync } from 'fastify';

import { authOf, createGuards } from '../auth/guards.js';
import type { CookieSettings } from '../services/cookies.js';
import { listInactiveStudents } from '../services/inactiveStudents.js';
import { toAdminUser, toAuditLog } from '../http/dto.js';
import { sendDto } from '../http/respond.js';
import {
  getUser,
  listAuditLogs,
  listUsers,
  setUserDisabled,
  setUserRole,
  unlockAdultAccount,
} from '../services/userManagement.js';

export interface UserRoutesOptions {
  cookies: CookieSettings;
}

export const userRoutes: FastifyPluginAsync<UserRoutesOptions> = async (
  app,
  options,
) => {
  const guards = createGuards({ cookies: options.cookies });
  const adminOnly = guards.requireRole('admin');

  app.get(
    '/api/users',
    { preHandler: adminOnly },
    async (request, reply) => {
      const query = usersQuerySchema.parse(request.query);
      const page = await listUsers({
        actor: authOf(request).user,
        role: query.role,
        limit: query.limit,
        offset: query.offset,
      });

      sendDto(reply, usersResponseSchema, {
        users: page.users.map(toAdminUser),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
      });
    },
  );

  app.get(
    '/api/users/inactive-students',
    { preHandler: adminOnly },
    async (request, reply) => {
      const query = inactiveStudentsQuerySchema.parse(request.query);
      const report = await listInactiveStudents({
        actor: authOf(request).user,
        months: query.months,
        limit: query.limit,
      });

      sendDto(reply, inactiveStudentsResponseSchema, report);
    },
  );

  app.get(
    '/api/users/:userId',
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = userParamsSchema.parse(request.params);
      const user = await getUser(authOf(request).user, params.userId);

      sendDto(reply, userResponseSchema, { user: toAdminUser(user) });
    },
  );

  app.post(
    '/api/users/:userId/unlock',
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = userParamsSchema.parse(request.params);
      const user = await unlockAdultAccount({
        actor: authOf(request).user,
        userId: params.userId,
      });

      sendDto(reply, userResponseSchema, { user: toAdminUser(user) });
    },
  );

  app.patch(
    '/api/users/:userId/status',
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = userParamsSchema.parse(request.params);
      const body = updateUserStatusRequestSchema.parse(request.body);
      const user = await setUserDisabled({
        actor: authOf(request).user,
        userId: params.userId,
        disabled: body.disabled,
      });

      sendDto(reply, userResponseSchema, { user: toAdminUser(user) });
    },
  );

  app.patch(
    '/api/users/:userId/role',
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = userParamsSchema.parse(request.params);
      const body = updateUserRoleRequestSchema.parse(request.body);
      const user = await setUserRole({
        actor: authOf(request).user,
        userId: params.userId,
        role: body.role,
      });

      sendDto(reply, userResponseSchema, { user: toAdminUser(user) });
    },
  );

  app.get(
    '/api/audit-logs',
    { preHandler: adminOnly },
    async (request, reply) => {
      const query = auditLogsQuerySchema.parse(request.query);
      const page = await listAuditLogs({
        actor: authOf(request).user,
        limit: query.limit,
        offset: query.offset,
      });

      sendDto(reply, auditLogsResponseSchema, {
        logs: page.logs.map((log) =>
          toAuditLog(
            log,
            page.actorNames.get(log.actorId.toString()) ?? null,
          ),
        ),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
      });
    },
  );
};
