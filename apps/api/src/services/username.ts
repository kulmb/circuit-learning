/**
 * Adult accounts use a short identifier, never an email address. The format is
 * deliberately simple to type on a phone keyboard.
 */
import { USERNAME_PATTERN } from '@circuits/shared';

export { USERNAME_PATTERN };

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'L’identifiant doit contenir 3 à 32 caractères : lettres minuscules, chiffres, point, tiret ou underscore, et commencer par une lettre ou un chiffre.',
    );
  }
}
