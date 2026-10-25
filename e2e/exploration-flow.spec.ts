import { expect, test } from '@playwright/test';

test('révèle une tuile avant la direction et conserve le coût d’un mouvement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/play');

  await page.evaluate(() => {
    localStorage.setItem('karak.save.v2', JSON.stringify({
      schema: 'karak-save',
      version: 2,
      savedAt: new Date().toISOString(),
      payload: {
        phase: 'playing',
        setupStep: 'first-player-roll',
        players: [
          {
            controller: 'human',
            lives: 5,
            recoveryState: 'none',
            isCursed: false,
            heroId: 'argentus',
            position: { x: 0, y: 0 },
            facing: 'south',
            inventory: { weapons: [null, null], spells: [null, null, null], key: null },
            treasures: [],
          },
          {
            controller: 'ai',
            lives: 5,
            recoveryState: 'none',
            isCursed: false,
            heroId: 'horan',
            position: { x: 0, y: 0 },
            facing: 'south',
            inventory: { weapons: [null, null], spells: [null, null, null], key: null },
            treasures: [],
          },
        ],
        firstPlayerIndex: 0,
        activePlayerIndex: 0,
        firstPlayerRolls: [],
        firstPlayerContenders: [0, 1],
        dungeon: {
          tiles: [{ definitionId: 'start', x: 0, y: 0, rotation: 0 }],
          remainingTileIds: ['straight-01'],
          remainingTokenIds: [],
        },
        turn: { remainingMovements: 4, movementsMadeThisTurn: 0, suspendedMovements: null },
        pending: {},
        finalRanking: [],
      },
    }));
  });

  await page.reload();
  await expect(page.locator('app-board')).toBeVisible();
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '4 points disponibles');
  await expect.poll(() => page.locator('.board__tile--active-player').count()).toBe(1);
  await expect.poll(() => page.locator('.board__tile--active-player').evaluate((element) =>
    getComputedStyle(element, '::before').borderTopColor,
  )).toBe('rgb(245, 213, 138)');

  const explorationTarget = page.locator('.board__exploration-target').first();
  await expect(explorationTarget).toBeVisible();
  await expect(explorationTarget).toHaveAttribute('title', 'Explorer — tirer une tuile');
  await expect(explorationTarget).toHaveAttribute('data-tooltip', 'Explorer — tirer une tuile');
  await explorationTarget.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.board__tile--pending')).toBeVisible();
  await expect(page.locator('.board__exploration-reveal')).toHaveCount(0);
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '4 points disponibles');
  await expect(page.locator('.board__movement-controls')).toHaveCount(0);
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '4 points disponibles');

  const target = page.locator('.board__exploration-target').nth(1);
  await expect(target).toBeVisible();
  await expect.poll(() => target.evaluate((element) =>
    getComputedStyle(element).borderTopColor,
  )).toBe('rgb(230, 183, 90)');
  await expect(target).toHaveAttribute('title', 'Déplacer la tuile ici');
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.board__exploration-reveal')).toHaveCount(0);
  await expect(page.locator('.board__tile--pending')).toBeVisible();
  await expect(page.locator('.board__rotate')).toBeEnabled();

  for (let attempt = 0; attempt < 4; attempt++) {
    if (await page.locator('.board__confirm').isEnabled()) break;
    const previousRotation = await page.locator('.board__tile--pending img').getAttribute('style');
    await page.locator('.board__rotate').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.locator('.board__tile--pending img').getAttribute('style'))
      .not.toBe(previousRotation);
  }
  await expect(page.locator('.board__confirm')).toBeEnabled();
  await page.locator('.board__confirm').focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('.board__tile--pending')).toHaveCount(0);
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '3 points disponibles');
  await expect.poll(() => page.locator('.board__tile').count()).toBe(2);
  await expect(page.locator('.board__tile--reachable')).toHaveCount(1);
  await expect.poll(() => page.locator('.board__tile--reachable').evaluate((element) =>
    getComputedStyle(element, '::after').borderTopColor,
  )).toBe('rgb(192, 200, 208)');
  await expect(page.locator('.board__tile--reachable')).toHaveAttribute('title', 'Se déplacer');
  await page.locator('.board__tile--reachable').click();
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '2 points disponibles');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
