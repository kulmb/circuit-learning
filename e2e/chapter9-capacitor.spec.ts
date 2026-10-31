import { expect, test } from '@playwright/test';

import {
  connect,
  LEVELS_THROUGH_SENSOR,
  openLevel,
  toggleComponent,
  waitForChargeFull,
  waitForSuccess,
} from './support/levels';

const THROUGH_CAP_01 = [...LEVELS_THROUGH_SENSOR, 'cap-01'];
const THROUGH_CAP_02 = [...THROUGH_CAP_01, 'cap-02'];

test.describe('chapitre 9 — le réservoir d’électricité', () => {
  test('le condensateur garde la lampe allumée', async ({ page }) => {
    await openLevel(page, 'cap-01', LEVELS_THROUGH_SENSOR);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['capacitor-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['bulb-1', 'a']);
    await connect(page, ['capacitor-1', 'b'], ['battery-1', 'negative']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);

    await toggleComponent(page, 'switch-1');
    await waitForChargeFull(page);
    await toggleComponent(page, 'switch-1');

    await waitForSuccess(page);

    await page.locator('[data-component-id="capacitor-1"]').click();
    await page.getByRole('button', { name: 'Vider' }).click();
    await expect(page.locator('[data-meter-id="charge"]')).toHaveAttribute(
      'aria-label',
      'Charge : vide',
    );
  });

  test('le condensateur chargé se vide dans la lampe', async ({ page }) => {
    await openLevel(page, 'cap-03', THROUGH_CAP_02);

    await connect(page, ['capacitor-1', 'a'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['capacitor-1', 'b']);

    await toggleComponent(page, 'switch-1');

    await waitForSuccess(page);
  });
});
