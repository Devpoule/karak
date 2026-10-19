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

test('Xanros poursuit la résolution après un lancer à égalité contre une force 8', async ({ page }) => {
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const combatService = game?.combatService;
    const dungeonService = gameService?.['dungeonService'];
    if (!gameService || !playerService || !combatService || !dungeonService) {
      throw new Error('Game services unavailable');
    }

    const player = playerService.players.find((candidate: any) => candidate.controller === 'human');
    if (!player) throw new Error('Human player unavailable');
    player.heroId = 'xanros';
    player.isCursed = false;
    player.lives = 5;
    player.inventory.weapons = [
      { id: 'sword', name: 'Épée', attackBonus: 2, image: '/assets/equipment/sword.png' },
      { id: 'dagger', name: 'Poignards', attackBonus: 1, image: '/assets/equipment/dagger.png' },
    ];
    const sourceTile = dungeonService.getTileAt(0, 0) ?? { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const monsterTile = {
      definitionId: 'room-01', x: 1, y: 0, rotation: 0,
      tokenId: 'skeleton-key-guardian', tokenFace: 'front',
    };
    if (!combatService.startCombat(player, sourceTile, monsterTile)) throw new Error('Could not start Xanros combat');
    combatService.pendingCombat().monster.strength = 8;
    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = { ...roll, die1: 3, die2: 2, diceTotal: 5, attackPower: 8, monsterStrength: 8 };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  });

  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  const combat = page.locator('.combat-overlay');
  const card = combat.locator('.hero-power-card');
  await expect(card).toBeVisible({ timeout: 10_000 });
  const bounds = await card.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
  });
  const viewport = page.viewportSize()!;
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(viewport.width);
  await expect(combat.getByRole('heading', { name: 'Xanros' })).toBeVisible();
  await expect(combat.getByText('Sacrifice')).toBeVisible();

  await combat.locator('.hero-power-card__decline').click();
  await expect(combat.locator('.combat-overlay__verdict-title')).toBeVisible({ timeout: 5_000 });
});
