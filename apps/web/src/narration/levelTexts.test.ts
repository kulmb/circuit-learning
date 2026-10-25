import { ALL_LEVELS, CHAPTERS } from '@circuits/shared/levels';
import { describe, expect, it } from 'vitest';

import { getText, getVocabulary } from './fr';

describe('level texts', () => {
  it('resolves every chapter title', () => {
    for (const chapter of CHAPTERS) {
      expect(getText(chapter.titleTextId)).not.toBe('');
    }
  });

  it('resolves every level title, goal, intro and hint', () => {
    for (const level of ALL_LEVELS) {
      expect(getText(level.titleTextId), level.id).not.toBe('');
      expect(getText(level.goalTextId), level.id).not.toBe('');
      expect(getText(level.introTextId), level.id).not.toBe('');

      for (const hintId of level.hintTextIds) {
        expect(getText(hintId), `${level.id} ${hintId}`).not.toBe('');
      }
    }
  });

  it('resolves every vocabulary word and definition', () => {
    for (const level of ALL_LEVELS) {
      for (const vocabularyId of level.vocabularyIds) {
        const entry = getVocabulary(vocabularyId);

        expect(entry, `${level.id} ${vocabularyId}`).not.toBeNull();
        expect(entry?.word, vocabularyId).not.toBe('');
        expect(entry?.definition, vocabularyId).not.toBe('');
      }
    }
  });
});
