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

async function prepareXanrosCombat(page: import('@playwright/test').Page): Promise<void> {
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
    // Le changement de héros est propre à cette fixture ; notifier Angular
    // même lorsque le joueur humain était déjà actif.
    gameService.activePlayerIndex.set(null);
    gameService.activePlayerIndex.set(activeIndex);
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
  const card = page.locator('.hero-panel__card-stage--flipped app-hero-power-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.hero-power-card__choice')).toHaveCount(2);
  await card.locator('.hero-power-card__choice').first().click();

  await expect(page.locator('.board__power-announcement')).toHaveCount(0);
  await expect(page.locator('.hero-panel__card-stage--flipped')).toHaveCount(1);
  await expect(page.locator('.hero-panel__card-stage--flipped .hero-power-card--announcement'))
    .toHaveCount(1);

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

test('Substitution propose une liste défilante accessible au clavier sur un petit écran', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 360 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);

  await page.evaluate(() => {
    const root = document.querySelector('app-root')!;
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng!;
    const gameService = ng.getComponent(root.querySelector('app-game') ?? root).gameService;
    const players = gameService['playerService'].players;
    const dungeon = gameService['dungeonService'];
    const xanros = players.find((player: any) => player.controller === 'human');
    const other = players.find((player: any) => player !== xanros);
    if (!xanros || !other) throw new Error('Players unavailable');
    players.splice(0, players.length, xanros);
    xanros.heroId = 'xanros';
    xanros.isCursed = false;
    xanros.lives = 5;
    xanros.recoveryState = 'none';
    xanros.position = { x: 0, y: 0 };
    ['aderyn', 'horan', 'taia', 'victorius'].forEach((heroId, index) => {
      players.push({ ...other, heroId, position: { x: index + 1, y: 0 }, lives: 5, recoveryState: 'none' });
      if (!dungeon.getTileAt(index + 1, 0)) {
        dungeon.tiles.push({ definitionId: 'room-1', x: index + 1, y: 0, rotation: 0 });
      }
    });
    gameService['turnService'].resetMovements();
    gameService.activePlayerIndex.set(null);
    gameService.activePlayerIndex.set(0);
    if (!gameService.openXanrosSubstitution()) throw new Error('Substitution unavailable');
  });

  const card = page.locator('.hero-panel__card-stage--flipped app-hero-power-card');
  const choices = card.locator('.hero-power-card__choice');
  await expect(choices).toHaveCount(5);
  await expect(choices.first()).toBeFocused();
  const geometry = await card.locator('.hero-power-card__choices').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return {
      scrollable: element.scrollHeight > element.clientHeight,
      bottom: bounds.bottom,
      width: element.querySelector('button')!.getBoundingClientRect().width,
      height: element.querySelector('button')!.getBoundingClientRect().height,
    };
  });
  expect(geometry.scrollable).toBe(true);
  expect(geometry.bottom).toBeLessThanOrEqual(360);
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  await card.locator('button.hero-power-card__choice:not(.hero-power-card__choice--cancel)').last().focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => {
    const root = document.querySelector('app-root')!;
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng!;
    const game = ng.getComponent(root.querySelector('app-game') ?? root).gameService;
    return { position: game.activePlayer.position, moves: game['turnService'].movementsMadeThisTurn() };
  })).toEqual({ position: { x: 4, y: 0 }, moves: 4 });
});

test('Xanros active Substitution depuis le verso de sa carte d’inventaire', async ({ page }) => {
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
    const xanros = playerService.players[activeIndex];
    const target = playerService.players[targetIndex];
    gameService.activePlayerIndex.set(activeIndex);
    xanros.heroId = 'xanros';
    xanros.isCursed = false;
    xanros.lives = 5;
    xanros.recoveryState = 'none';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    turnService.resetMovements();
    if (!dungeonService.getTileAt(1, 0)) {
      dungeonService.tiles.push({ definitionId: 'room-1', x: 1, y: 0, rotation: 0 });
    }
    gameService.activePlayerIndex.set(null);
    gameService.activePlayerIndex.set(activeIndex);
  });

  const badge = page.locator('button.player-sidebar__power-badge--usable[aria-label="Consulter pouvoir 2 : Substitution"]');
  await expect(badge).toHaveClass(/player-sidebar__power-badge--usable/);
  await badge.click();

  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  const card = page.locator('.hero-panel__card-stage--flipped app-hero-power-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.hero-power-card__choice')).toHaveCount(2);
  await card.locator('.hero-power-card__choice').first().click();
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  await expect(page.locator('.hero-panel__card-stage--flipped')).toHaveCount(0);
});

test('Xanros poursuit la résolution après un lancer à égalité contre une force 8', async ({ page }) => {
  await openBoard(page);
  await prepareXanrosCombat(page);

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

const COMBAT_DECISION_VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 375, height: 844 },
  { width: 768, height: 900 },
  { width: 949, height: 900 },
  { width: 1253, height: 900 },
  { width: 1440, height: 900 },
] as const;

for (const viewport of COMBAT_DECISION_VIEWPORTS) {
  test(`la carte de décision combat reste contenue à ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openBoard(page);
    await prepareXanrosCombat(page);
    await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });

    const combat = page.locator('.combat-overlay');
    const card = combat.locator('.hero-power-card');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(combat.locator('.combat-overlay__hero-card--flipped')).toHaveCount(1);
    await page.waitForTimeout(500);

    const layout = await card.evaluate(element => {
      const host = element.closest<HTMLElement>('.combat-overlay__hero-card');
      const front = host?.querySelector<HTMLElement>('.combat-overlay__hero-card-face--front');
      const back = host?.querySelector<HTMLElement>('.combat-overlay__hero-card-face--back');
      const content = element.querySelector<HTMLElement>('.hero-power-card__content');
      const actions = element.querySelector<HTMLElement>('.hero-power-card__actions');
      const cardBox = element.getBoundingClientRect();
      const actionButtons = Array.from(element.querySelectorAll<HTMLButtonElement>('.hero-power-card__actions button'));
      const buttonBoxes = actionButtons.map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      });
      const equipment = Array.from(host?.querySelectorAll<HTMLElement>('.combat-overlay__weapon-entry span') ?? []);

      return {
        card: { left: cardBox.left, right: cardBox.right, top: cardBox.top, bottom: cardBox.bottom, width: cardBox.width, height: cardBox.height },
        front: front ? { width: getComputedStyle(front).width, height: getComputedStyle(front).height, radius: getComputedStyle(front).borderRadius } : null,
        back: back ? { width: getComputedStyle(back).width, height: getComputedStyle(back).height, radius: getComputedStyle(back).borderRadius } : null,
        contentOverflow: content ? content.scrollWidth > content.clientWidth + 1 : true,
        contentMetrics: content ? { scrollWidth: content.scrollWidth, clientWidth: content.clientWidth, scrollHeight: content.scrollHeight, clientHeight: content.clientHeight } : null,
        actionOverflow: actions ? actions.scrollWidth > actions.clientWidth + 1 : true,
        actionBoxes: buttonBoxes,
        actionCentered: actions ? Math.abs((actions.getBoundingClientRect().left + actions.getBoundingClientRect().right) / 2 - (cardBox.left + cardBox.right) / 2) < 2 : false,
        equipmentText: equipment.map(entry => entry.textContent?.trim() ?? ''),
        equipmentTextOverflow: equipment.map(entry => getComputedStyle(entry).textOverflow),
        equipmentWhiteSpace: equipment.map(entry => getComputedStyle(entry).whiteSpace),
      };
    });

    expect(layout.front).not.toBeNull();
    expect(layout.back).toEqual(layout.front);
    expect(layout.card.width).toBeGreaterThan(0);
    expect(layout.card.height).toBeGreaterThan(0);
    expect(layout.card.left).toBeGreaterThanOrEqual(-1);
    expect(layout.card.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(layout.card.top).toBeGreaterThanOrEqual(-1);
    expect(layout.card.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(layout.contentOverflow, JSON.stringify(layout)).toBe(false);
    expect(layout.actionOverflow).toBe(false);
    expect(layout.actionCentered, JSON.stringify(layout)).toBe(true);
    expect(layout.equipmentText).toContain('Poignards +1');
    expect(layout.equipmentTextOverflow).not.toContain('ellipsis');
    expect(layout.equipmentWhiteSpace).toEqual(['normal', 'normal']);
    await page.screenshot({ path: `playwright-report/combat-decision-after-${viewport.width}.png`, fullPage: true });

    for (const button of layout.actionBoxes) {
      expect(button.width, JSON.stringify(layout)).toBeGreaterThanOrEqual(40);
      expect(button.height, JSON.stringify(layout)).toBeGreaterThanOrEqual(40);
      expect(button.left).toBeGreaterThanOrEqual(layout.card.left - 1);
      expect(button.right).toBeLessThanOrEqual(layout.card.right + 1);
      expect(button.top).toBeGreaterThanOrEqual(layout.card.top - 1);
      expect(button.bottom).toBeLessThanOrEqual(layout.card.bottom + 1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await combat.locator('.hero-power-card__decline').click();
    await expect(combat.locator('.combat-overlay__verdict-title')).toBeVisible({ timeout: 5_000 });
  });
}
