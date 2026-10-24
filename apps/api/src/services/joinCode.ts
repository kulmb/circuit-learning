import { randomInt } from 'node:crypto';

/**
 * Six-character group codes. The alphabet removes 0/O and 1/I so a code can be
 * read aloud or copied by a child without confusion.
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function generateJoinCode(): string {
  let code = '';

  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }

  return code;
}
