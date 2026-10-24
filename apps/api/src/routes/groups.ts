import {
  bulkCreateStudentsRequestSchema,
  bulkCreatedStudentsResponseSchema,
  createGroupRequestSchema,
  createStudentRequestSchema,
  createdStudentResponseSchema,
  groupDetailResponseSchema,
  groupParamsSchema,
  groupResponseSchema,
  groupsQuerySchema,
  groupsResponseSchema,
  updateGroupRequestSchema,
} from '@circuits/shared';
import type { FastifyPluginAsync } from 'fastify';

import { authOf, createGuards } from '../auth/guards.js';
import { requireGroupForUser } from '../auth/access.js';
import type { CookieSettings } from '../services/cookies.js';
import {
  createGroup,
  listGroupsFor,
  regenerateJoinCode,
  updateGroup,
} from '../services/groupManagement.js';
import {
  createStudent,
  createStudentsBulk,
  listStudentsFor,
} from '../services/studentManagement.js';
import {
  toManagedGroup,
  toStudentSummary,
  toStudentWithGroups,
} from '../http/dto.js';
import { sendDto } from '../http/respond.js';

export interface GroupRoutesOptions {
  cookies: CookieSettings;
}

export const groupRoutes: FastifyPluginAsync<GroupRoutesOptions> = async (
  app,
  options,
) => {
  const guards = createGuards({ cookies: options.cookies });
  const teacherOnly = guards.requireRole('admin', 'encadrant');

  app.get(
    '/api/groups',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const query = groupsQuerySchema.parse(request.query);
      const groups = await listGroupsFor(
        authOf(request).user,
        query.includeArchived ?? false,
      );

      sendDto(reply, groupsResponseSchema, {
        groups: groups.map((group) => toManagedGroup(group, authOf(request).user)),
      });
    },
  );

  app.post(
    '/api/groups',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const body = createGroupRequestSchema.parse(request.body);
      const group = await createGroup(authOf(request).user, body.name);

      sendDto(
        reply,
        groupResponseSchema,
        { group: toManagedGroup(group, authOf(request).user) },
        201,
      );
    },
  );

  app.get(
    '/api/groups/:groupId',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = groupParamsSchema.parse(request.params);
      const actor = authOf(request).user;
      const group = await requireGroupForUser(actor, params.groupId);
      const students = await listStudentsFor(actor, params.groupId);

      sendDto(reply, groupDetailResponseSchema, {
        group: {
          ...toManagedGroup(group, actor),
          students: students.map(toStudentWithGroups),
        },
      });
    },
  );

  app.patch(
    '/api/groups/:groupId',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = groupParamsSchema.parse(request.params);
      const body = updateGroupRequestSchema.parse(request.body);
      const group = await updateGroup(
        authOf(request).user,
        params.groupId,
        body,
      );

      sendDto(reply, groupResponseSchema, {
        group: toManagedGroup(group, authOf(request).user),
      });
    },
  );

  app.post(
    '/api/groups/:groupId/join-code',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = groupParamsSchema.parse(request.params);
      const group = await regenerateJoinCode(
        authOf(request).user,
        params.groupId,
      );

      sendDto(reply, groupResponseSchema, {
        group: toManagedGroup(group, authOf(request).user),
      });
    },
  );

  app.post(
    '/api/groups/:groupId/students',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = groupParamsSchema.parse(request.params);
      const body = createStudentRequestSchema.parse(request.body);
      const created = await createStudent(
        authOf(request).user,
        params.groupId,
        body,
      );

      sendDto(
        reply,
        createdStudentResponseSchema,
        {
          student: toStudentSummary(created.student, created.groups),
          picturePassword: created.picturePassword,
        },
        201,
      );
    },
  );

  app.post(
    '/api/groups/:groupId/students/bulk',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = groupParamsSchema.parse(request.params);
      const body = bulkCreateStudentsRequestSchema.parse(request.body);
      const created = await createStudentsBulk(
        authOf(request).user,
        params.groupId,
        body.names,
      );

      sendDto(
        reply,
        bulkCreatedStudentsResponseSchema,
        {
          students: created.map((entry) => ({
            student: toStudentSummary(entry.student, entry.groups),
            picturePassword: entry.picturePassword,
          })),
        },
        201,
      );
    },
  );
};
