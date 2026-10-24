/**
 * Adult accounts use a short username instead of an email. Students have no
 * username, so the unique index is partial.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('users').createIndex(
    { username: 1 },
    {
      name: 'users_username_unique',
      unique: true,
      partialFilterExpression: { username: { $type: 'string' } },
    },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  await db.collection('users').dropIndex('users_username_unique');
}
