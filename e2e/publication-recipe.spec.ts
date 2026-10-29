import { expect, test } from '@playwright/test';

test.describe('recette du livrable de production', () => {
  test('sert les routes publiques et leur fallback Angular', async ({ page }) => {
    const routes = [
      { path: '/', locator: page.getByRole('link', { name: 'Jouer' }) },
      { path: '/play', locator: page.getByRole('heading', { name: 'Nouvelle partie' }) },
      { path: '/codex', locator: page.getByRole('heading', { name: 'Karak', exact: true }) },
      { path: '/continuity-prototype', locator: page.locator('.continuity-prototype__stage') },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      expect(response?.ok(), route.path).toBe(true);
      await expect(route.locator, route.path).toBeVisible();
    }
  });

  test('sert les assets requis et refuse un asset inexistant', async ({ page, request }) => {
    await page.goto('/');

    for (const assetPath of [
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/assets/board/karak-cover.jpg',
    ]) {
      const response = await request.get(assetPath);
      expect(response.ok(), assetPath).toBe(true);
    }

    const missingAsset = await request.get('/assets/does-not-exist.png');
    expect(missingAsset.status()).toBe(404);
  });

  test('reste utilisable sur un écran mobile sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/play');

    await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
  });
});
