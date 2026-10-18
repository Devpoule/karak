import { expect, test } from '@playwright/test';

test('V2.1-05 : reprend une partie sauvegardée après rechargement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/play');

  await page.evaluate(() => {
    const envelope = {
      schema: 'karak-save',
      version: 2,
      savedAt: new Date().toISOString(),
      payload: {
        phase: 'playing',
        setupStep: 'first-player-roll',
        players: [{
          controller: 'human',
          lives: 3,
          recoveryState: 'none',
          isCursed: false,
          heroId: 'argentus',
          position: { x: 0, y: 0 },
          facing: 'south',
          inventory: { weapons: [null, null], spells: [null, null, null], key: null },
          treasures: [],
        }, {
          controller: 'ai',
          lives: 5,
          recoveryState: 'none',
          isCursed: false,
          heroId: 'horan',
          position: { x: 0, y: 0 },
          facing: 'south',
          inventory: { weapons: [null, null], spells: [null, null, null], key: null },
          treasures: [],
        }],
        firstPlayerIndex: 0,
        activePlayerIndex: 0,
        firstPlayerRolls: [],
        firstPlayerContenders: [0, 1],
        dungeon: {
          tiles: [{ definitionId: 'start', x: 0, y: 0, rotation: 0 }],
          remainingTileIds: [],
          remainingTokenIds: [],
        },
        turn: { remainingMovements: 2, movementsMadeThisTurn: 2, suspendedMovements: null },
        pending: {},
        finalRanking: [],
      },
    };
    localStorage.setItem('karak.save.v2', JSON.stringify(envelope));
  });

  await page.reload();

  await expect(page.locator('app-board')).toBeVisible();
  await expect(page.locator('.movement-counter')).toHaveAttribute('aria-label', '2 mouvements disponibles');
  await expect(page.locator('.game__turn-announcement')).toContainText('Argentus');
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toHaveCount(0);
  const cameraTransition = await page.locator('.board__world').evaluate((element) => {
    element.classList.add('board__world--camera-transition');
    return getComputedStyle(element).transitionDuration;
  });
  expect(cameraTransition).toBe('0s');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('karak.save.v2')))
    .toContain('karak-save');
});
