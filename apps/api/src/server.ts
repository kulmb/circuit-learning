import { buildApp } from './app.js';

const DEFAULT_PORT = 3100;
const DEFAULT_HOST = '127.0.0.1';

const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const host = process.env.HOST ?? DEFAULT_HOST;

const app = buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
