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

async function prepareHumanChest(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const dungeonService = gameService?.['dungeonService'];
    if (!gameService || !playerService || !dungeonService) throw new Error('Game services unavailable');

    const player = playerService.players.find((candidate: any) => candidate.controller === 'human');
    const source = dungeonService.getTileAt(0, 0);
    if (!player || !source) throw new Error('Human player or start tile unavailable');

    playerService.addEquipment(player, {
      id: 'key', kind: 'key', name: 'Clé', image: '/assets/tokens/key-small.webp',
    });
    gameService.activePlayerIndex.set(playerService.players.indexOf(player));
    const chest = {
      definitionId: 'room-01', x: 1, y: 0, rotation: 0,
      tokenId: 'closed-chest', tokenFace: 'front',
    };
    dungeonService.tiles.push(chest);
    if (gameService.resolveTileEntry(player, source, chest) !== 'treasure') {
      throw new Error('Chest decision was not created');
    }
  });
}

test('ROOM-009 permet de continuer sans ouvrir et reprend les mouvements', async ({ page }) => {
  await openBoard(page);
  await prepareHumanChest(page);

  const dialog = page.getByRole('dialog', { name: 'Coffre fermé' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Ouvrir le coffre' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continuer' }).click();

  const state = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const player = gameService?.activePlayer;
    return {
      pending: gameService?.pendingTreasure(),
      key: player?.inventory.key?.id,
      movements: gameService?.['turnService'].remainingMovements(),
    };
  });

  expect(state.pending).toBeNull();
  expect(state.key).toBe('key');
  expect(state.movements).toBe(4);
});

test('ROOM-009 ouvre le coffre uniquement après confirmation', async ({ page }) => {
  await openBoard(page);
  await prepareHumanChest(page);

  const dialog = page.getByRole('dialog', { name: 'Coffre fermé' });
  await dialog.getByRole('button', { name: 'Ouvrir le coffre' }).click();

  const state = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const player = gameService?.activePlayer;
    return {
      pending: gameService?.pendingTreasure(),
      key: player?.inventory.key,
      treasures: player?.treasures,
      transition: gameService?.turnTransitionPending(),
    };
  });

  expect(state.pending).toBeNull();
  expect(state.key).toBeNull();
  expect(state.treasures).toContain('opened-chest');
  expect(state.transition).toBe(true);
});
