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

test('Substitution échange les héros sans résoudre automatiquement la tuile d’arrivée', async ({ page }) => {
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
    if (!gameService || !playerService || !dungeonService || !turnService) {
      throw new Error('Game services unavailable');
    }

    const activeIndex = playerService.players.findIndex((player: any) => player.controller === 'human');
    const targetIndex = playerService.players.findIndex((player: any, index: number) => index !== activeIndex);
    if (activeIndex < 0 || targetIndex < 0) throw new Error('Players unavailable');

    const xanros = playerService.players[activeIndex];
    const target = playerService.players[targetIndex];
    gameService.activePlayerIndex.set(activeIndex);
    xanros.heroId = 'xanros';
    xanros.isCursed = false;
    xanros.lives = 5;
    xanros.recoveryState = 'none';
    target.heroId = 'aderyn';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    turnService.resetMovements();

    if (!dungeonService.getTileAt(1, 0)) {
      dungeonService.tiles.push({ definitionId: 'room-1', x: 1, y: 0, rotation: 0 });
    }
  });

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const target = gameService?.xanrosSubstitutionTargets?.[0];
    if (!target || !gameService?.openXanrosSubstitution()) {
      throw new Error('Xanros substitution could not be opened');
    }
  });
  const card = page.locator('.board__reward-backdrop app-hero-power-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.hero-power-card__choice')).toHaveCount(1);
  await card.locator('.hero-power-card__choice').click();

  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const turnService = gameService?.['turnService'];
    const combatService = game?.combatService;
    const playerService = gameService?.['playerService'];
    const xanros = playerService?.players.find((player: any) => player.heroId === 'xanros');
    const target = playerService?.players.find((player: any) => player.heroId === 'aderyn');
    return {
      xanrosPosition: xanros?.position,
      targetPosition: target?.position,
      remainingMovements: turnService?.remainingMovements(),
      movementsMade: turnService?.movementsMadeThisTurn(),
      pendingCombat: combatService?.pendingCombat(),
      pendingAction: gameService?.pendingXanrosSubstitutionAction(),
    };
  })).toEqual({
    xanrosPosition: { x: 1, y: 0 },
    targetPosition: { x: 0, y: 0 },
    remainingMovements: 0,
    movementsMade: 4,
    pendingCombat: null,
    pendingAction: null,
  });
});
