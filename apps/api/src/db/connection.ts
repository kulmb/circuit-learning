import mongoose from 'mongoose';

import { syncModelIndexes } from './models/index.js';

/**
 * Connects Mongoose and creates the indexes declared on the schemas. Indexes
 * are also created by the first migrate-mongo migration; both paths are
 * idempotent so a fresh database works in development and in production.
 */
export async function connectDatabase(uri: string): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Untrusted filters must never carry Mongo operators; trusted internal
  // filters are wrapped explicitly with mongoose.trusted().
  mongoose.set('sanitizeFilter', true);

  await mongoose.connect(uri, {
    autoIndex: false,
    serverSelectionTimeoutMS: 10_000,
  });
  await syncModelIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
