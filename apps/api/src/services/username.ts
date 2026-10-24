/**
 * Adult accounts use a short identifier, never an email address. The format is
 * deliberately simple to type on a phone keyboard.
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

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
