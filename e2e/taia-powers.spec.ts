import { expect, test } from '@playwright/test';

async function openBoard(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: /Qui commence/ })).toBeVisible();

  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator(
      'button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]',
    ).first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }

  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
}

test('Taia reprend ses mouvements après le choix d’un coffre sans clé', async ({ page }) => {
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const dungeonService = gameService?.['dungeonService'];
    const tokenBagService = gameService?.['tokenBagService'];
    const turnService = gameService?.['turnService'];
    if (!gameService || !playerService || !dungeonService || !tokenBagService || !turnService) {
      throw new Error('Game services unavailable');
    }

    const humanIndex = playerService.players.findIndex((candidate: any) => candidate.controller === 'human');
    gameService.activePlayerIndex.set(humanIndex);
    const player = playerService.players[humanIndex];
    player.heroId = 'taia';
    player.isCursed = false;
    turnService.resetMovements();

    const source = dungeonService.getTileAt(0, 0);
    const destination = {
      definitionId: 'straight-room',
      x: 1,
      y: 0,
      rotation: 0,
    };
    if (!source) throw new Error('Start tile unavailable');
    dungeonService.tiles.push(destination);
    tokenBagService['bag'] = ['closed-chest', 'giant-rat'];
    tokenBagService.remainingTokens.set(2);
    turnService.consumeMovement();

    if (gameService.resolveTileEntry(player, source, destination, true, true) !== 'token-choice') {
      throw new Error('Taia token choice was not created');
    }
  });

  const card = page.locator('.board__reward-backdrop app-hero-power-card');
  await expect(card).toBeVisible();
  await expect(card.getByText('Tisseuse de destin')).toBeVisible();
  await expect(card.locator('.hero-power-card__choice')).toHaveCount(2);
  await card.getByRole('button', { name: /closed-chest/ }).click();

  const state = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const turnService = gameService?.['turnService'];
    return {
      remainingMovements: turnService?.remainingMovements(),
      movementsMade: turnService?.movementsMadeThisTurn(),
      pendingTokenChoice: gameService?.pendingTokenChoice(),
      hasPendingResolution: gameService?.hasPendingTileResolution,
      turnTransitionPending: gameService?.turnTransitionPending(),
    };
  });

  expect(state.remainingMovements).toBe(3);
  expect(state.movementsMade).toBe(1);
  expect(state.pendingTokenChoice).toBeNull();
  expect(state.hasPendingResolution).toBe(false);
  expect(state.turnTransitionPending).toBe(false);
});
