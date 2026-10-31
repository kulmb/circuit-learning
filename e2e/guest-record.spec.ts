import { expect, test } from '@playwright/test';

import { gotoGuestMap } from './support/game';
import { progressFixture } from './support/levels';

const PROGRESS_KEY = 'circuits-de-zap:progress:v1';
const SEEDED_KEY = 'circuits-de-zap:e2e-guest-seeded';

test.describe('progression invitée', () => {
  test('affiche le record et l’efface pour de bon', async ({ page }) => {
    await page.addInitScript(
      ({ data, progressKey, seededKey }) => {
        if (window.localStorage.getItem(seededKey) === '1') {
          return;
        }

        window.localStorage.setItem(progressKey, JSON.stringify(data));
        window.localStorage.setItem(seededKey, '1');
      },
      {
        data: progressFixture('sound-01'),
        progressKey: PROGRESS_KEY,
        seededKey: SEEDED_KEY,
      },
    );

    await gotoGuestMap(page);

    await expect(page.locator('.level-map__guest')).toBeVisible();
    await expect(page.getByText('Niveaux terminés')).toBeVisible();
    await expect(page.locator('.level-map__guest-stats dd')).toHaveText([
      '26',
      '78',
      '0',
    ]);

    await page.getByRole('button', { name: 'Effacer ma progression' }).click();
    await expect(
      page.getByRole('heading', { name: 'Effacer ta progression ?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Oui, effacer' }).click();

    await expect(page.getByText('Ta progression a été effacée.')).toBeVisible();
    await expect(
      page.getByText('Aucune partie enregistrée pour l’instant.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Effacer ma progression' }),
    ).toHaveCount(0);

    await gotoGuestMap(page);

    await expect(
      page.getByText('Aucune partie enregistrée pour l’instant.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Effacer ma progression' }),
    ).toHaveCount(0);
  });
});
