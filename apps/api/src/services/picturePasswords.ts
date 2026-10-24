import { randomInt } from 'node:crypto';

import {
  PICTURE_PATTERN_IDS,
  picturePatternLabel,
  type PicturePatternId,
} from '@circuits/shared';

/** Three distinct pictures, in a random order. */
export function randomPicturePattern(): PicturePatternId[] {
  const pool = [...PICTURE_PATTERN_IDS];
  const pattern: PicturePatternId[] = [];

  while (pattern.length < 3) {
    const index = randomInt(pool.length);
    const [picture] = pool.splice(index, 1);

    if (picture !== undefined) {
      pattern.push(picture);
    }
  }

  return pattern;
}

export function picturePasswordLabels(
  pattern: readonly PicturePatternId[],
): string[] {
  return pattern.map((picture) => picturePatternLabel(picture));
}
