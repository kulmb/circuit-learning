import { describe, expect, it } from 'vitest';

import {
  adultLoginRequestSchema,
  childLoginRequestSchema,
  createInviteRequestSchema,
  joinCodeSchema,
  PICTURE_PATTERN_IDS,
  PICTURE_PATTERNS,
  picturePatternLabel,
  usernameSchema,
} from './auth';

describe('picture patterns', () => {
  it('offers nine distinct pictures with French names', () => {
    expect(PICTURE_PATTERNS).toHaveLength(9);
    expect(new Set(PICTURE_PATTERN_IDS).size).toBe(9);
    expect(new Set(PICTURE_PATTERNS.map((picture) => picture.label)).size).toBe(9);
    expect(picturePatternLabel('renard')).toBe('Renard');
  });

  it('requires exactly three known pictures', () => {
    const valid = childLoginRequestSchema.safeParse({
      joinCode: 'abc234',
      studentId: '0123456789abcdef01234567',
      pattern: ['renard', 'pomme', 'ballon'],
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.joinCode).toBe('ABC234');
    }

    expect(
      childLoginRequestSchema.safeParse({
        studentId: '0123456789abcdef01234567',
        pattern: ['renard', 'pomme'],
      }).success,
    ).toBe(false);

    expect(
      childLoginRequestSchema.safeParse({
        studentId: '0123456789abcdef01234567',
        pattern: ['renard', 'pomme', 'licorne'],
      }).success,
    ).toBe(false);
  });
});

describe('adult identifiers', () => {
  it('normalises usernames before validating them', () => {
    expect(usernameSchema.parse('  Kulmb ')).toBe('kulmb');

    for (const invalid of ['ab', 'kulmb@example.com', '-kulmb', 'a'.repeat(33)]) {
      expect(usernameSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('accepts only the six-character group alphabet', () => {
    expect(joinCodeSchema.parse(' abc234 ')).toBe('ABC234');
    expect(joinCodeSchema.safeParse('ABC01O').success).toBe(false);
    expect(joinCodeSchema.safeParse('ABC23').success).toBe(false);
  });

  it('normalises the login username', () => {
    const result = adultLoginRequestSchema.parse({
      username: ' KULMB ',
      password: 'un-mot-de-passe',
    });

    expect(result.username).toBe('kulmb');
  });
});

describe('invitations', () => {
  const base = {
    role: 'parent' as const,
    username: 'parent1',
    displayName: 'Parent Un',
  };

  it('requires a child for a parent invitation', () => {
    expect(createInviteRequestSchema.safeParse(base).success).toBe(false);
    expect(
      createInviteRequestSchema.safeParse({
        ...base,
        childId: '0123456789abcdef01234567',
      }).success,
    ).toBe(true);
  });

  it('forbids a child on an encadrant invitation', () => {
    expect(
      createInviteRequestSchema.safeParse({
        role: 'encadrant',
        username: 'coach2',
        displayName: 'Coach Deux',
        childId: '0123456789abcdef01234567',
      }).success,
    ).toBe(false);
  });
});
