import { expect, test } from '@playwright/test';

import { e2eChildFor } from '../apps/api/test/e2e/fixtures';
import {
  completeLevelOne,
  loginChild,
  openLevelOne,
  press,
} from './support/game';

const QUEUE_PREFIX = 'circuits-de-zap:api-queue:v1:';

test('un niveau terminé hors ligne remonte au serveur au retour du réseau', async ({
  page,
  context,
}, testInfo) => {
  const options = { hasTouch: Boolean(testInfo.project.use.hasTouch) };
  const child = e2eChildFor(testInfo.project.name, 'offline');

  await loginChild(page, child.name, options);
  await openLevelOne(page, options);

  await context.setOffline(true);
  await completeLevelOne(page, options);

  const queuedOperations = async (): Promise<number> =>
    page.evaluate((prefix) => {
      const key = Object.keys(window.localStorage).find((candidate) =>
        candidate.startsWith(prefix),
      );

      if (key === undefined) {
        return 0;
      }

      try {
        const parsed: unknown = JSON.parse(
          window.localStorage.getItem(key) ?? '[]',
        );

        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    }, QUEUE_PREFIX);

  await expect.poll(queuedOperations).toBeGreaterThan(0);

  await press(
    page.getByRole('button', { name: 'Continuer', exact: true }),
    options,
  );
  await press(
    page.getByRole('button', { name: 'Carte des niveaux', exact: true }),
    options,
  );

  const level = page.locator('.level-node[data-level-id="light-01"]');
  await expect(level.locator('.level-node__stars')).toHaveAttribute(
    'aria-label',
    '3 / 3',
  );

  await context.setOffline(false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });

  await expect
    .poll(
      async () => {
        const response = await page.request.get('/api/me/progress');

        if (!response.ok()) {
          return null;
        }

        const body = (await response.json()) as {
          levels?: Array<{ levelId?: string; status?: string; stars?: number }>;
        };
        const entry = body.levels?.find(
          (candidate) => candidate.levelId === 'light-01',
        );

        return entry === undefined
          ? null
          : { stars: entry.stars, status: entry.status };
      },
      { timeout: 30_000 },
    )
    .toEqual({ status: 'completed', stars: 3 });

  await expect.poll(queuedOperations, { timeout: 30_000 }).toBe(0);

  const serverProgress = await page.request.get('/api/me/progress');
  expect(serverProgress.ok()).toBe(true);
});
