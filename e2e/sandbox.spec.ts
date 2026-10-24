import { expect, test } from '@playwright/test';

test.describe('atelier libre', () => {
  test('offre tous les composants sans défilement horizontal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Atelier libre' }).click();
    await expect(page.locator('.palette-item')).toHaveCount(8);

    const overflow = await page
      .locator('.palette')
      .evaluate((palette) => palette.scrollWidth - palette.clientWidth);

    expect(overflow).toBeLessThanOrEqual(1);
  });
});
