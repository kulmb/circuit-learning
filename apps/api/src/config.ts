import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Works both from src (tsx) and from dist: four levels up is the repo root.
dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

const DEFAULT_MONGODB_URI =
  'mongodb://127.0.0.1:27017/circuits?directConnection=true';

function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: readPort(process.env.PORT, 3100),
  mongodbUri: process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
} as const;
