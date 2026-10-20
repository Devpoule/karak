import { expect, test } from '@playwright/test';

/** Prépare une partie réelle après avoir traversé les écrans de setup. */
async function openPreparedGame(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    let state = 0x1234abcd;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible();

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
  await expect(page.locator('app-movement-counter')).toHaveCount(1);
  await expect(page.locator('.game__turn-announcement')).toBeVisible();

  const initialTurnState = await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = root && ng?.getComponent(root.querySelector('app-game') ?? root);
    return {
      phase: game?.gameService?.phase(),
      movementsMade: game?.gameService?.turnService?.movementsMadeThisTurn(),
      activePlayerIndex: game?.gameService?.activePlayerIndex(),
    };
  });
  expect(initialTurnState.phase).toBe('playing');
  expect(initialTurnState.movementsMade).toBe(0);
  expect(initialTurnState.activePlayerIndex).toBeGreaterThanOrEqual(0);
}

test('une partie active reprend après une interruption par le Codex', async ({ page }) => {
  await openPreparedGame(page);

  await page.getByRole('link', { name: 'Codex' }).click();
  await expect(page).toHaveURL(/\/codex\?from=game$/);
  await expect(page.getByRole('button', { name: '← Retour à la partie' })).toBeVisible();

  await page.getByRole('button', { name: '← Retour à la partie' }).click();
  await expect(page.locator('app-board')).toBeVisible();
  await expect(page.locator('app-movement-counter')).toHaveCount(1);
  await expect(page.locator('.game__turn-announcement')).toBeVisible();
});

test('partie intégrale déterministe jusqu’au classement du Dragon', async ({ page }) => {
  await openPreparedGame(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const combatService = game?.combatService;
    const playerService = gameService?.['playerService'];
    const player = gameService?.activePlayer;
    if (!gameService || !combatService || !playerService || !player) throw new Error('Game services unavailable');

    player.heroId = 'argentus';
    player.inventory.spells.fill(null);
    player.inventory.weapons[0] = {
      id: 'sword', kind: 'weapon', name: 'Épée', image: '/assets/tokens/sword.png', attackBonus: 2,
    };
    const sourceTile = { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const dragonTile = {
      definitionId: 'room-01', x: 1, y: 0, rotation: 0, tokenId: 'dragon', tokenFace: 'front',
    };
    if (!combatService.startCombat(player, sourceTile, dragonTile)) throw new Error('Dragon combat not started');
    combatService.pendingCombat().monster.strength = 1;
    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = { ...roll, die1: 6, die2: 6, diceTotal: 12, attackPower: 14, monsterStrength: 1 };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  });

  await expect(page.locator('.combat-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  await expect(page.locator('.combat-overlay__verdict-title')).toContainText('gagne', { timeout: 15_000 });
  await expect(page.locator('.combat-overlay__score--hero')).toHaveCount(1);
  await expect(page.locator('.combat-overlay__score--monster')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Récompense du combat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Récupérer le trésor' })).toHaveCount(1);
  await expect(page.locator('app-toast-container .toast-container')).toHaveCount(0);
  await page.getByRole('button', { name: 'Récupérer le trésor' }).click();

  await expect(page.getByRole('heading', { name: 'Fin de la partie' })).toBeVisible();
  await expect(page.getByText('Rubis du Dragon')).toBeVisible();
  await expect(page.getByText(/Vainqueur/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Classement final' })).toBeVisible();
  await expect(page.locator('.game__game-over-emblem')).toBeVisible();
  await expect(page.locator('.game__ranking-entry')).toHaveCount(2);
  await expect(page.locator('.game__ranking-entry--winner')).toHaveCount(1);
  await expect(page.locator('.game__ranking-entry').first().locator('.game__ranking-position')).toHaveText('1');
  await expect(page.locator('.game__ranking-entry').first().locator('.game__ranking-portrait')).toBeVisible();
  await expect(page.locator('app-board')).toHaveCount(0);
});

test('présentation de fin de partie adaptée au mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPreparedGame(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');
    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const players = gameService?.['playerService']?.players;
    if (!gameService || !players?.[0] || !players[1]) throw new Error('Game services unavailable');

    players[0].heroId = 'argentus';
    players[1].heroId = 'taia';
    gameService.finalRanking.set([
      { player: players[0], points: 4 },
      { player: players[1], points: 2 },
    ]);
    gameService.winners.set([players[0]]);
    gameService.phase.set('game-over');
  });

  await expect(page.getByRole('heading', { name: 'Fin de la partie' })).toBeVisible();
  await expect(page.locator('.game__ranking-entry')).toHaveCount(2);
  const layout = await page.locator('.game__game-over').evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});
