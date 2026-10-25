import { expect, test } from '@playwright/test';

test('AI-010 : une partie IA contre IA enchaîne plusieurs rotations sans intervention', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    let state = 0x5eed;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });

  await page.goto('/play');
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Simuler une partie IA contre IA' }).click();
  await expect(page.getByText('Simulation IA contre IA')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  await expect(page.locator('button[aria-label^="Lancer les dés"], button[aria-label^="Relancer les dés"]'))
    .toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Entrer dans le donjon' })).toBeVisible({ timeout: 25_000 });
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible({ timeout: 10_000 });

  await expect(page.locator('.player-hud__side--left')).toBeVisible();
  await expect(page.locator('.player-hud__side--right')).toBeVisible();
  await expect.poll(() => page.locator('.board__tile').count(), {
    timeout: 70_000,
    intervals: [250, 500, 1_000],
  }).toBeGreaterThan(1);
  await expect(page.locator('.game__game-over')).toHaveCount(0);
  await expect(page.locator('.game__play-area app-board')).toBeVisible();
});
