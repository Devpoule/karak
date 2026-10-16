import { expect, test } from '@playwright/test';

async function openBoard(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    let state = 0x5eed;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });

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

test('Aderyn reprend ses mouvements après Passer discrètement', async ({ page }) => {
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const turnService = gameService?.['turnService'];
    const player = gameService?.activePlayer;
    if (!gameService || !playerService || !turnService || !player) {
      throw new Error('Game services unavailable');
    }

    gameService.activePlayerIndex.set(playerService.players.indexOf(player));
    player.controller = 'human';
    player.heroId = 'aderyn';
    turnService.resetMovements();

    const source = { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const destination = {
      definitionId: 'room-01',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    };
    if (gameService.resolveTileEntry(player, source, destination) !== 'sneak-choice') {
      throw new Error('Sneak choice was not created');
    }
  });

  const dialog = page.getByRole('dialog', { name: /Marche rampante/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Passer discrètement' }).click();
  await expect(dialog).toBeHidden();

  const state = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const turnService = gameService?.['turnService'];
    const combatService = game?.combatService;
    return {
      remainingMovements: turnService?.remainingMovements(),
      movementsMade: turnService?.movementsMadeThisTurn(),
      pendingSneak: gameService?.pendingSneakChoice(),
      pendingCombat: combatService?.hasPendingCombat,
      turnTransitionPending: gameService?.turnTransitionPending(),
    };
  });

  expect(state.remainingMovements).toBe(3);
  expect(state.movementsMade).toBe(1);
  expect(state.pendingSneak).toBeNull();
  expect(state.pendingCombat).toBe(false);
  expect(state.turnTransitionPending).toBe(false);
});
