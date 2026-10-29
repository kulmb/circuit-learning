import {
  deleteStudentRequestSchema,
  linkParentRequestSchema,
  moveStudentRequestSchema,
  okResponseSchema,
  parentResponseSchema,
  parentsResponseSchema,
  studentDashboardResponseSchema,
  studentExportSchema,
  studentParentParamsSchema,
  studentParamsSchema,
  studentResponseSchema,
  studentsQuerySchema,
  studentsResponseSchema,
} from '@circuits/shared';
import type { FastifyPluginAsync } from 'fastify';

import { AuditLogModel } from '../db/models/index.js';
import { authOf, createGuards } from '../auth/guards.js';
import type { CookieSettings } from '../services/cookies.js';
import { buildStudentDashboard } from '../services/dashboard.js';
import { deleteStudent } from '../services/deleteStudent.js';
import { sendDto } from '../http/respond.js';
import {
  toStudentWithGroups,
} from '../http/dto.js';
import { buildStudentExport } from '../services/studentExport.js';
import {
  assertStudentName,
  getStudentFor,
  linkParentToStudent,
  listParentsFor,
  listStudentsFor,
  moveStudentToGroup,
  unlinkParentFromStudent,
} from '../services/studentManagement.js';

export interface StudentRoutesOptions {
  cookies: CookieSettings;
}

export const studentRoutes: FastifyPluginAsync<StudentRoutesOptions> = async (
  app,
  options,
) => {
  const guards = createGuards({ cookies: options.cookies });
  const reader = guards.requireRole('admin', 'encadrant', 'parent');
  const teacherOnly = guards.requireRole('admin', 'encadrant');

  app.get(
    '/api/students',
    { preHandler: reader },
    async (request, reply) => {
      const query = studentsQuerySchema.parse(request.query);
      const students = await listStudentsFor(
        authOf(request).user,
        query.groupId,
      );

      sendDto(reply, studentsResponseSchema, {
        students: students.map(toStudentWithGroups),
      });
    },
  );

  app.get(
    '/api/students/:studentId',
    { preHandler: reader },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const entry = await getStudentFor(
        authOf(request).user,
        params.studentId,
      );

      sendDto(reply, studentResponseSchema, {
        student: toStudentWithGroups(entry),
      });
    },
  );

  app.get(
    '/api/students/:studentId/dashboard',
    { preHandler: reader },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const entry = await getStudentFor(
        authOf(request).user,
        params.studentId,
      );
      const dashboard = await buildStudentDashboard(entry.student);

      sendDto(reply, studentDashboardResponseSchema, dashboard);
    },
  );

  app.post(
    '/api/students/:studentId/export',
    { preHandler: reader },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const actor = authOf(request).user;
      const entry = await getStudentFor(actor, params.studentId);
      const data = await buildStudentExport(entry.student);

      await AuditLogModel.create({
        actorId: actor._id,
        action: 'export_student',
        targetType: 'user',
        targetId: entry.student._id,
      });

      reply.header(
        'Content-Disposition',
        `attachment; filename="eleve-${entry.student._id.toString()}.json"`,
      );
      sendDto(reply, studentExportSchema, data);
    },
  );

  app.delete(
    '/api/students/:studentId',
    { preHandler: reader },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const body = deleteStudentRequestSchema.parse(request.body);
      const actor = authOf(request).user;
      const entry = await getStudentFor(actor, params.studentId);

      assertStudentName(entry.student, body.confirmName);
      await deleteStudent(entry.student._id, { actorId: actor._id });

      sendDto(reply, okResponseSchema, { ok: true });
    },
  );

  app.patch(
    '/api/students/:studentId/group',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const body = moveStudentRequestSchema.parse(request.body);
      const entry = await moveStudentToGroup(
        authOf(request).user,
        params.studentId,
        body.groupId,
      );

      sendDto(reply, studentResponseSchema, {
        student: toStudentWithGroups(entry),
      });
    },
  );

  app.get(
    '/api/students/:studentId/parents',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const parents = await listParentsFor(
        authOf(request).user,
        params.studentId,
      );

      sendDto(reply, parentsResponseSchema, { parents });
    },
  );

  app.post(
    '/api/students/:studentId/parents',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const body = linkParentRequestSchema.parse(request.body);
      const parent = await linkParentToStudent(
        authOf(request).user,
        params.studentId,
        body.username,
      );

      sendDto(reply, parentResponseSchema, { parent });
    },
  );

  app.delete(
    '/api/students/:studentId/parents/:parentId',
    { preHandler: teacherOnly },
    async (request, reply) => {
      const params = studentParentParamsSchema.parse(request.params);
      await unlinkParentFromStudent(
        authOf(request).user,
        params.studentId,
        params.parentId,
      );

      sendDto(reply, okResponseSchema, { ok: true });
    },
  );
};
