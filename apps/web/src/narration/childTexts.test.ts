import { describe, expect, it } from 'vitest';

import { texts } from './fr';

const CHILD_PREFIXES = [
  'home.',
  'workbench.',
  'sandbox.',
  'display.',
  'component.',
  'zap.',
  'chapter.',
  'map.',
  'pwa.',
  'login.',
  'collection.',
  'picture.',
  'level.',
  'symbols.',
  'material.',
  'materials.',
  'success.',
  'vocab.',
  'meter.',
  'challenge.',
] as const;

const ADULT_PREFIXES = ['parentSettings.', 'progress.merge'] as const;

const ENGLISH_WORDS =
  /\b(the|and|with|click|drag|drop|next|back|play|stop|sound|level|star|open|closed|hello|please)\b/i;

function isChildText(key: string): boolean {
  if (ADULT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return false;
  }

  if (key === 'progress.saveError') {
    return true;
  }

  return CHILD_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '');
}

function wordCount(text: string): number {
  return (
    text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}

describe('child-facing French texts', () => {
  const entries = Object.entries(texts).filter(([key]) => isChildText(key));

  it('has a controlled set of child-facing entries', () => {
    expect(entries.length).toBeGreaterThan(80);
  });

  it('keeps every child sentence to twelve words or fewer', () => {
    const tooLong: string[] = [];

    for (const [key, text] of entries) {
      for (const sentence of sentences(text)) {
        const count = wordCount(sentence);

        if (count > 12) {
          tooLong.push(`${key} (${count}): ${sentence}`);
        }
      }
    }

    expect(tooLong).toEqual([]);
  });

  it('does not expose obvious English words to children', () => {
    const english: string[] = [];

    for (const [key, text] of entries) {
      if (ENGLISH_WORDS.test(text)) {
        english.push(`${key}: ${text}`);
      }
    }

    expect(english).toEqual([]);
  });
});
