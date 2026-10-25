import { expect, test } from '@playwright/test';

import { press } from './support/game';

function progressFixture(levelId: string): unknown {
  return {
    version: 1,
    levels: {
      [levelId]: {
        levelId,
        status: 'unlocked',
        stars: 0,
        attempts: 0,
        hintsUsed: 0,
        bestTimeMs: null,
        firstCompletedAt: null,
        lastPlayedAt: null,
      },
    },
    attempts: [],
    vocabulary: [],
    sandbox: [],
  };
}

test.describe('défis de Zap', () => {
  test('génère un circuit et le renouvelle', async ({
    page,
  }, testInfo) => {
    const options = { hasTouch: Boolean(testInfo.project.use.hasTouch) };

    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture('defi-01'));

    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    await page.getByRole('button', { name: 'Jouer en invité' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Chapitre 4 : Les défis de Zap',
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.locator(
        '.level-node[data-level-id="defi-01"] .level-node__label',
      ),
    ).toHaveText('Défi 1');

    await page.locator('.level-node[data-level-id="defi-01"]').click();
    await page.waitForSelector('svg.workbench-svg');

    const pageLocator = page.locator('.workbench-page');
    const firstSeed = await pageLocator.getAttribute('data-challenge-seed');

    expect(firstSeed).not.toBeNull();
    await expect(page.locator('[data-component-id]').first()).toBeVisible();
    await expect(page.locator('[data-meter-id="courant"]')).toBeVisible();

    await press(
      page.getByRole('button', { name: 'Nouveau défi' }),
      options,
    );

    await expect(pageLocator).not.toHaveAttribute(
      'data-challenge-seed',
      firstSeed ?? '',
    );
  });
});
