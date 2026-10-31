import { expect, test } from '@playwright/test';

import {
  connect,
  LEVELS_BEFORE_0_4_0,
  openLevel,
  toggleComponent,
  waitForSuccess,
} from './support/levels';

test.describe('chapitre 6 — une porte à sens unique', () => {
  test('la diode conduit dans le bon sens', async ({ page }) => {
    await openLevel(page, 'diode-01', LEVELS_BEFORE_0_4_0);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['diode-1', 'anode']);
    await connect(page, ['diode-1', 'cathode'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);
    await toggleComponent(page, 'switch-1');

    await waitForSuccess(page);
  });

  test('la diode à l’envers donne un indice', async ({ page }) => {
    await openLevel(page, 'diode-01', LEVELS_BEFORE_0_4_0);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['diode-1', 'cathode']);
    await connect(page, ['diode-1', 'anode'], ['bulb-1', 'a']);
    await connect(page, ['bulb-1', 'b'], ['battery-1', 'negative']);
    await toggleComponent(page, 'switch-1');

    await page
      .getByRole('button', { name: 'Demander un indice à Zap' })
      .click();
    await expect(page.getByRole('status')).toContainText(
      'Une diode a un sens.',
    );
    await expect(
      page.getByRole('heading', { name: 'Bravo !', exact: true }),
    ).not.toBeVisible();
  });
});
