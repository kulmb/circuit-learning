import { z } from 'zod';

import {
  authRoleSchema,
  objectIdSchema,
  picturePatternIdSchema,
  usernameSchema,
} from './auth';

/** Avatars offered when an adult creates a child account. */
export const AVATARS = [
  { id: 'renard', label: 'Renard' },
  { id: 'panda', label: 'Panda' },
  { id: 'fusee', label: 'Fusée' },
  { id: 'chat', label: 'Chat' },
  { id: 'chien', label: 'Chien' },
  { id: 'lapin', label: 'Lapin' },
  { id: 'hibou', label: 'Hibou' },
  { id: 'dragon', label: 'Dragon' },
  { id: 'licorne', label: 'Licorne' },
  { id: 'robot', label: 'Robot' },
  { id: 'pingouin', label: 'Pingouin' },
  { id: 'souris', label: 'Souris' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

export const AVATAR_IDS = AVATARS.map((avatar) => avatar.id) as [
  AvatarId,
  ...AvatarId[],
];

export const avatarIdSchema = z.enum(AVATAR_IDS);

export const groupParamsSchema = z.object({ groupId: objectIdSchema });
export const groupStudentParamsSchema = z.object({
  groupId: objectIdSchema,
  studentId: objectIdSchema,
});
export const studentParentParamsSchema = z.object({
  studentId: objectIdSchema,
  parentId: objectIdSchema,
});
export const userParamsSchema = z.object({ userId: objectIdSchema });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Écris un prénom.')
  .max(80, 'Le prénom est trop long.');

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, 'Écris un nom de groupe.')
  .max(80, 'Le nom du groupe est trop long.');

const dateTimeSchema = z.string().datetime();
const nullableDateTimeSchema = dateTimeSchema.nullable();

export const studentGroupRefSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  archived: z.boolean(),
});

export const studentSummarySchema = z.object({
  id: objectIdSchema,
  displayName: z.string(),
  avatarId: z.string().nullable(),
  createdAt: dateTimeSchema,
  pictureLocked: z.boolean(),
  groups: z.array(studentGroupRefSchema),
});

export const managedGroupSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  joinCode: z.string(),
  archived: z.boolean(),
  createdAt: dateTimeSchema,
  studentCount: z.number().int().nonnegative(),
  canManage: z.boolean(),
});

export const groupDetailSchema = managedGroupSchema.extend({
  students: z.array(studentSummarySchema),
});

export const groupsResponseSchema = z.object({
  groups: z.array(managedGroupSchema),
});

export const groupResponseSchema = z.object({
  group: managedGroupSchema,
});

export const groupDetailResponseSchema = z.object({
  group: groupDetailSchema,
});

export const createGroupRequestSchema = z
  .object({ name: groupNameSchema })
  .strict();

export const updateGroupRequestSchema = z
  .object({
    name: groupNameSchema.optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => value.name !== undefined || value.archived !== undefined,
    'Indique un nom ou l’état d’archivage.',
  );

export const groupsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const createStudentRequestSchema = z
  .object({
    displayName: displayNameSchema,
    avatarId: avatarIdSchema,
  })
  .strict();

export const bulkCreateStudentsRequestSchema = z
  .object({
    names: z
      .array(displayNameSchema)
      .min(1, 'Ajoute au moins un prénom.')
      .max(40, 'Quarante élèves au maximum à la fois.'),
  })
  .strict();

export const picturePasswordDtoSchema = z.object({
  pattern: z.array(picturePatternIdSchema).length(3),
  labels: z.array(z.string()).length(3),
});

export const createdStudentResponseSchema = z.object({
  student: studentSummarySchema,
  picturePassword: picturePasswordDtoSchema,
});

export const bulkCreatedStudentsResponseSchema = z.object({
  students: z.array(createdStudentResponseSchema),
});

export const studentsResponseSchema = z.object({
  students: z.array(studentSummarySchema),
});

export const studentResponseSchema = z.object({
  student: studentSummarySchema,
});

export const studentsQuerySchema = z.object({
  groupId: objectIdSchema.optional(),
});

export const moveStudentRequestSchema = z
  .object({ groupId: objectIdSchema })
  .strict();

export const parentSummarySchema = z.object({
  id: objectIdSchema,
  displayName: z.string(),
  username: z.string().nullable(),
});

export const linkParentRequestSchema = z
  .object({ username: usernameSchema })
  .strict();

export const parentResponseSchema = z.object({
  parent: parentSummarySchema,
});

export const parentsResponseSchema = z.object({
  parents: z.array(parentSummarySchema),
});

export const adminUserSchema = z.object({
  id: objectIdSchema,
  role: authRoleSchema,
  displayName: z.string(),
  username: z.string().nullable(),
  avatarId: z.string().nullable(),
  disabled: z.boolean(),
  createdAt: dateTimeSchema,
  lastSeenAt: nullableDateTimeSchema,
});

export const usersResponseSchema = z.object({
  users: z.array(adminUserSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const userResponseSchema = z.object({
  user: adminUserSchema,
});

export const usersQuerySchema = z.object({
  role: authRoleSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateUserStatusRequestSchema = z
  .object({ disabled: z.boolean() })
  .strict();

export const updateUserRoleRequestSchema = z
  .object({ role: z.enum(['admin', 'encadrant', 'parent']) })
  .strict();

export const deleteStudentRequestSchema = z
  .object({ confirmName: z.string().trim().min(1).max(80) })
  .strict();

export const studentExportSchema = z.object({
  exportedAt: dateTimeSchema,
  student: z.object({
    id: objectIdSchema,
    displayName: z.string(),
    avatarId: z.string().nullable(),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    vocabulary: z.array(
      z.object({ wordId: z.string(), unlockedAt: dateTimeSchema }),
    ),
  }),
  groups: z.array(
    z.object({
      id: objectIdSchema,
      name: z.string(),
      joinedAt: dateTimeSchema,
    }),
  ),
  parents: z.array(
    z.object({ id: objectIdSchema, displayName: z.string() }),
  ),
  progress: z.array(
    z.object({
      levelId: z.string(),
      status: z.enum(['locked', 'unlocked', 'completed']),
      stars: z.number().int().min(0).max(3),
      attempts: z.number().int().nonnegative(),
      hintsUsed: z.number().int().nonnegative(),
      bestTimeMs: z.number().int().nonnegative().nullable(),
      firstCompletedAt: nullableDateTimeSchema,
      lastPlayedAt: nullableDateTimeSchema,
      createdAt: dateTimeSchema,
      updatedAt: dateTimeSchema,
    }),
  ),
  attempts: z.array(
    z.object({
      levelId: z.string(),
      groupId: objectIdSchema.nullable(),
      startedAt: dateTimeSchema,
      endedAt: nullableDateTimeSchema,
      success: z.boolean(),
      hintsUsed: z.number().int().nonnegative(),
      durationMs: z.number().int().nonnegative(),
      errorsDetected: z.array(z.string()),
    }),
  ),
  sandboxCircuits: z.array(
    z.object({
      name: z.string(),
      data: z.unknown(),
      thumbnail: z.string().nullable(),
      createdAt: dateTimeSchema,
      updatedAt: dateTimeSchema,
    }),
  ),
});

export const auditLogSchema = z.object({
  id: objectIdSchema,
  actorId: objectIdSchema,
  actorName: z.string().nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: objectIdSchema,
  createdAt: dateTimeSchema,
});

export const auditLogsResponseSchema = z.object({
  logs: z.array(auditLogSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AvatarIdValue = z.infer<typeof avatarIdSchema>;
export type StudentSummary = z.infer<typeof studentSummarySchema>;
export type ManagedGroup = z.infer<typeof managedGroupSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type StudentExport = z.infer<typeof studentExportSchema>;
