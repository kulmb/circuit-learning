import { expect, test } from '@playwright/test';

import { E2E_ACCOUNTS } from '../apps/api/test/e2e/fixtures';
import { loginAdult } from './support/game';

test('un parent voit la progression de son enfant sur téléphone', async ({
  page,
}) => {
  await loginAdult(page, E2E_ACCOUNTS.parent.username);

  await expect(
    page.getByRole('heading', { name: 'Mes enfants', exact: true }),
  ).toBeVisible();

  const card = page.locator('article.admin-parent-card').filter({
    hasText: 'Lina',
  });

  await expect(card).toBeVisible();
  await expect(card).toContainText('Groupe A');
  await expect(
    card.locator('.admin-parent-stats span').nth(0).locator('strong'),
  ).toHaveText('2');
  await expect(
    card.locator('.admin-parent-stats span').nth(1).locator('strong'),
  ).toHaveText('5');
  await expect(card).toContainText('2 niveaux terminés');
  await expect(card).toContainText('5 étoiles gagnées');

  await card.getByRole('button', { name: 'Voir la fiche' }).click();
  await expect(
    page.getByRole('heading', { name: 'Lina', exact: true }),
  ).toBeVisible();
});
