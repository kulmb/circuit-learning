import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });

const databaseName = process.env.MONGODB_DB;

const config = {
  mongodb: {
    url:
      process.env.MONGODB_URI ??
      'mongodb://127.0.0.1:27017/circuits?directConnection=true',
    ...(databaseName === undefined ? {} : { databaseName }),
    options: {},
  },
  migrationsDir: path.resolve(here, 'migrations'),
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;
