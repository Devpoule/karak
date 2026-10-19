import { expect, test } from '@playwright/test';

test.describe('prototype de continuité visuelle', () => {
  test('compare les rendus et conserve la géométrie réelle des tuiles', async ({ page }) => {
    await page.goto('/continuity-prototype');

    const tiles = page.locator('.continuity-prototype__tile');
    await expect(tiles).toHaveCount(5);
    await expect(page.locator('.continuity-prototype__joins')).toBeVisible();

    const geometry = await tiles.first().evaluate(element => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    expect(geometry).toEqual({ width: 144, height: 144 });

    await page.getByRole('button', { name: 'Original', exact: true }).click();
    await expect(page.locator('.continuity-prototype__joins')).toHaveCount(0);

    await page.getByRole('button', { name: 'Continu', exact: true }).click();
    await expect(page.locator('.continuity-prototype__joins')).toBeVisible();
    await expect(page.locator('.continuity-prototype__contour')).toHaveCount(0);
    await page.getByRole('button', { name: 'Continu + contours', exact: true }).click();
    const contour = page.locator('.continuity-prototype__contour').first();
    await expect(contour).toHaveCount(1);
    await expect(contour).toHaveAttribute('x1', /\d+/);
    await page.getByRole('button', { name: 'Frontières', exact: true }).click();
    await expect(page.locator('.continuity-prototype__stage--boundaries')).toBeVisible();
  });

  test('reste utilisable en mobile sans débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/continuity-prototype');

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(390);
    await expect(page.locator('.continuity-prototype__stage')).toBeVisible();
  });
});
