import { expect, test } from '@playwright/test';

test.setTimeout(180_000);

type Viewport = { width: number; height: number };
type HudSide = 'human' | 'ai';

async function enterDungeon(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    let state = 0x5eed;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  await page.goto('/play');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('button[title="Tirer les héros"]').click({ force: true });
  await expect(page.getByRole('heading', { name: /Qui commence/ })).toBeVisible({ timeout: 10_000 });

  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator(
      'button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]',
    ).first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }

  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click({ force: true, noWaitAfter: true });
  await expect(page.locator('app-board')).toBeVisible({ timeout: 10_000 });
}

/** Prépare un combat nul réel afin que CombatOverlay publie son toast métier. */
async function triggerCombatNotification(
  page: import('@playwright/test').Page,
  side: HudSide,
): Promise<void> {
  await page.evaluate(({ side: requestedSide }) => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    if (!root || !ng) throw new Error('Angular dev injector unavailable');

    const game = ng.getComponent(root.querySelector('app-game') ?? root);
    const gameService = game?.gameService;
    const combatService = gameService?.['combatService'];
    const playerService = gameService?.['playerService'];
    if (!gameService || !combatService || !playerService) throw new Error('Game services unavailable');

    const playerIndex = playerService.players.findIndex((player: any) =>
      player.controller === (requestedSide === 'human' ? 'human' : 'ai'));
    const player = playerService.players[playerIndex];
    if (playerIndex < 0 || !player) throw new Error(`No ${requestedSide} player available`);

    gameService.activePlayerIndex.set(playerIndex);
    player.heroId = requestedSide === 'human' ? 'argentus' : 'taia';
    player.inventory.weapons.fill(null);

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
      throw new Error('Could not start notification fixture combat');
    }

    const originalRoll = combatService.rollPendingCombat.bind(combatService);
    combatService.rollPendingCombat = () => {
      const roll = originalRoll();
      if (!roll) return null;
      const fixed = {
        ...roll,
        die1: 2,
        die2: 3,
        diceTotal: 5,
        attackPower: 5,
        monsterStrength: 5,
      };
      combatService.pendingCombatRoll.set(fixed);
      return fixed;
    };
  }, { side });

  if (side === 'human') {
    await expect(page.getByRole('button', { name: 'Lancer les dés' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  }

  await expect(page.locator('.combat-overlay__verdict-title')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => {
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const overlay = document.querySelector('app-combat-overlay');
    ng?.getComponent(overlay ?? document.body)?.dismissResult();
  });
  await expect(page.locator('.toast-container')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.toast-container p')).toHaveText('Égalité');
}

async function readGeometry(page: import('@playwright/test').Page, side: HudSide) {
  return page.evaluate((requestedSide) => {
    const group = document.querySelector<HTMLElement>(`.player-hud__players--${requestedSide}`);
    const toast = group?.querySelector<HTMLElement>('.toast-container');
    const controls = Array.from(group?.querySelectorAll<HTMLElement>('.player-hud__player-control') ?? []);
    const hud = document.querySelector<HTMLElement>('.player-hud');
    const side = document.querySelector<HTMLElement>(
      `.player-hud__side--${requestedSide === 'human' ? 'left' : 'right'}`,
    );
    const inventories = Array.from(side?.querySelectorAll<HTMLElement>('.player-sidebar, .player-sidebar__frame') ?? []);
    if (!group || !hud || !side || !toast || controls.length === 0 || inventories.length === 0) {
      throw new Error(`HUD geometry unavailable for ${requestedSide}`);
    }

    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const intersects = (first: ReturnType<typeof box>, second: ReturnType<typeof box>): boolean =>
      first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top;
    const toastBox = box(toast);
    const controlBoxes = controls.map(box);
    const inventoryBoxes = inventories.map(box);
    const hudBox = box(hud);
    const inventoryTop = Math.min(...inventoryBoxes.map(inventory => inventory.top));
    const inventoryBottom = Math.max(...inventoryBoxes.map(inventory => inventory.bottom));
    const controlTop = Math.min(...controlBoxes.map(control => control.top));
    const controlBottom = Math.max(...controlBoxes.map(control => control.bottom));
    const text = toast.querySelector('p');

    return {
      side: requestedSide,
      toast: toastBox,
      controls: controlBoxes,
      inventories: inventoryBoxes,
      inventoryOverlap: inventoryBoxes.some(inventory => intersects(toastBox, inventory)),
      toastText: text?.textContent?.trim() ?? '',
      textFits: text ? text.scrollWidth <= text.clientWidth + 1 : false,
      textOverflow: text ? getComputedStyle(text).textOverflow : '',
      toastHeroColor: toast.style.getPropertyValue('--toast-hero-color').trim().toUpperCase(),
      controlHeroColors: controls.map(control => control.style.getPropertyValue('--hero-color').trim().toUpperCase()),
      group: box(group),
      margins: {
        headerToControl: controlTop - hudBox.top,
        controlToInventory: inventoryTop - controlBottom,
        inventoryToBottom: hudBox.bottom - inventoryBottom,
      },
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  }, side);
}

function assertAligned(geometry: Awaited<ReturnType<typeof readGeometry>>): void {
  expect(geometry.controls.length, JSON.stringify(geometry)).toBeGreaterThan(0);
  expect(geometry.inventoryOverlap, JSON.stringify(geometry)).toBe(false);
  expect(geometry.toastText).toBe('Égalité');
  expect(geometry.textFits, JSON.stringify(geometry)).toBe(true);
  expect(geometry.textOverflow, JSON.stringify(geometry)).not.toBe('ellipsis');
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.toastHeroColor).toBeTruthy();

  for (const control of geometry.controls) {
    expect(Math.abs(geometry.toast.top - control.top), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.toast.bottom - control.bottom), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.toast.height - control.height), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  }

  expect(geometry.controlHeroColors).toContain(geometry.toastHeroColor);

  const { headerToControl, controlToInventory, inventoryToBottom } = geometry.margins;
  expect(Math.abs(headerToControl - controlToInventory), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(Math.abs(controlToInventory - inventoryToBottom), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
}

test('les notifications sont alignees sur les deux cotes du HUD sans debordement responsive', async ({ page }) => {
  const viewports: Viewport[] = [
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 709, height: 926 },
    { width: 390, height: 844 },
  ];
  const measurements: Array<Record<string, unknown>> = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await enterDungeon(page);

    for (const side of ['human', 'ai'] as const) {
      await triggerCombatNotification(page, side);
      const geometry = await readGeometry(page, side);
      assertAligned(geometry);
      measurements.push({ viewport, ...geometry });

      if (side === 'human' && viewport.width !== 709) {
        await page.waitForTimeout(1_000);
        await page.screenshot({
          path: `playwright-report/notification-layout-${viewport.width <= 640 ? 'mobile' : viewport.width === 768 ? 'tablet' : 'desktop'}.png`,
          fullPage: true,
        });
      }

      await page.evaluate(() => {
        const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
        const root = document.querySelector('app-root');
        const game = root && ng?.getComponent(root.querySelector('app-game') ?? root);
        game?.['toastService']?.dismiss();
      });
      await expect(page.locator('.toast-container')).toHaveCount(0, { timeout: 2_000 });
    }
  }

  console.log(`Notification DOM measurements: ${JSON.stringify(measurements)}`);
});

test('sous 900 px, seul l inventaire du joueur actif est visible', async ({ page }) => {
  const viewports: Viewport[] = [
    { width: 548, height: 1161 },
    { width: 844, height: 1161 },
    { width: 899, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await enterDungeon(page);
    await expect(page.locator('.player-hud__side')).toHaveCount(2);
    await expect.poll(() => page.locator('.player-hud__side--open').count()).toBe(1);
    await expect.poll(async () => Number(await page.locator('.player-hud__side--active').evaluate(
      element => getComputedStyle(element).opacity,
    ))).toBeGreaterThan(0);

    const state = await page.locator('.player-hud__side').evaluateAll((sides) => sides.map((side) => {
      const element = side as HTMLElement;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        active: element.classList.contains('player-hud__side--active'),
        open: element.classList.contains('player-hud__side--open'),
        ariaHidden: element.getAttribute('aria-hidden'),
        visibility: style.visibility,
        opacity: style.opacity,
        width: rect.width,
        height: rect.height,
      };
    }));

    const active = state.filter(side => side.active);
    const inactive = state.filter(side => !side.active);
    expect(active, JSON.stringify({ viewport, state })).toHaveLength(1);
    expect(inactive, JSON.stringify({ viewport, state })).toHaveLength(1);
    expect(active[0], JSON.stringify({ viewport, state })).toMatchObject({
      open: true,
      ariaHidden: 'false',
      visibility: 'visible',
    });
    expect(Number(active[0].opacity), JSON.stringify({ viewport, state })).toBeGreaterThan(0);
    expect(active[0].width, JSON.stringify({ viewport, state })).toBeGreaterThan(0);
    expect(active[0].height, JSON.stringify({ viewport, state })).toBeGreaterThan(0);
    expect(inactive[0], JSON.stringify({ viewport, state })).toMatchObject({
      open: false,
      ariaHidden: 'true',
      visibility: 'hidden',
    });
  }
});
