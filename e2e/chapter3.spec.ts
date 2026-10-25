import { expect, test } from '@playwright/test';

import { press, tapTerminal } from './support/game';

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

test.describe('chapitre 3', () => {
  test('câble un circuit combiné et gagne le niveau', async ({
    page,
  }, testInfo) => {
    const options = { hasTouch: Boolean(testInfo.project.use.hasTouch) };

    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture('assembly-03'));

    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    await page.getByRole('button', { name: 'Jouer en invité' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Chapitre 3 : En série ou en parallèle ?',
        exact: true,
      }),
    ).toBeVisible();

    await page.locator('.level-node[data-level-id="assembly-03"]').click();
    await page.waitForSelector('svg.workbench-svg');

    // The Zap bubble sits over the lower-left corner of the board; tuck it
    // away so every terminal stays reachable on tablets.
    await press(
      page.getByRole('button', { name: 'Cacher Zap' }),
      options,
    );

    await tapTerminal(page, 'battery-1', 'positive', options);
    await tapTerminal(page, 'bulb-1', 'a', options);

    await tapTerminal(page, 'bulb-1', 'b', options);
    await tapTerminal(page, 'bulb-2', 'a', options);

    await tapTerminal(page, 'bulb-1', 'b', options);
    await tapTerminal(page, 'bulb-3', 'a', options);

    await tapTerminal(page, 'bulb-2', 'b', options);
    await tapTerminal(page, 'battery-1', 'negative', options);

    await tapTerminal(page, 'bulb-3', 'b', options);
    await tapTerminal(page, 'battery-1', 'negative', options);

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });
});
