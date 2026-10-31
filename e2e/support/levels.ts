import { expect, type Locator, type Page } from '@playwright/test';

import { gotoGuestMap } from './game';

/**
 * Progress fixtures for the guided levels. The game stores one entry per
 * level; completed levels are enough to unlock the next one, but the tests
 * also mark the requested level as unlocked so the map never depends on the
 * reconciliation order.
 */
export const LEVELS_BEFORE_0_4_0: readonly string[] = [
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

export const LEVELS_THROUGH_SOUND: readonly string[] = [
  ...LEVELS_BEFORE_0_4_0,
  'sound-01',
  'sound-02',
  'sound-03',
];

export const LEVELS_THROUGH_DIODE: readonly string[] = [
  ...LEVELS_THROUGH_SOUND,
  'diode-01',
  'diode-02',
  'diode-03',
];

export const LEVELS_THROUGH_MAGNET: readonly string[] = [
  ...LEVELS_THROUGH_DIODE,
  'mag-01',
  'mag-02',
  'mag-03',
  'mag-04',
  'mag-05',
];

export const LEVELS_THROUGH_SENSOR: readonly string[] = [
  ...LEVELS_THROUGH_MAGNET,
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

export function progressFixture(
  unlocked: string,
  completed: readonly string[] = LEVELS_BEFORE_0_4_0,
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

export async function openLevel(
  page: Page,
  levelId: string,
  completed: readonly string[] = LEVELS_BEFORE_0_4_0,
): Promise<void> {
  // Install the fixture before any app script runs, so the progress provider
  // reads the unlocked level on its very first render.
  await page.addInitScript((data) => {
    window.localStorage.setItem(
      'circuits-de-zap:progress:v1',
      JSON.stringify(data),
    );
  }, progressFixture(levelId, completed));

  await gotoGuestMap(page);
  await page.locator(`.level-node[data-level-id="${levelId}"]`).click();
  await page.waitForSelector('svg.workbench-svg');
}

export function terminal(
  page: Page,
  componentId: string,
  terminalId: string,
): Locator {
  return page.locator(
    `[data-terminal-component="${componentId}"][data-terminal-id="${terminalId}"]`,
  );
}

export async function connect(
  page: Page,
  from: readonly [string, string],
  to: readonly [string, string],
): Promise<void> {
  await terminal(page, from[0], from[1]).click();
  await terminal(page, to[0], to[1]).click();
}

export async function toggleComponent(
  page: Page,
  componentId: string,
): Promise<void> {
  await page.locator(`[data-component-id="${componentId}"]`).click();
}

export async function waitForSuccess(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Bravo !', exact: true }),
  ).toBeVisible();
}

export async function waitForChargeFull(page: Page): Promise<void> {
  await expect(page.locator('[data-meter-id="charge"]')).toHaveAttribute(
    'aria-label',
    'Charge : plein',
    { timeout: 15_000 },
  );
}

/**
 * Drags the free magnet accessory onto a component. The magnet position is
 * expressed in board coordinates, so the nearest reed closes as soon as the
 * pointer reaches the component centre.
 */
export async function dragMagnetTo(
  page: Page,
  componentId: string,
): Promise<void> {
  const magnet = page.locator('[data-magnet-id="magnet"]');
  const target = page.locator(`[data-component-id="${componentId}"]`);
  await expect(magnet).toBeVisible();

  const magnetBox = await magnet.boundingBox();
  const targetBox = await target.boundingBox();

  if (magnetBox === null || targetBox === null) {
    throw new Error('Aimant ou composant introuvable.');
  }

  const start = {
    x: magnetBox.x + magnetBox.width / 2,
    y: magnetBox.y + magnetBox.height / 2,
  };
  const end = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 8, { steps: 2 });
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
}

export async function toggleDayNight(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Jour / nuit' }).click();
}
