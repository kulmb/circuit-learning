import { expect, test } from '@playwright/test';

import {
  connect,
  dragMagnetTo,
  LEVELS_THROUGH_DIODE,
  openLevel,
  toggleComponent,
  waitForSuccess,
} from './support/levels';

const THROUGH_MAG_01 = [...LEVELS_THROUGH_DIODE, 'mag-01'];
const THROUGH_MAG_02 = [...THROUGH_MAG_01, 'mag-02'];
const THROUGH_MAG_03 = [...THROUGH_MAG_02, 'mag-03'];

test.describe('chapitre 7 — l’aimant électrique', () => {
  test('le courant aimante la bobine', async ({ page }) => {
    await openLevel(page, 'mag-01', LEVELS_THROUGH_DIODE);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['coil-1', 'a']);
    await connect(page, ['coil-1', 'b'], ['battery-1', 'negative']);
    await toggleComponent(page, 'switch-1');

    await expect(page.locator('[data-meter-id="aimant"]')).toHaveAttribute(
      'aria-label',
      /Aimant : /,
    );
    await waitForSuccess(page);
  });

  test('l’aimant déplacé ferme la lame souple', async ({ page }) => {
    await openLevel(page, 'mag-03', THROUGH_MAG_02);

    await connect(page, ['battery-1', 'positive'], ['reed-1', 'a']);
    await connect(page, ['reed-1', 'b'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);

    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).not.toBeVisible();

    await dragMagnetTo(page, 'reed-1');

    await waitForSuccess(page);
  });

  test('le relais commande la lampe avec quatre bornes', async ({ page }) => {
    await openLevel(page, 'mag-04', THROUGH_MAG_03);

    await expect(
      page.locator('[data-component-id="relay-1"] [data-terminal-id]'),
    ).toHaveCount(4);

    await connect(page, ['coil-battery', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['relay-1', 'coilA']);
    await connect(page, ['relay-1', 'coilB'], ['coil-battery', 'negative']);
    await connect(page, ['lamp-battery', 'positive'], ['relay-1', 'contactA']);
    await connect(page, ['relay-1', 'contactB'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['lamp-battery', 'negative']);
    await toggleComponent(page, 'switch-1');

    await waitForSuccess(page);
  });
});
