import { expect, test } from '@playwright/test';

import { E2E_ACCOUNTS } from '../apps/api/test/e2e/fixtures';
import { loginAdult, press } from './support/game';

test('un encadrant crée un groupe, ajoute un élève et fixe l’appareil', async ({
  page,
}, testInfo) => {
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  const groupName = `Groupe E2E ${testInfo.project.name} ${Date.now().toString(36)}`;
  const studentName = 'Zoé';

  await loginAdult(page, E2E_ACCOUNTS.teacherA.username);

  await page.getByLabel('Nom du groupe', { exact: true }).fill(groupName);
  await page.getByRole('button', { name: 'Créer le groupe' }).click();

  const card = page.locator('article.admin-group-card').filter({
    has: page.getByRole('heading', { name: groupName, exact: true }),
  });

  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Ouvrir' }).click();
  await expect(
    page.getByRole('heading', { name: groupName, exact: true }),
  ).toBeVisible();

  const addForm = page.locator('form.admin-card').filter({
    has: page.getByRole('heading', { name: 'Ajouter un élève' }),
  });

  await addForm
    .getByLabel('Prénom', { exact: true })
    .fill(studentName);
  await addForm.locator('select').selectOption('panda');
  await addForm.getByRole('button', { name: 'Ajouter', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Mots de passe créés' }),
  ).toBeVisible();
  await expect(page.locator('.admin-student-list')).toContainText(studentName);

  await page
    .getByRole('button', { name: 'Fixer cet appareil à ce groupe' })
    .click();
  await expect(
    page.getByText('Cet appareil est fixé à ce groupe.', { exact: true }).first(),
  ).toBeVisible();

  // The pin skips the group-code step on the child login screen.
  await page.goto('/');
  await press(
    page.getByRole('button', { name: 'Jouer', exact: true }),
    { hasTouch },
  );
  await expect(
    page.getByRole('heading', { name: groupName, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Cet appareil est déjà fixé à ce groupe.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.avatar-picker__grid')).toContainText(studentName);
});
