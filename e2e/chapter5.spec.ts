import { expect, test } from '@playwright/test';

const COMPLETED_BEFORE_0_4_0 = [
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
  'current-05',
  'current-06',
  'current-07',
  'assembly-01',
  'assembly-02',
  'assembly-03',
  'assembly-04',
  'defi-01',
  'defi-02',
  'defi-03',
  'defi-04',
];

const COMPLETED_BEFORE_CAP_01 = [
  ...COMPLETED_BEFORE_0_4_0,
  'sound-01',
  'sound-02',
  'sound-03',
  'diode-01',
  'diode-02',
  'diode-03',
  'mag-01',
  'mag-02',
  'mag-03',
  'mag-04',
  'mag-05',
  'sensor-01',
  'sensor-02',
  'sensor-03',
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
  unlocked: string,
  completed: string[] = COMPLETED_BEFORE_0_4_0,
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

async function openGuestMap(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.getByRole('button', { name: 'Jouer en invité' }).click();
}

function terminal(
  page: import('@playwright/test').Page,
  componentId: string,
  terminalId: string,
) {
  return page.locator(
    `[data-terminal-component="${componentId}"][data-terminal-id="${terminalId}"]`,
  );
}

async function connect(
  page: import('@playwright/test').Page,
  from: [string, string],
  to: [string, string],
): Promise<void> {
  await terminal(page, from[0], from[1]).click();
  await terminal(page, to[0], to[1]).click();
}

test.describe('chapitres 5 et 6', () => {
  test('la sonnerie du chapitre 5', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture('sound-01'));

    await openGuestMap(page);
    await expect(
      page.getByRole('heading', { name: 'Chapitre 5 : Le coin des sons' }),
    ).toBeVisible();
    await page.locator('.level-node[data-level-id="sound-01"]').click();
    await page.waitForSelector('svg.workbench-svg');

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['buzzer-1', 'a']);
    await connect(page, ['buzzer-1', 'b'], ['battery-1', 'negative']);
    await page.locator('[data-component-id="switch-1"]').click();

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });

  test('la diode du chapitre 6', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture('diode-01'));

    await openGuestMap(page);
    await page.locator('.level-node[data-level-id="diode-01"]').click();
    await page.waitForSelector('svg.workbench-svg');

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['diode-1', 'anode']);
    await connect(page, ['diode-1', 'cathode'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);
    await page.locator('[data-component-id="switch-1"]').click();

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });

  test('le condensateur du chapitre 9', async ({ page }) => {
    test.setTimeout(25_000);
    await page.goto('/');
    await page.evaluate((data) => {
      window.localStorage.setItem(
        'circuits-de-zap:progress:v1',
        JSON.stringify(data),
      );
    }, progressFixture('cap-01', COMPLETED_BEFORE_CAP_01));

    await openGuestMap(page);
    await page.locator('.level-node[data-level-id="cap-01"]').click();
    await page.waitForSelector('svg.workbench-svg');

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['capacitor-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['bulb-1', 'a']);
    await connect(page, ['capacitor-1', 'b'], ['battery-1', 'negative']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);

    await page.locator('[data-component-id="switch-1"]').click();
    await page.waitForTimeout(4000);
    await page.locator('[data-component-id="switch-1"]').click();

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).toBeVisible();
  });
});
