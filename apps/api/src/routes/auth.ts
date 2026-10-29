import {
  adultLoginRequestSchema,
  authSessionResponseSchema,
  childGroupParamsSchema,
  childLoginRequestSchema,
  createInviteRequestSchema,
  devicePinRequestSchema,
  devicePinResponseSchema,
  groupChildrenResponseSchema,
  inviteAcceptRequestSchema,
  inviteCreatedResponseSchema,
  invitePreviewResponseSchema,
  inviteTokenParamsSchema,
  okResponseSchema,
  passwordChangeRequestSchema,
  passwordChangedResponseSchema,
  passwordResetLinkRequestSchema,
  pictureResetResponseSchema,
  studentParamsSchema,
} from '@circuits/shared';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Types } from 'mongoose';

import {
  AuditLogModel,
  GroupModel,
  UserModel,
  type GroupDocument,
} from '../db/models/index.js';
import { canAccessGroup } from '../auth/access.js';
import { authOf, createGuards } from '../auth/guards.js';
import { loginAdult } from '../services/adultAuth.js';
import { changeAccountPassword } from '../services/adminAccounts.js';
import {
  findGroupByJoinCode,
  findPinnedGroup,
  loginChild,
  resetStudentPicturePassword,
} from '../services/children.js';
import {
  clearDevicePinCookie,
  clearSessionCookie,
  readDevicePin,
  readSessionCookie,
  setDevicePinCookie,
  setSessionCookie,
  type CookieSettings,
} from '../services/cookies.js';
import { ApiError, notFound } from '../services/errors.js';
import {
  acceptInvite,
  createPasswordResetInvite,
  createRoleInvite,
  previewInvite,
} from '../services/invites.js';
import { verifySecret } from '../services/secrets.js';
import { createSession, deleteSession } from '../services/sessions.js';
import {
  toAuthSession,
  toGroupChildren,
  toGroupSummary,
  toInviteCreated,
  toInvitePreview,
} from '../http/dto.js';
import { sendDto } from '../http/respond.js';

export interface AuthRoutesOptions {
  cookies: CookieSettings;
  publicOrigin: string;
  rateLimitMax: number;
}

function userAgentOf(request: FastifyRequest): string {
  const value = request.headers['user-agent'];

  return typeof value === 'string' ? value : '';
}

function rateLimited(max: number) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow: '1 minute',
      },
    },
  };
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  options,
) => {
  const guards = createGuards({ cookies: options.cookies });
  const loginLimit = options.rateLimitMax;
  const inviteLimit = Math.max(loginLimit * 2, 20);
  // A whole class often shares one school IP address. The per-student
  // five-picture lock is the real brute-force protection here.
  const childGroupLimit = Math.max(loginLimit * 6, 60);
  const childLoginLimit = Math.max(loginLimit * 12, 120);

  app.get(
    '/api/auth/me',
    { preHandler: guards.requireAuth },
    async (request, reply) => {
      const { user, session } = authOf(request);
      const group =
        user.role === 'eleve' && session.groupId !== null
          ? await GroupModel.findById(session.groupId)
          : null;

      sendDto(
        reply,
        authSessionResponseSchema,
        toAuthSession(user, session, group),
      );
    },
  );

  app.post(
    '/api/auth/login',
    rateLimited(loginLimit),
    async (request, reply) => {
      const body = adultLoginRequestSchema.parse(request.body);
      const result = await loginAdult({
        username: body.username,
        password: body.password,
        userAgent: userAgentOf(request),
        ip: request.ip,
      });

      setSessionCookie(
        reply,
        result.created.token,
        'adult',
        options.cookies,
      );
      sendDto(
        reply,
        authSessionResponseSchema,
        toAuthSession(result.user, result.created.session, null),
      );
    },
  );

  app.post('/api/auth/logout', async (request, reply) => {
    const token = readSessionCookie(request);

    if (token !== null) {
      await deleteSession(token);
    }

    clearSessionCookie(reply, options.cookies);
    sendDto(reply, okResponseSchema, { ok: true });
  });

  app.post(
    '/api/auth/password',
    { preHandler: guards.requireRole('admin', 'encadrant', 'parent') },
    async (request, reply) => {
      const { user } = authOf(request);
      const body = passwordChangeRequestSchema.parse(request.body);

      if (user.username === null) {
        throw new ApiError(
          400,
          'no_username',
          'Ce compte n’a pas d’identifiant de connexion.',
        );
      }

      const account = await UserModel.findById(user._id).select(
        '+passwordHash',
      );

      if (
        account === null ||
        account.passwordHash === null ||
        account.passwordHash === undefined
      ) {
        throw new ApiError(
          400,
          'no_password',
          'Ce compte n’a pas de mot de passe.',
        );
      }

      const currentPasswordValid = await verifySecret(
        account.passwordHash,
        body.currentPassword,
      );

      if (!currentPasswordValid) {
        throw new ApiError(
          401,
          'invalid_credentials',
          'Le mot de passe actuel est incorrect.',
        );
      }

      const result = await changeAccountPassword({
        username: user.username,
        newPassword: body.newPassword,
      });
      const created = await createSession({
        userId: user._id,
        kind: 'adult',
        userAgent: userAgentOf(request),
        groupId: null,
      });

      setSessionCookie(reply, created.token, 'adult', options.cookies);
      sendDto(reply, passwordChangedResponseSchema, {
        ok: true,
        sessionsRevoked: result.sessionsRevoked,
      });
    },
  );

  app.post(
    '/api/auth/invites',
    { preHandler: guards.requireRole('admin', 'encadrant') },
    async (request, reply) => {
      const body = createInviteRequestSchema.parse(request.body);
      const { invite, token } = await createRoleInvite({
        actor: authOf(request).user,
        role: body.role,
        username: body.username,
        displayName: body.displayName,
        childId: body.childId,
        publicOrigin: options.publicOrigin,
      });

      sendDto(
        reply,
        inviteCreatedResponseSchema,
        toInviteCreated(invite, token, options.publicOrigin),
        201,
      );
    },
  );

  app.get(
    '/api/auth/invites/:token',
    rateLimited(inviteLimit),
    async (request, reply) => {
      const params = inviteTokenParamsSchema.parse(request.params);
      const preview = await previewInvite(params.token);

      sendDto(reply, invitePreviewResponseSchema, toInvitePreview(preview));
    },
  );

  app.post(
    '/api/auth/invites/:token/accept',
    rateLimited(inviteLimit),
    async (request, reply) => {
      const params = inviteTokenParamsSchema.parse(request.params);
      const body = inviteAcceptRequestSchema.parse(request.body);
      const accepted = await acceptInvite({
        token: params.token,
        password: body.password,
        userAgent: userAgentOf(request),
      });

      setSessionCookie(reply, accepted.token, 'adult', options.cookies);
      sendDto(
        reply,
        authSessionResponseSchema,
        toAuthSession(accepted.user, accepted.session, null),
        201,
      );
    },
  );

  app.post(
    '/api/auth/password-resets',
    { preHandler: guards.requireRole('admin') },
    async (request, reply) => {
      const body = passwordResetLinkRequestSchema.parse(request.body);
      const { invite, token } = await createPasswordResetInvite({
        actor: authOf(request).user,
        username: body.username,
      });

      sendDto(
        reply,
        inviteCreatedResponseSchema,
        toInviteCreated(invite, token, options.publicOrigin),
        201,
      );
    },
  );

  app.get(
    '/api/auth/device-pin',
    async (request, reply) => {
      const groupId = readDevicePin(request);

      if (groupId === null) {
        throw notFound('Cet appareil n’est pas fixé à un groupe.');
      }

      const pinned = await findPinnedGroup(groupId);

      if (pinned === null) {
        clearDevicePinCookie(reply, options.cookies);
        throw notFound('Cet appareil n’est plus fixé à un groupe.');
      }

      sendDto(reply, groupChildrenResponseSchema, toGroupChildren(pinned, true));
    },
  );

  app.post(
    '/api/auth/device-pin',
    { preHandler: guards.requireRole('admin', 'encadrant') },
    async (request, reply) => {
      const body = devicePinRequestSchema.parse(request.body);

      if (!(await canAccessGroup(authOf(request).user, body.groupId))) {
        throw new ApiError(
          403,
          'forbidden',
          'Tu n’as pas accès à ce groupe.',
        );
      }

      const group: GroupDocument | null = await GroupModel.findById(
        body.groupId,
      );

      if (group === null) {
        throw notFound('Groupe introuvable.');
      }

      setDevicePinCookie(reply, group._id.toString(), options.cookies);
      await AuditLogModel.create({
        actorId: authOf(request).user._id,
        action: 'pin_device',
        targetType: 'group',
        targetId: group._id,
      });

      sendDto(reply, devicePinResponseSchema, {
        group: toGroupSummary(group),
      });
    },
  );

  app.delete(
    '/api/auth/device-pin',
    { preHandler: guards.requireRole('admin', 'encadrant') },
    async (request, reply) => {
      const groupId = readDevicePin(request);
      clearDevicePinCookie(reply, options.cookies);

      if (groupId !== null) {
        await AuditLogModel.create({
          actorId: authOf(request).user._id,
          action: 'unpin_device',
          targetType: 'group',
          targetId: new Types.ObjectId(groupId),
        });
      }

      sendDto(reply, okResponseSchema, { ok: true });
    },
  );

  app.get(
    '/api/auth/children/group/:joinCode',
    rateLimited(childGroupLimit),
    async (request, reply) => {
      const params = childGroupParamsSchema.parse(request.params);
      const childGroup = await findGroupByJoinCode(params.joinCode);

      sendDto(
        reply,
        groupChildrenResponseSchema,
        toGroupChildren(childGroup, false),
      );
    },
  );

  app.post(
    '/api/auth/children/login',
    rateLimited(childLoginLimit),
    async (request, reply) => {
      const body = childLoginRequestSchema.parse(request.body);
      const result = await loginChild({
        joinCode: body.joinCode,
        studentId: body.studentId,
        pattern: body.pattern,
        pinnedGroupId: readDevicePin(request),
        userAgent: userAgentOf(request),
      });

      setSessionCookie(reply, result.token, 'child', options.cookies);
      sendDto(
        reply,
        authSessionResponseSchema,
        toAuthSession(result.user, result.session, result.group),
      );
    },
  );

  app.post(
    '/api/auth/students/:studentId/picture-password/reset',
    { preHandler: guards.requireRole('admin', 'encadrant') },
    async (request, reply) => {
      const params = studentParamsSchema.parse(request.params);
      const result = await resetStudentPicturePassword({
        actor: authOf(request).user,
        studentId: params.studentId,
      });

      sendDto(reply, pictureResetResponseSchema, result);
    },
  );
};
