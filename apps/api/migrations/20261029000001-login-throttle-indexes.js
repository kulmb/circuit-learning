/**
 * Adult login throttling is keyed by username + client IP, so a single
 * address cannot lock the real account. The TTL index forgets counters after
 * one quiet day.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('loginthrottles').createIndex(
    { key: 1 },
    { name: 'loginthrottles_key_unique', unique: true },
  );
  await db.collection('loginthrottles').createIndex(
    { username: 1 },
    { name: 'loginthrottles_username' },
  );
  await db.collection('loginthrottles').createIndex(
    { updatedAt: 1 },
    {
      name: 'loginthrottles_updated_ttl',
      expireAfterSeconds: 24 * 60 * 60,
    },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  await db.collection('loginthrottles').dropIndex(
    'loginthrottles_updated_ttl',
  );
  await db.collection('loginthrottles').dropIndex(
    'loginthrottles_username',
  );
  await db.collection('loginthrottles').dropIndex(
    'loginthrottles_key_unique',
  );
}
