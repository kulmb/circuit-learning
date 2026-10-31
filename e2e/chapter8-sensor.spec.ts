import { expect, test } from '@playwright/test';

import {
  connect,
  LEVELS_THROUGH_MAGNET,
  openLevel,
  toggleDayNight,
  waitForSuccess,
} from './support/levels';

const THROUGH_SENSOR_01 = [...LEVELS_THROUGH_MAGNET, 'sensor-01'];
const THROUGH_SENSOR_02 = [...THROUGH_SENSOR_01, 'sensor-02'];

test.describe('chapitre 8 — la lumière commande', () => {
  test('la photorésistance répond au jour et à la nuit', async ({ page }) => {
    await openLevel(page, 'sensor-01', LEVELS_THROUGH_MAGNET);

    await connect(page, ['battery-1', 'positive'], ['ldr-1', 'a']);
    await connect(page, ['ldr-1', 'b'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);

    await waitForSuccess(page);

    const dayNight = page.getByRole('button', { name: 'Jour / nuit' });
    await expect(dayNight).toContainText('Jour');
    await dayNight.click();
    await expect(dayNight).toContainText('Nuit');
    await dayNight.click();
    await expect(dayNight).toContainText('Jour');
  });

  test('la veilleuse s’allume la nuit', async ({ page }) => {
    await openLevel(page, 'sensor-02', THROUGH_SENSOR_01);

    await connect(page, ['battery-1', 'positive'], ['ldr-1', 'a']);
    await connect(page, ['ldr-1', 'b'], ['relay-1', 'coilA']);
    await connect(page, ['relay-1', 'coilB'], ['battery-1', 'negative']);
    await connect(page, ['battery-1', 'positive'], ['relay-1', 'contactA']);
    await connect(page, ['relay-1', 'contactB'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).not.toBeVisible();

    await toggleDayNight(page);

    await waitForSuccess(page);
  });

  test('le panneau solaire fait tourner le moteur', async ({ page }) => {
    await openLevel(page, 'sensor-03', THROUGH_SENSOR_02);

    await connect(page, ['solar-1', 'positive'], ['motor-1', 'a']);
    await connect(page, ['motor-1', 'b'], ['solar-1', 'negative']);

    await waitForSuccess(page);

    const dayNight = page.getByRole('button', { name: 'Jour / nuit' });
    await expect(dayNight).toContainText('Jour');
    await dayNight.click();
    await expect(dayNight).toContainText('Nuit');
  });
});
