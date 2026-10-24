import { config } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { createAdminAccount } from '../services/adminAccounts.js';

const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';
const adminName = process.env.ADMIN_NAME?.trim() || 'Administrateur';

if (adminEmail === '' || adminPassword === '') {
  console.error(
    'ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires. Renseignez-les dans .env ou sur la ligne de commande.',
  );
  process.exit(1);
}

try {
  await connectDatabase(config.mongodbUri);

  const result = await createAdminAccount({
    email: adminEmail,
    password: adminPassword,
    displayName: adminName,
  });

  console.log(
    result.created
      ? `Administrateur créé : ${adminEmail}`
      : `Administrateur déjà présent : ${adminEmail} (mot de passe inchangé)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
