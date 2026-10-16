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

async function prepareVictoriusCombat(
  page: import('@playwright/test').Page,
  options: { movementCount: number; die1: number; die2: number; strength: number; ai?: boolean },
): Promise<void> {
  await page.evaluate((configuration) => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const playerService = gameService?.['playerService'];
    const combatService = game?.combatService;
    const dungeonService = gameService?.['dungeonService'];
    const turnService = gameService?.['turnService'];
    if (!gameService || !playerService || !combatService || !dungeonService || !turnService) {
      throw new Error('Game services unavailable');
    }

    const playerIndex = configuration.ai
      ? playerService.players.findIndex((candidate: any) => candidate.controller === 'ai')
      : playerService.players.findIndex((candidate: any) => candidate.controller === 'human');
    if (playerIndex < 0) throw new Error('Victorius player unavailable');

    gameService.activePlayerIndex.set(playerIndex);
    const player = playerService.players[playerIndex];
    player.heroId = 'victorius';
    player.isCursed = false;
    player.lives = 5;
    player.recoveryState = 'none';
    player.position = { x: 0, y: 0 };
    turnService.resetMovements();
    for (let movement = 0; movement < configuration.movementCount; movement++) {
      turnService.consumeMovement();
    }
    turnService.stopMovements();

    const sourceTile = dungeonService.getTileAt(0, 0) ?? {
      definitionId: 'start', x: 0, y: 0, rotation: 0,
    };
    const monsterTile = {
      definitionId: 'room-01',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    };
    if (!combatService.startCombat(player, sourceTile, monsterTile)) {
      throw new Error('Could not start Victorius combat');
    }
    combatService.pendingCombat().monster.strength = configuration.strength;
    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = {
        ...roll,
        die1: configuration.die1,
        die2: configuration.die2,
        diceTotal: configuration.die1 + configuration.die2,
        attackPower: configuration.die1 + configuration.die2 + roll.equipmentBonus + roll.heroBonus,
        monsterStrength: configuration.strength,
      };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  }, options);
}

test('Victorius peut refuser une relance et choisir de poursuivre son tour', async ({ page }) => {
  await openBoard(page);
  await prepareVictoriusCombat(page, { movementCount: 1, die1: 6, die2: 1, strength: 20 });

  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  await expect(page.getByRole('button', { name: 'Conserver ce résultat' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Conserver ce résultat' }).click({ force: true });
  await expect(page.locator('.combat-overlay__verdict-title')).toContainText('gagne', { timeout: 10_000 });
  await expect(page.locator('.combat-overlay')).toBeHidden({ timeout: 10_000 });

  await expect(page.getByRole('dialog', { name: 'Inarrêtable — Victorius' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer le tour' }).click({ force: true });

  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const turnService = gameService?.['turnService'];
    return {
      remainingMovements: turnService?.remainingMovements(),
      pendingDecision: gameService?.pendingUnstoppableDecision(),
    };
  })).toEqual({ remainingMovements: 3, pendingDecision: null });
});

test('Victorius termine normalement après un Inarrêtable au quatrième mouvement, y compris pour l’IA', async ({ page }) => {
  await openBoard(page);
  await prepareVictoriusCombat(page, { movementCount: 4, die1: 6, die2: 1, strength: 20, ai: true });

  await expect(page.locator('.combat-overlay')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.combat-overlay')).toBeHidden({ timeout: 15_000 });
  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    return game?.gameService?.activePlayerIndex();
  }), { timeout: 15_000 }).toBe(0);
});
