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
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible();

  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator('button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]').first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }

  await expect(page.getByRole('button', { name: 'Entrer dans le donjon' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
}

async function prepareCombat(page: import('@playwright/test').Page, strength: number, withMagic = false): Promise<void> {
  await page.evaluate(({ monsterStrength, withMagic: shouldUseMagic }) => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const combatService = game?.combatService;
    const playerService = game?.gameService?.['playerService'];
    if (!combatService || !playerService) throw new Error('Game services unavailable');

    const humanIndex = playerService.players.findIndex((candidate: any) => candidate.controller === 'human');
    if (humanIndex < 0) throw new Error('No human player available');
    game.gameService.activePlayerIndex.set(humanIndex);
    const player = playerService.players[humanIndex];
    if (!player) throw new Error('No active player available');
    // Keep the generic combat fixture neutral: no reroll power is involved.
    player.heroId = 'argentus';
    player.inventory.spells.fill(null);

    player.inventory.weapons[0] = {
      id: 'sword',
      kind: 'weapon',
      name: 'Épée',
      image: '/assets/tokens/sword.png',
      attackBonus: 2,
    };
    if (shouldUseMagic) {
      player.inventory.spells[0] = {
        id: 'fire-sword',
        kind: 'spell',
        effect: 'magic-attack',
        name: 'Tir magique',
        image: '/assets/tokens/fire-sword.png',
      };
    }

    const sourceTile = { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const monsterTile = {
      definitionId: 'room-01',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    };

    if (!combatService.startCombat(player, sourceTile, monsterTile)) {
      throw new Error('Could not start fixture combat');
    }
    combatService.pendingCombat().monster.strength = monsterStrength;

    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = {
        ...roll,
        die1: 3,
        die2: 1,
        diceTotal: 4,
        attackPower: 6,
        monsterStrength,
      };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  }, { monsterStrength: strength, withMagic });
}

async function runCombatScenario(
  page: import('@playwright/test').Page,
  strength: number,
  verdict: string,
  rollFile: string,
  verdictFile: string,
  withMagic = false,
): Promise<void> {
  await openBoard(page);
  await prepareCombat(page, strength, withMagic);
  const overlay = page.locator('.combat-overlay');
  await expect(overlay).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lancer les dés' })).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  await expect(page.locator('.combat-overlay__dice')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.combat-overlay__bonus')).toHaveText('+2 pts');
  if (withMagic) {
    await page.getByRole('button', { name: /Utiliser Tir magique/ }).click({ force: true });
    await expect(page.locator('.combat-overlay__bonus--magic')).toHaveText('+1pt');
  }
  await page.screenshot({ path: `playwright-report/${rollFile}`, fullPage: true });

  await expect(page.locator('.combat-overlay__verdict-title')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.combat-overlay__verdict-title')).toContainText(verdict);
  await page.screenshot({ path: `playwright-report/${verdictFile}`, fullPage: true });

  const continueButton = page.getByRole('button', { name: 'Continuer' });
  if (await continueButton.isVisible().catch(() => false)) await continueButton.click({ force: true });
  await expect(overlay).toBeHidden({ timeout: 10_000 });
}

test('combat fixture affiche une victoire avec bonus d’épée', async ({ page }) => {
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-victory.png', 'combat-victory.png');
});

test('combat fixture affiche une égalité avec bonus d’épée', async ({ page }) => {
  await runCombatScenario(page, 6, 'Égalité', 'combat-roll-tie.png', 'combat-tie.png');
});

test('combat fixture affiche une défaite avec bonus d’épée', async ({ page }) => {
  await runCombatScenario(page, 7, 'gagne', 'combat-roll-defeat.png', 'combat-defeat.png');
});

test('combat fixture reste lisible sur écran étroit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-narrow.png', 'combat-victory-narrow.png');
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});

test('combat fixture reste lisible en paysage court', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-landscape.png', 'combat-victory-landscape.png');
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});

test('combat fixture affiche le bonus vert d’un Tir magique', async ({ page }) => {
  await runCombatScenario(page, 6, 'gagne', 'combat-roll-magic.png', 'combat-magic.png', true);
});
