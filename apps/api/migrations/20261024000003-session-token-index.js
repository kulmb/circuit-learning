/**
 * Session cookies hold a random token; MongoDB only stores its SHA-256 hash.
 * The unique partial index also invalidates the handful of token-less sessions
 * that may exist from before authentication was implemented.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('sessions').deleteMany({ tokenHash: { $exists: false } });
  await db.collection('sessions').createIndex(
    { tokenHash: 1 },
    {
      name: 'sessions_token_hash_unique',
      unique: true,
      partialFilterExpression: { tokenHash: { $type: 'string' } },
    },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  await db.collection('sessions').dropIndex('sessions_token_hash_unique');
}
