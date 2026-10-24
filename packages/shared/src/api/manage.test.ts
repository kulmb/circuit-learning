import { describe, expect, it } from 'vitest';

import {
  AVATARS,
  AVATAR_IDS,
  avatarIdSchema,
  bulkCreateStudentsRequestSchema,
  createGroupRequestSchema,
  deleteStudentRequestSchema,
  updateGroupRequestSchema,
  usersQuerySchema,
} from './manage';

describe('management schemas', () => {
  it('offers twelve distinct avatars', () => {
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATAR_IDS).size).toBe(12);
    expect(avatarIdSchema.safeParse('renard').success).toBe(true);
    expect(avatarIdSchema.safeParse('licorne-rose').success).toBe(false);
  });

  it('validates group names and group changes', () => {
    expect(createGroupRequestSchema.parse({ name: '  CE2 B  ' }).name).toBe(
      'CE2 B',
    );
    expect(createGroupRequestSchema.safeParse({ name: '   ' }).success).toBe(
      false,
    );
    expect(
      updateGroupRequestSchema.safeParse({ archived: true }).success,
    ).toBe(true);
    expect(updateGroupRequestSchema.safeParse({}).success).toBe(false);
  });

  it('limits bulk additions and trims names', () => {
    const result = bulkCreateStudentsRequestSchema.parse({
      names: [' Lina ', 'Noé'],
    });
    expect(result.names).toEqual(['Lina', 'Noé']);

    expect(
      bulkCreateStudentsRequestSchema.safeParse({ names: [] }).success,
    ).toBe(false);
    expect(
      bulkCreateStudentsRequestSchema.safeParse({
        names: Array.from({ length: 41 }, (_, index) => `Élève ${index}`),
      }).success,
    ).toBe(false);
  });

  it('coerces the administration page query', () => {
    const query = usersQuerySchema.parse({ limit: '2', offset: '4' });
    expect(query).toEqual({ limit: 2, offset: 4 });
  });

  it('requires a non-empty deletion confirmation', () => {
    expect(
      deleteStudentRequestSchema.parse({ confirmName: ' Lina ' }).confirmName,
    ).toBe('Lina');
    expect(
      deleteStudentRequestSchema.safeParse({ confirmName: '  ' }).success,
    ).toBe(false);
  });
});
