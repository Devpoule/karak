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

async function prepareHoranCombat(
  page: import('@playwright/test').Page,
  lastLife: boolean,
  withSecondFountain = false,
): Promise<void> {
  await page.evaluate(({ lastLife: shouldUseLastLife, withSecondFountain: addFountain }) => {
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

    const humanIndex = playerService.players.findIndex((candidate: any) => candidate.controller === 'human');
    gameService.activePlayerIndex.set(humanIndex);
    const player = playerService.players[humanIndex];
    player.heroId = 'horan';
    player.inventory.spells.fill(null);
    player.inventory.weapons.fill(null);
    player.position = { x: 0, y: 0 };
    if (shouldUseLastLife) {
      player.lives = 1;
      player.recoveryState = 'none';
    }
    if (addFountain) {
      dungeonService.tiles.push({
        definitionId: 'healing-corner',
        x: 2,
        y: 0,
        rotation: 0,
      });
    }

    const sourceTile = dungeonService.getTileAt(0, 0) ?? { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const monsterTile = {
      definitionId: 'room-01',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    };
    if (!combatService.startCombat(player, sourceTile, monsterTile)) {
      throw new Error('Could not start Horan combat');
    }
    combatService.pendingCombat().monster.strength = 5;
    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = {
        ...roll,
        die1: 1,
        die2: 1,
        diceTotal: 2,
        attackPower: 2,
        monsterStrength: 5,
      };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  }, { lastLife, withSecondFountain });
}

test('Horan peut conserver un résultat défavorable sans Tir magique', async ({ page }) => {
  await openBoard(page);
  await prepareHoranCombat(page, false);

  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  const keep = page.getByRole('button', { name: 'Conserver ce résultat' });
  await expect(keep).toBeVisible({ timeout: 10_000 });
  await keep.click({ force: true });
  await expect(page.locator('.combat-overlay__verdict-title')).toContainText('gagne', { timeout: 10_000 });
  await expect(page.locator('.combat-overlay')).toBeHidden({ timeout: 10_000 });
});

test('Horan choisit une fontaine lors de sa Réincarnation', async ({ page }) => {
  await openBoard(page);
  await prepareHoranCombat(page, true, true);

  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  await page.getByRole('button', { name: 'Conserver ce résultat' }).click({ force: true });
  await expect(page.getByRole('button', { name: 'Fontaine suivante' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Fontaine suivante' }).click({ force: true });
  await page.getByRole('button', { name: 'Confirmer la Réincarnation' }).click({ force: true });

  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const player = game?.gameService?.activePlayer;
    return { position: player?.position, lives: player?.lives };
  })).toEqual({ position: { x: 2, y: 0 }, lives: 5 });
});
