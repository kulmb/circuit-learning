import argon2 from 'argon2';

/** Stable representation of the three pictures chosen by a child. */
export function pictureSecretFromPattern(pattern: readonly string[]): string {
  return pattern
    .map((picture) => picture.trim().toLowerCase())
    .join(':');
}

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, { type: argon2.argon2id });
}

export async function verifySecret(
  hash: string,
  secret: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}
