import { createHash, randomBytes } from 'node:crypto';

/** URL-safe random token used in a cookie or an invitation link. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Tokens are stored only as SHA-256 digests: a database leak does not hand out
 * usable sessions or invitation links.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
