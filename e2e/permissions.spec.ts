import { expect, test } from '@playwright/test';

import {
  E2E_ACCOUNTS,
  E2E_IDS,
} from '../apps/api/test/e2e/fixtures';
import { loginAdult } from './support/game';

test('un encadrant ne peut pas ouvrir la fiche d’un élève d’un autre groupe', async ({
  page,
}) => {
  await loginAdult(page, E2E_ACCOUNTS.teacherB.username);

  const response = await page.request.get(`/api/students/${E2E_IDS.lina}`);

  expect(response.status()).toBe(403);
  const body = (await response.json()) as {
    error?: { code?: string };
  };
  expect(body.error?.code).toBe('forbidden');

  await page.goto(`/admin/students/${E2E_IDS.lina}`);

  await expect(page.getByRole('alert')).toContainText(
    'Tu n’as pas le droit de faire cela.',
  );
  await expect(
    page.getByRole('heading', { name: 'Lina', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.admin-student-list')).toHaveCount(0);
});
