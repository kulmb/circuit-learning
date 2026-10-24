import { z } from 'zod';

import { groupSummarySchema } from './auth';

const dateTimeSchema = z.string().datetime();
const nullableDateTimeSchema = dateTimeSchema.nullable();

export const dashboardLevelProgressSchema = z.object({
  levelId: z.string(),
  status: z.enum(['locked', 'unlocked', 'completed']),
  stars: z.number().int().min(0).max(3),
  attempts: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  bestTimeMs: z.number().int().nonnegative().nullable(),
  lastPlayedAt: nullableDateTimeSchema,
});

export const groupDashboardStudentSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarId: z.string().nullable(),
  levels: z.array(dashboardLevelProgressSchema),
});

export const groupLevelStatsSchema = z.object({
  levelId: z.string(),
  totalStudents: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  started: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  averageAttempts: z.number().nonnegative(),
  averageHints: z.number().nonnegative(),
});

export const groupDifficultySchema = z.object({
  levelId: z.string(),
  code: z.string(),
  students: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
});

export const groupDashboardResponseSchema = z.object({
  group: groupSummarySchema,
  totalStudents: z.number().int().nonnegative(),
  activeStudents: z.number().int().nonnegative(),
  students: z.array(groupDashboardStudentSchema),
  levels: z.array(groupLevelStatsSchema),
  difficulties: z.array(groupDifficultySchema),
});

export const studentTimelineAttemptSchema = z.object({
  id: z.string(),
  levelId: z.string(),
  success: z.boolean(),
  hintsUsed: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  errorsDetected: z.array(z.string()),
  startedAt: dateTimeSchema,
  endedAt: nullableDateTimeSchema,
});

export const studentConceptSchema = z.object({
  id: z.string(),
  mastered: z.boolean(),
});

export const studentSandboxSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail: z.string().nullable(),
  updatedAt: dateTimeSchema,
});

export const studentDashboardResponseSchema = z.object({
  levels: z.array(dashboardLevelProgressSchema),
  timeline: z.array(studentTimelineAttemptSchema),
  concepts: z.array(studentConceptSchema),
  sandbox: z.array(studentSandboxSchema),
});

export type DashboardLevelProgress = z.infer<
  typeof dashboardLevelProgressSchema
>;
export type GroupDashboardStudent = z.infer<
  typeof groupDashboardStudentSchema
>;
export type GroupLevelStats = z.infer<typeof groupLevelStatsSchema>;
export type GroupDifficulty = z.infer<typeof groupDifficultySchema>;
export type GroupDashboardResponse = z.infer<
  typeof groupDashboardResponseSchema
>;
export type StudentTimelineAttempt = z.infer<
  typeof studentTimelineAttemptSchema
>;
export type StudentDashboardResponse = z.infer<
  typeof studentDashboardResponseSchema
>;
