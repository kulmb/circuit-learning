import { config } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { changeAccountPassword } from '../services/adminAccounts.js';
import { promptHidden } from './promptHidden.js';

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const withEquals = process.argv.find((argument) => argument.startsWith(prefix));

  if (withEquals !== undefined) {
    return withEquals.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

const email = (readOption('email') ?? process.env.ADMIN_EMAIL ?? '').trim();

if (email === '') {
  console.error(
    'Indiquez le compte avec ADMIN_EMAIL=... ou --email=... .',
  );
  process.exit(1);
}

let newPassword = process.env.ADMIN_NEW_PASSWORD ?? '';

if (newPassword === '') {
  try {
    newPassword = await promptHidden('Nouveau mot de passe : ');
    const confirmation = await promptHidden('Confirme le mot de passe : ');

    if (newPassword !== confirmation) {
      console.error('Les deux mots de passe ne correspondent pas.');
      process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

try {
  await connectDatabase(config.mongodbUri);

  const result = await changeAccountPassword({
    email,
    newPassword,
  });

  console.log(
    `Mot de passe modifié pour ${email}. Sessions révoquées : ${result.sessionsRevoked}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
