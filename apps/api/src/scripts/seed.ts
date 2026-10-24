import { config } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import {
  DEMO_GROUP_NAME,
  DEMO_PICTURE_PATTERN,
  DEMO_STUDENTS,
  seedDemoData,
} from '../services/seedDemoData.js';

const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';
const adminName = process.env.ADMIN_NAME?.trim() || 'Administrateur';

if (adminEmail === '' || adminPassword === '') {
  console.error(
    'ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires. Copiez .env.example vers .env et renseignez-les.',
  );
  process.exit(1);
}

try {
  await connectDatabase(config.mongodbUri);

  const result = await seedDemoData({
    adminEmail,
    adminPassword,
    adminName,
  });

  console.log(`Administrateur : ${adminEmail}`);
  console.log(
    `Groupe « ${DEMO_GROUP_NAME} » : code ${result.joinCode} (${result.groupId})`,
  );
  console.log(
    `Élèves : ${DEMO_STUDENTS.map((student) => student.displayName).join(', ')}`,
  );
  console.log(
    `Motif de démonstration : ${DEMO_PICTURE_PATTERN.join(' → ')}`,
  );
  console.log(
    `Créés : admin ${result.createdAdmin ? 'oui' : 'déjà présent'}, groupe ${result.createdGroup ? 'oui' : 'déjà présent'}, ${result.createdStudents} élève(s).`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
