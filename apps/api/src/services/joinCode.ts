import { randomInt } from 'node:crypto';

import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_PATTERN,
} from '@circuits/shared';

/**
 * Six-character group codes. The alphabet removes 0/O and 1/I so a code can be
 * read aloud or copied by a child without confusion.
 */
export { JOIN_CODE_ALPHABET, JOIN_CODE_PATTERN };
export const JOIN_CODE_LENGTH = 6;

export function generateJoinCode(): string {
  let code = '';

  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }

  return code;
}
