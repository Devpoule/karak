import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

async function openBoard(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    let state = 0x27_2026;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });

  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator(
      'button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]',
    ).first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }

  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.player-hud__turn-controls')).toBeVisible();
}

test('les contrôles du plateau restent accessibles sur les formats mobiles ciblés', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBoard(page);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => {
      const board = document.querySelector('.board')?.getBoundingClientRect();
      const camera = document.querySelector('.board__camera-tools')?.getBoundingClientRect();
      const hud = document.querySelector('.player-hud__turn-controls')?.getBoundingClientRect();
      if (!board || !camera || !hud) return null;

      const within = (box: DOMRect) => (
        box.left >= board.left - 1
        && box.right <= board.right + 1
        && box.top >= board.top - 1
        && box.bottom <= board.bottom + 1
      );
      const overlaps = (a: DOMRect, b: DOMRect) => (
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      );

      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        cameraWithinBoard: within(camera),
        hudWithinBoard: within(hud),
        cameraHudOverlap: overlaps(camera, hud),
      };
    })).toEqual({
      horizontalOverflow: false,
      cameraWithinBoard: true,
      hudWithinBoard: true,
      cameraHudOverlap: false,
    });
  }
});
