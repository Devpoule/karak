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

test('Marche astrale autorise à traverser un mur entre deux tuiles découvertes', async ({ page }) => {
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const dungeonService = gameService?.['dungeonService'];
    const turnService = gameService?.['turnService'];
    const player = playerService?.players.find((candidate: any) => candidate.controller === 'human');
    if (!gameService || !playerService || !dungeonService || !turnService || !player) {
      throw new Error('Game services unavailable');
    }

    const playerIndex = playerService.players.indexOf(player);
    player.heroId = 'argentus';
    player.isCursed = false;
    player.position = { x: 0, y: 0 };
    turnService.resetMovements();
    dungeonService.tiles.push({
      definitionId: 'straight-01',
      x: 1,
      y: 0,
      rotation: 90,
    });
    gameService.activePlayerIndex.set(null);
    gameService.activePlayerIndex.set(playerIndex);
  });

  await expect(page.locator('app-board')).toBeVisible();
  const destination = page.getByRole('button', { name: 'Déplacer le héros vers cette tuile' });
  await expect(destination).toBeVisible();
  await destination.click();

  const astralAnnouncement = page.locator('.hero-panel__card-stage--flipped .hero-power-card--announcement');
  await expect(astralAnnouncement).toBeVisible({ timeout: 5_000 });
  await expect(astralAnnouncement).toContainText('Marche astrale');

  const activeCounter = page.locator('.player-sidebar--active .movement-counter--compact');
  await expect(activeCounter.locator('.movement-counter__point')).toHaveCount(4);
  await expect(activeCounter.locator('.movement-counter__point--consuming')).toHaveCount(0);
  await expect(activeCounter.locator('.movement-counter__point--consumed')).toHaveCount(1);
  await expect.poll(() => activeCounter.locator('.movement-counter__point--consumed .movement-counter__point-core').evaluate(element =>
    getComputedStyle(element).filter,
  )).toBe('none');

  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const player = gameService?.activePlayer;
    const turnService = gameService?.['turnService'];
    return {
      position: player?.position,
      remainingMovements: turnService?.remainingMovements(),
      pendingResolution: gameService?.hasPendingTileResolution,
    };
  })).toEqual({
    position: { x: 1, y: 0 },
    remainingMovements: 3,
    pendingResolution: false,
  });
});
