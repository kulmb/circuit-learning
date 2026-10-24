import { config } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { createAdminAccount } from '../services/adminAccounts.js';

const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';
const adminName = process.env.ADMIN_NAME?.trim() || 'Administrateur';

if (adminUsername === '' || adminPassword === '') {
  console.error(
    'ADMIN_USERNAME et ADMIN_PASSWORD sont obligatoires. Renseignez-les dans .env ou sur la ligne de commande.',
  );
  process.exit(1);
}

try {
  await connectDatabase(config.mongodbUri);

  const result = await createAdminAccount({
    username: adminUsername,
    password: adminPassword,
    displayName: adminName,
  });

  console.log(
    result.created
      ? `Administrateur créé : ${adminUsername}`
      : `Administrateur déjà présent : ${adminUsername} (mot de passe inchangé)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
