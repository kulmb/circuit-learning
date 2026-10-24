/**
 * Creates every index declared on the Mongoose schemas. Keep this file and the
 * schema index declarations in sync: `syncIndexes()` at API startup would
 * otherwise drop an index that only exists here.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('users').createIndex(
    { email: 1 },
    {
      name: 'users_email_unique',
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    },
  );

  await db
    .collection('groups')
    .createIndex({ joinCode: 1 }, { name: 'groups_join_code_unique', unique: true });
  await db
    .collection('groups')
    .createIndex({ 'members.userId': 1 }, { name: 'groups_members_user_id' });

  await db.collection('sessions').createIndex(
    { expiresAt: 1 },
    { name: 'sessions_expires_ttl', expireAfterSeconds: 0 },
  );
  await db
    .collection('sessions')
    .createIndex({ userId: 1 }, { name: 'sessions_user_id' });

  await db.collection('invites').createIndex(
    { tokenHash: 1 },
    { name: 'invites_token_hash_unique', unique: true },
  );
  await db.collection('invites').createIndex(
    { expiresAt: 1 },
    { name: 'invites_expires_ttl', expireAfterSeconds: 0 },
  );

  await db.collection('levelprogress').createIndex(
    { userId: 1, levelId: 1 },
    { name: 'levelprogress_user_level_unique', unique: true },
  );

  await db.collection('levelattempts').createIndex(
    { userId: 1, startedAt: -1 },
    { name: 'levelattempts_user_started' },
  );
  await db.collection('levelattempts').createIndex(
    { groupId: 1, levelId: 1 },
    { name: 'levelattempts_group_level' },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  const indexes = [
    ['users', 'users_email_unique'],
    ['groups', 'groups_join_code_unique'],
    ['groups', 'groups_members_user_id'],
    ['sessions', 'sessions_expires_ttl'],
    ['sessions', 'sessions_user_id'],
    ['invites', 'invites_token_hash_unique'],
    ['invites', 'invites_expires_ttl'],
    ['levelprogress', 'levelprogress_user_level_unique'],
    ['levelattempts', 'levelattempts_user_started'],
    ['levelattempts', 'levelattempts_group_level'],
  ];

  for (const [collection, indexName] of indexes) {
    await db.collection(collection).dropIndex(indexName);
  }
}
