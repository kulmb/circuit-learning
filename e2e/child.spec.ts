import { expect, test } from '@playwright/test';

import { e2eChildFor } from '../apps/api/test/e2e/fixtures';
import {
  completeLevelOne,
  loginChild,
  openLevelOne,
  press,
} from './support/game';

test('un enfant se connecte, câble au doigt et gagne ses étoiles', async ({
  page,
}, testInfo) => {
  const options = { hasTouch: Boolean(testInfo.project.use.hasTouch) };
  const child = e2eChildFor(testInfo.project.name, 'child');

  await loginChild(page, child.name, options);

  await openLevelOne(page, options);
  await completeLevelOne(page, options);

  await expect(page.locator('.level-complete-stars')).toHaveAttribute(
    'aria-label',
    '3 / 3',
  );

  await press(
    page.getByRole('button', { name: 'Continuer', exact: true }),
    options,
  );
  await expect(page.getByText('Tu as appris…', { exact: true })).toBeVisible();

  await press(
    page.getByRole('button', { name: 'Carte des niveaux', exact: true }),
    options,
  );

  const level = page.locator('.level-node[data-level-id="light-01"]');
  await expect(level).toBeVisible();
  await expect(level.locator('.level-node__stars')).toHaveAttribute(
    'aria-label',
    '3 / 3',
  );
});
