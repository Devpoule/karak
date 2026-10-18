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

test('Aderyn reprend ses mouvements après avoir refusé Marche rampante', async ({ page }) => {
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

  const dialog = page.getByRole('dialog', { name: 'Aderyn' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Utiliser le pouvoir' }).click();
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

test('la carte de Marche rampante reste utilisable en mobile avec mouvement réduit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const gameService = game?.gameService;
    const player = gameService?.activePlayer;
    if (!gameService || !player) throw new Error('Game services unavailable');
    player.controller = 'human';
    player.heroId = 'aderyn';
    const source = { definitionId: 'start', x: 0, y: 0, rotation: 0 };
    const destination = {
      definitionId: 'room-01', x: 1, y: 0, rotation: 0,
      tokenId: 'giant-rat', tokenFace: 'front',
    };
    if (gameService.resolveTileEntry(player, source, destination) !== 'sneak-choice') {
      throw new Error('Sneak choice was not created');
    }
  });

  const card = page.locator('app-hero-power-card');
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Utiliser le pouvoir' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Continuer sans' })).toBeVisible();
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 360 }]) {
    await page.setViewportSize(viewport);
    const visual = await card.evaluate(element => {
      const box = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll('button')].map(button => button.getBoundingClientRect());
      return {
        width: box.width,
        right: box.right,
        bottom: box.bottom,
        animation: getComputedStyle(element.querySelector('.hero-power-card')!).animationName,
        buttonsInViewport: buttons.every(button => button.right <= window.innerWidth && button.bottom <= window.innerHeight),
      };
    });
    expect(visual.width).toBeLessThanOrEqual(viewport.width);
    expect(visual.right).toBeLessThanOrEqual(viewport.width);
    expect(visual.bottom).toBeLessThanOrEqual(viewport.height);
    expect(visual.buttonsInViewport).toBe(true);
    expect(visual.animation).toBe('none');
  }
});
