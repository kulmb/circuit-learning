import { config } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import {
  DEMO_GROUP_NAME,
  DEMO_STUDENTS,
  seedDemoData,
} from '../services/seedDemoData.js';

if (config.nodeEnv === 'production') {
  console.error(
    'Le seed de démonstration est interdit en production. Créez un administrateur avec admin:create.',
  );
  process.exit(1);
}

const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';
const adminName = process.env.ADMIN_NAME?.trim() || 'Administrateur';

if (adminUsername === '' || adminPassword === '') {
  console.error(
    'ADMIN_USERNAME et ADMIN_PASSWORD sont obligatoires. Copiez .env.example vers .env et renseignez-les.',
  );
  process.exit(1);
}

try {
  await connectDatabase(config.mongodbUri);

  const result = await seedDemoData({
    adminUsername,
    adminPassword,
    adminName,
  });

  console.log(`Administrateur : ${adminUsername}`);
  console.log(
    `Groupe « ${DEMO_GROUP_NAME} » : code ${result.joinCode} (${result.groupId})`,
  );
  console.log(
    `Élèves : ${DEMO_STUDENTS.map((student) => student.displayName).join(', ')}`,
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
