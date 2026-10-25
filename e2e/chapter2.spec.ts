import { expect, test } from '@playwright/test';

const COMPLETED_BEFORE_CURRENT_05 = [
  'light-01',
  'light-02',
  'light-03',
  'light-04',
  'light-05',
  'light-06',
  'light-symbols',
  'light-07',
  'light-08',
  'light-09',
  'light-10',
  'current-01',
  'current-02',
  'current-03',
  'current-04',
];

function completedLevel(levelId: string): unknown {
  return {
    levelId,
    status: 'completed',
    stars: 3,
    attempts: 1,
    hintsUsed: 0,
    bestTimeMs: 1000,
    firstCompletedAt: 1000,
    lastPlayedAt: 1000,
  };
}

function unlockedLevel(levelId: string): unknown {
  return {
    levelId,
    status: 'unlocked',
    stars: 0,
    attempts: 0,
    hintsUsed: 0,
    bestTimeMs: null,
    firstCompletedAt: null,
    lastPlayedAt: null,
  };
}

function progressFixture(
  completed: string[],
  unlocked: string,
): unknown {
  const levels: Record<string, unknown> = {};

  for (const levelId of completed) {
    levels[levelId] = completedLevel(levelId);
  }

  levels[unlocked] = unlockedLevel(unlocked);

  return {
    version: 1,
    levels,
    attempts: [],
    vocabulary: [],
    sandbox: [],
  };
}

test.describe('chapitre 2', () => {
  test('règle la lumière avec le variateur', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture(COMPLETED_BEFORE_CURRENT_05, 'current-05'));

    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    await page.getByRole('button', { name: 'Jouer en invité' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Chapitre 2 : La force du courant',
        exact: true,
      }),
    ).toBeVisible();

    await page.locator('.level-node[data-level-id="current-05"]').click();
    await page.waitForSelector('svg.workbench-svg');

    await page.locator('[data-component-id="rheostat-1"]').click();
    const slider = page.locator('[data-rheostat-slider="rheostat-1"]');
    await expect(slider).toBeVisible();

    const box = await slider.boundingBox();
    if (box === null) {
      throw new Error('Variateur introuvable.');
    }

    await page.mouse.move(box.x + 8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });

  test('mesure la puissance sans afficher de chiffres', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture(
      [...COMPLETED_BEFORE_CURRENT_05, 'current-05', 'current-06'],
      'current-07',
    ));

    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    await page.getByRole('button', { name: 'Jouer en invité' }).click();
    await page.locator('.level-node[data-level-id="current-07"]').click();
    await page.waitForSelector('svg.workbench-svg');

    await expect(page.locator('[data-meter-id]')).toHaveCount(4);
    await expect(page.getByText('Tension', { exact: true })).toBeVisible();
    await expect(page.getByText('Puissance', { exact: true })).toBeVisible();

    const metersText = await page.locator('.workbench-meters').innerText();
    expect(metersText).not.toMatch(/\d/);

    await page.locator('[data-component-id="rheostat-1"]').click();
    const slider = page.locator('[data-rheostat-slider="rheostat-1"]');
    await expect(slider).toBeVisible();

    const box = await slider.boundingBox();
    if (box === null) {
      throw new Error('Variateur introuvable.');
    }

    await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 8, box.y + box.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });
});
