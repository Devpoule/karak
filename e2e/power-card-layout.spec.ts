import { expect, test } from '@playwright/test';

async function openBoard(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: /Qui commence/ })).toBeVisible();
  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator('button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]').first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
}

async function assertCardInsideViewport(page: import('@playwright/test').Page): Promise<void> {
  const geometry = await page.locator('.player-hud__power-card-host .hero-power-card').evaluate(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  });
  const viewport = page.viewportSize()!;
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(viewport.width);
  expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.height).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}

async function openFirstPowerConsultation(page: import('@playwright/test').Page): Promise<void> {
  const closedPlayerTab = page.getByRole('button', { name: /Afficher la fiche du joueur/ }).first();
  if (await closedPlayerTab.isVisible().catch(() => false)) {
    await closedPlayerTab.click();
  }
  const power = page.locator('.player-sidebar__power-badge').first();
  await expect(power).toBeVisible();
  await power.click();
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
}

test('la consultation du pouvoir reste centrée et refermable au clavier', async ({ page }) => {
  await openBoard(page);
  const trigger = page.locator('.player-sidebar__power-badge').first();
  await openFirstPowerConsultation(page);
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
  await assertCardInsideViewport(page);
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('la consultation reste contenue en portrait, paysage et faible hauteur', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBoard(page);
  await openFirstPowerConsultation(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 360 }]) {
    await page.setViewportSize(viewport);
    const card = page.locator('.player-hud__power-card-host .hero-power-card');
    await expect(card).toBeVisible();
    await assertCardInsideViewport(page);
  }
});
