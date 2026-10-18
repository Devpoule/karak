import { expect, test } from '@playwright/test';

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 430, height: 932 },
] as const;

/** Vérifie qu'une page mobile ne produit pas d'erreur navigateur ni de débordement horizontal. */
async function expectStableMobilePage(page: import('@playwright/test').Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    brokenImages: Array.from(document.images).filter(image => !image.complete || image.naturalWidth === 0).length,
  }))).toEqual({ horizontalOverflow: false, brokenImages: 0 });
}

test('stabilité mobile : accueil et préparation restent sans erreur ni débordement', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`));

  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.home__logo')).toBeVisible();
    await expectStableMobilePage(page);

    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
    await expectStableMobilePage(page);
  }

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
