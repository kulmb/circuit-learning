import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Works both from src (tsx) and from dist: four levels up is the repo root.
dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

const DEFAULT_MONGODB_URI =
  'mongodb://127.0.0.1:27017/circuits?directConnection=true';

/**
 * Development-only fallback. Production refuses to start without a real
 * secret, so a deployment can never silently keep this value.
 */
const DEVELOPMENT_COOKIE_SECRET =
  'circuits-de-zap-development-cookie-secret';

function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

function readCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET?.trim();

  if (secret !== undefined && secret.length >= 32) {
    return secret;
  }

  if (nodeEnv === 'production') {
    throw new Error(
      'COOKIE_SECRET doit contenir au moins 32 caractères en production.',
    );
  }

  return DEVELOPMENT_COOKIE_SECRET;
}

export const config = {
  nodeEnv,
  host: process.env.HOST ?? '127.0.0.1',
  port: readPort(process.env.PORT, 3100),
  mongodbUri: process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
  publicOrigin:
    process.env.PUBLIC_ORIGIN ??
    (nodeEnv === 'production'
      ? 'https://circuit-learning.87543362.xyz'
      : 'http://127.0.0.1:5173'),
  cookieSecret: readCookieSecret(),
  secureCookies: readBoolean(
    process.env.COOKIE_SECURE,
    nodeEnv === 'production',
  ),
  // The API only listens on loopback in production, behind Caddy, so the
  // X-Forwarded-For header can be trusted there.
  trustProxy: readBoolean(process.env.TRUST_PROXY, false),
} as const;
