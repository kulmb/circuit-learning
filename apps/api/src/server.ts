import { buildApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';

const app = buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await connectDatabase(config.mongodbUri);
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
}
