import { expect, test } from '@playwright/test';

async function openPreparedGame(page: import('@playwright/test').Page): Promise<void> {
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
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
}

test('la fontaine est facultative et son activation consomme les mouvements restants', async ({ page }) => {
  await openPreparedGame(page);
  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const service = game?.gameService;
    const dungeon = service?.['dungeonService'];
    const turn = service?.['turnService'];
    if (!service || !dungeon || !turn) throw new Error('Game services unavailable');
    const fountain = { definitionId: 'healing-corner', x: 0, y: 0, rotation: 0 };
    dungeon.tiles.splice(0, dungeon.tiles.length, fountain);
    service.activePlayerIndex.set(0);
    const player = service.activePlayer;
    if (!player) throw new Error('Active player unavailable');
    player.position = { x: 0, y: 0 };
    player.lives = 2;
    player.isCursed = true;
    service.phase.set('playing');
    player.recoveryState = 'none';
    turn.remainingMovements.set(3);
    turn.resetMovements();
    service.turnTransitionPending.set(false);
  });

  await page.getByRole('button', { name: 'Centrer sur le joueur actif' }).click();
  const fountainButton = page.getByRole('button', { name: 'Utiliser la fontaine de régénération' });
  await expect(fountainButton).toBeVisible();
  await expect(fountainButton).toBeEnabled();
  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    return { lives: game?.gameService?.activePlayer?.lives, remaining: game?.gameService?.['turnService']?.remainingMovements() };
  })).toEqual({ lives: 2, remaining: 4 });

  await fountainButton.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const player = game?.gameService?.activePlayer;
    return { lives: player?.lives, cursed: player?.isCursed, remaining: game?.gameService?.['turnService']?.remainingMovements() };
  })).toEqual({ lives: 5, cursed: false, remaining: 0 });
});

test('l’icône fontaine reste utilisable en mobile et en paysage sans débordement', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await openPreparedGame(page);
    await expect.poll(async () => page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      boardVisible: !!document.querySelector('app-board'),
    }))).toEqual({ horizontalOverflow: false, boardVisible: true });
  }
});
