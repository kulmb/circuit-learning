import { test } from '@playwright/test';

import {
  connect,
  LEVELS_BEFORE_0_4_0,
  openLevel,
  toggleComponent,
  waitForSuccess,
} from './support/levels';

test.describe('chapitre 5 — le coin des sons', () => {
  test('la sonnerie', async ({ page }) => {
    await openLevel(page, 'sound-01', LEVELS_BEFORE_0_4_0);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['buzzer-1', 'a']);
    await connect(page, ['buzzer-1', 'b'], ['battery-1', 'negative']);
    await toggleComponent(page, 'switch-1');

    await waitForSuccess(page);
  });

  test('deux boutons en série', async ({ page }) => {
    await openLevel(page, 'sound-02', [
      ...LEVELS_BEFORE_0_4_0,
      'sound-01',
    ]);

    await connect(page, ['battery-1', 'positive'], ['switch-1', 'a']);
    await connect(page, ['switch-1', 'b'], ['switch-2', 'a']);
    await connect(page, ['switch-2', 'b'], ['buzzer-1', 'a']);
    await connect(page, ['buzzer-1', 'b'], ['battery-1', 'negative']);

    await toggleComponent(page, 'switch-1');
    await toggleComponent(page, 'switch-2');

    await waitForSuccess(page);
  });
});
