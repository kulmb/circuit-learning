import { z } from 'zod';

export const attemptIdSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9._-]+$/, 'Identifiant de tentative invalide.');

export const levelIdSchema = z.string().trim().min(1).max(80);

export const levelProgressDtoSchema = z.object({
  levelId: z.string(),
  status: z.enum(['locked', 'unlocked', 'completed']),
  stars: z.number().int().min(0).max(3),
  attempts: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  bestTimeMs: z.number().int().nonnegative().nullable(),
  firstCompletedAt: z.number().int().nonnegative().nullable(),
  lastPlayedAt: z.number().int().nonnegative().nullable(),
});

export const playerProgressResponseSchema = z.object({
  levels: z.array(levelProgressDtoSchema),
  vocabulary: z.array(z.string()),
});

export const startAttemptRequestSchema = z
  .object({
    levelId: levelIdSchema,
    attemptId: attemptIdSchema.optional(),
  })
  .strict();

export const attemptStartedResponseSchema = z.object({
  attemptId: attemptIdSchema,
  levelId: z.string(),
  startedAt: z.number().int().nonnegative(),
});

export const finishAttemptRequestSchema = z
  .object({
    success: z.boolean(),
    hintsUsed: z.number().int().min(0).max(999),
    durationMs: z.number().int().min(0),
    errorsDetected: z
      .array(z.string().trim().min(1).max(80))
      .max(50),
  })
  .strict();

export const finishAttemptResponseSchema = z.object({
  progress: playerProgressResponseSchema,
});

export const attemptParamsSchema = z.object({
  attemptId: attemptIdSchema,
});

export const sandboxIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9._-]+$/, 'Identifiant d’atelier invalide.');

export const sandboxParamsSchema = z.object({
  id: sandboxIdSchema,
});

export const sandboxThumbnailSchema = z
  .string()
  .max(300_000)
  .regex(
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    'La vignette doit être une image encodée en base64.',
  );

export const sandboxInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    data: z.unknown(),
    thumbnail: sandboxThumbnailSchema.nullable().optional(),
  })
  .strict();

export const sandboxCircuitDtoSchema = z.object({
  id: sandboxIdSchema,
  name: z.string(),
  data: z.unknown(),
  thumbnail: z.string().nullable(),
  updatedAt: z.number().int().nonnegative(),
});

export const sandboxResponseSchema = z.object({
  circuit: sandboxCircuitDtoSchema,
});

export const sandboxListResponseSchema = z.object({
  circuits: z.array(sandboxCircuitDtoSchema),
});

export type PlayerProgressResponse = z.infer<
  typeof playerProgressResponseSchema
>;
export type AttemptStartedResponse = z.infer<
  typeof attemptStartedResponseSchema
>;
export type FinishAttemptResponse = z.infer<
  typeof finishAttemptResponseSchema
>;
export type SandboxCircuitDto = z.infer<typeof sandboxCircuitDtoSchema>;
export type SandboxListResponse = z.infer<typeof sandboxListResponseSchema>;
