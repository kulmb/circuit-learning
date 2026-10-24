import { expect, test } from '@playwright/test';

import { gotoGuestMap, openLevelOne } from './support/game';

const EXPECTED_LAYOUT: Record<string, string> = {
  'desktop-chrome': 'large',
  'desktop-safari': 'large',
  'ipad-landscape': 'medium',
  'ipad-portrait': 'medium',
  'galaxy-tab-s4': 'large',
  'iphone-13-landscape': 'compact',
  'pixel-7-landscape': 'compact',
};

test.describe('captures de référence', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('la carte des niveaux reste stable', async ({ page }, testInfo) => {
    await gotoGuestMap(page);
    await waitForFonts(page);

    const layout = EXPECTED_LAYOUT[testInfo.project.name];
    await expect(page.locator('.app-root')).toHaveAttribute(
      'data-layout',
      layout ?? 'medium',
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot('level-map.png');
  });

  test('l’écran de niveau reste stable', async ({ page }) => {
    await gotoGuestMap(page);
    await openLevelOne(page, { hasTouch: false });
    await waitForFonts(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot('level-screen.png');
  });
});

async function waitForFonts(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
