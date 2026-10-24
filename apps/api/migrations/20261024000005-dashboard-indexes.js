/**
 * Indexes used by the group and student progress dashboards:
 * - recent activity and error grouping by group;
 * - sandbox thumbnails by student, newest first.
 *
 * @param {import('mongodb').Db} db
 */
export async function up(db) {
  await db.collection('levelattempts').createIndex(
    { groupId: 1, startedAt: -1 },
    { name: 'levelattempts_group_started' },
  );
  await db.collection('sandboxcircuits').createIndex(
    { userId: 1, updatedAt: -1 },
    { name: 'sandbox_user_updated' },
  );
}

/**
 * @param {import('mongodb').Db} db
 */
export async function down(db) {
  await db.collection('levelattempts').dropIndex('levelattempts_group_started');
  await db.collection('sandboxcircuits').dropIndex('sandbox_user_updated');
}
