import { expect, test } from '@playwright/test';

async function openPreparedGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible();
  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator('button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]').first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
}

test('TURN-019 permet de sélectionner un portail visible et consomme un seul mouvement', async ({ page }) => {
  await openPreparedGame(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const player = gameService?.activePlayer;
    const dungeon = gameService?.['dungeonService'];
    if (!gameService || !player || !dungeon) throw new Error('Game services unavailable');
    const source = { definitionId: 'portal-straight-01', x: 0, y: 0, rotation: 0 };
    const destination = { definitionId: 'portal-straight-02', x: 2, y: 0, rotation: 0 };
    dungeon.tiles.splice(0, dungeon.tiles.length, source, destination);
    player.position = { x: 0, y: 0 };
    player.controller = 'human';
    gameService.activePlayerIndex.set(0);
    if (!gameService.openPortalTravelSelection()) throw new Error('Portal selection did not open');
  });

  const destination = page.locator('.board__tile').filter({ has: page.locator('img[src*="portal"]') }).last();
  await expect(destination).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmer le déplacement entre portails' })).toBeVisible();
  await expect(page.locator('.board__tile--portal-destination')).toHaveCount(1);
  await page.getByRole('button', { name: 'Confirmer le déplacement entre portails' }).click();

  const state = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    return {
      position: game?.gameService?.activePlayer?.position,
      remaining: game?.gameService?.['turnService']?.remainingMovements(),
      selection: game?.gameService?.portalTravelSelection(),
    };
  });
  expect(state.position).toEqual({ x: 2, y: 0 });
  expect(state.remaining).toBe(3);
  expect(state.selection).toBeNull();
});
