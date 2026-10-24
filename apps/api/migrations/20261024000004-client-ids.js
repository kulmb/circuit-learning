/**
 * Offline-first clients send their own attempt and sandbox ids, so a retried
 * request updates the same row instead of creating a duplicate. The indexes
 * are partial: rows created before this migration have no client id.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('levelattempts').createIndex(
    { userId: 1, clientId: 1 },
    {
      name: 'levelattempts_user_client_unique',
      unique: true,
      partialFilterExpression: { clientId: { $type: 'string' } },
    },
  );
  await db.collection('sandboxcircuits').createIndex(
    { userId: 1, clientId: 1 },
    {
      name: 'sandbox_user_client_unique',
      unique: true,
      partialFilterExpression: { clientId: { $type: 'string' } },
    },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  await db
    .collection('levelattempts')
    .dropIndex('levelattempts_user_client_unique');
  await db
    .collection('sandboxcircuits')
    .dropIndex('sandbox_user_client_unique');
}
