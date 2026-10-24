import { z } from 'zod';

/** Pictures a child can choose for the tap password. */
export const PICTURE_PATTERN_IDS = [
  'renard',
  'panda',
  'grenouille',
  'pomme',
  'banane',
  'fraise',
  'ballon',
  'voiture',
  'etoile',
] as const;

export type PicturePatternId = (typeof PICTURE_PATTERN_IDS)[number];

export interface PicturePattern {
  readonly id: PicturePatternId;
  /** French name read aloud by Zap. */
  readonly label: string;
  /** Fallback drawn by the interface until the final SVG exists. */
  readonly emoji: string;
}

export const PICTURE_PATTERNS: readonly PicturePattern[] = [
  { id: 'renard', label: 'Renard', emoji: '🦊' },
  { id: 'panda', label: 'Panda', emoji: '🐼' },
  { id: 'grenouille', label: 'Grenouille', emoji: '🐸' },
  { id: 'pomme', label: 'Pomme', emoji: '🍎' },
  { id: 'banane', label: 'Banane', emoji: '🍌' },
  { id: 'fraise', label: 'Fraise', emoji: '🍓' },
  { id: 'ballon', label: 'Ballon', emoji: '⚽' },
  { id: 'voiture', label: 'Voiture', emoji: '🚗' },
  { id: 'etoile', label: 'Étoile', emoji: '⭐' },
];

export function picturePatternLabel(id: PicturePatternId): string {
  return PICTURE_PATTERNS.find((pattern) => pattern.id === id)?.label ?? id;
}

/** Short adult identifier: 3–32 lowercase letters, digits, dot, dash, underscore. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** Group codes avoid 0/O and 1/I so they can be read aloud. */
export const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export const authRoleSchema = z.enum([
  'admin',
  'encadrant',
  'parent',
  'eleve',
]);

export const usernameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(32)
      .regex(
        USERNAME_PATTERN,
        'L’identifiant doit contenir 3 à 32 caractères : lettres minuscules, chiffres, point, tiret ou underscore, et commencer par une lettre ou un chiffre.',
      ),
  );

export const joinCodeSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .regex(JOIN_CODE_PATTERN, 'Le code du groupe fait six caractères.'),
  );

export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_PATTERN, 'Identifiant invalide.');

export const newPasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Le mot de passe ne peut pas dépasser ${MAX_PASSWORD_LENGTH} caractères.`,
  );

export const picturePatternIdSchema = z.enum([...PICTURE_PATTERN_IDS] as [
  PicturePatternId,
  ...PicturePatternId[],
]);

export const picturePatternSchema = z
  .array(picturePatternIdSchema)
  .length(3, 'Choisis trois images.');

export const adultLoginRequestSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  })
  .strict();

export const passwordChangeRequestSchema = z
  .object({ newPassword: newPasswordSchema })
  .strict();

export const passwordResetLinkRequestSchema = z
  .object({ username: usernameSchema })
  .strict();

export const inviteRoleSchema = z.enum(['encadrant', 'parent']);

export const createInviteRequestSchema = z
  .object({
    role: inviteRoleSchema,
    username: usernameSchema,
    displayName: z.string().trim().min(1).max(80),
    childId: objectIdSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.role === 'parent' && value.childId === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['childId'],
        message: 'Une invitation parent doit viser un enfant.',
      });
    }

    if (value.role === 'encadrant' && value.childId !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['childId'],
        message: 'Une invitation encadrant ne vise pas un enfant.',
      });
    }
  });

export const inviteAcceptRequestSchema = z
  .object({ password: newPasswordSchema })
  .strict();

export const inviteTokenSchema = z
  .string()
  .min(20)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const childLoginRequestSchema = z
  .object({
    joinCode: joinCodeSchema.optional(),
    studentId: objectIdSchema,
    pattern: picturePatternSchema,
  })
  .strict();

export const childGroupParamsSchema = z.object({
  joinCode: joinCodeSchema,
});

export const studentParamsSchema = z.object({
  studentId: objectIdSchema,
});

export const inviteTokenParamsSchema = z.object({
  token: inviteTokenSchema,
});

export const devicePinRequestSchema = z
  .object({ groupId: objectIdSchema })
  .strict();

export const groupSummarySchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  joinCode: z.string().regex(JOIN_CODE_PATTERN),
});

export const authUserSchema = z.object({
  id: objectIdSchema,
  role: authRoleSchema,
  displayName: z.string(),
  username: z.string().nullable(),
  avatarId: z.string().nullable(),
  group: groupSummarySchema.nullable(),
});

export const sessionInfoSchema = z.object({
  kind: z.enum(['adult', 'child']),
  expiresAt: z.string().datetime(),
});

export const authSessionResponseSchema = z.object({
  user: authUserSchema,
  session: sessionInfoSchema,
});

export const childSummarySchema = z.object({
  id: objectIdSchema,
  displayName: z.string(),
  avatarId: z.string().nullable(),
});

export const groupChildrenResponseSchema = z.object({
  group: groupSummarySchema,
  students: z.array(childSummarySchema),
  pinned: z.boolean(),
});

export const inviteTypeSchema = z.enum([
  'encadrant',
  'parent',
  'password_reset',
]);

export const inviteCreatedResponseSchema = z.object({
  invite: z.object({
    id: objectIdSchema,
    type: inviteTypeSchema,
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    expiresAt: z.string().datetime(),
    url: z.string().url(),
  }),
});

export const invitePreviewResponseSchema = z.object({
  type: inviteTypeSchema,
  role: inviteRoleSchema.nullable(),
  displayName: z.string(),
  username: z.string().nullable(),
  childName: z.string().nullable(),
  expiresAt: z.string().datetime(),
});

export const passwordChangedResponseSchema = z.object({
  ok: z.literal(true),
  sessionsRevoked: z.number().int().nonnegative(),
});

export const pictureResetResponseSchema = z.object({
  pattern: z.array(picturePatternIdSchema).length(3),
  labels: z.array(z.string()).length(3),
});

export const okResponseSchema = z.object({ ok: z.literal(true) });

export const devicePinResponseSchema = z.object({
  group: groupSummarySchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type AdultLoginRequest = z.infer<typeof adultLoginRequestSchema>;
export type ChildLoginRequest = z.infer<typeof childLoginRequestSchema>;
export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type GroupChildrenResponse = z.infer<
  typeof groupChildrenResponseSchema
>;
export type InviteCreatedResponse = z.infer<typeof inviteCreatedResponseSchema>;
export type InvitePreviewResponse = z.infer<
  typeof invitePreviewResponseSchema
>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
