import { expect, test } from '@playwright/test';

// La présentation finale dure désormais quatre secondes ; le setup du jeu
// reste inclus dans le délai global du scénario de fixture.
test.setTimeout(60_000);

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

async function assertCombatLayoutInsideViewport(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.viewportSize()!;
  const selectors = [
    '.combat-overlay__arena',
    '.combat-overlay__fighter-image',
    '.combat-overlay__fighter-name',
    '.combat-overlay__dice',
    '.combat-overlay__score',
    '.combat-overlay__verdict',
    '.combat-overlay__decision',
    '.combat-overlay__power-card',
    '.combat-overlay__power-announcement',
  ];
  const geometry = await page.locator(selectors.join(', ')).evaluateAll(elements => elements
    .filter(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
    })
    .map(element => {
      const box = element.getBoundingClientRect();
      return {
        selector: element.className,
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      };
    }));

  expect(geometry.filter(box =>
    box.left < -1
    || box.top < -1
    || box.right > viewport.width + 1
    || box.bottom > viewport.height + 1,
  ), 'Les éléments de combat doivent rester dans le viewport').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}

async function assertCombatPortraitLayout(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.viewportSize()!;
  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    return {
      arena: rect('.combat-overlay__arena'),
      center: rect('.combat-overlay__center'),
      heroImage: rect('.combat-overlay__fighter-image--hero'),
      monsterImage: rect('.combat-overlay__fighter-image--monster'),
      heroName: rect('.combat-overlay__fighter--hero .combat-overlay__fighter-name'),
      monsterName: rect('.combat-overlay__fighter--monster .combat-overlay__fighter-name'),
      roll: rect('.combat-overlay__roll-trigger'),
    };
  });

  expect(layout.arena).not.toBeNull();
  expect(layout.center).not.toBeNull();
  expect(layout.heroImage).not.toBeNull();
  expect(layout.monsterImage).not.toBeNull();
  expect(layout.heroName).not.toBeNull();
  expect(layout.monsterName).not.toBeNull();
  expect(layout.roll).not.toBeNull();

  const heroImage = layout.heroImage!;
  const monsterImage = layout.monsterImage!;
  const heroName = layout.heroName!;
  const monsterName = layout.monsterName!;
  const center = layout.center!;
  expect(heroImage.width).toBeGreaterThan(0);
  expect(monsterImage.width).toBeGreaterThan(0);
  expect(heroImage.width).toBeGreaterThan(layout.arena!.width * 0.16);
  expect(monsterImage.width).toBeGreaterThan(layout.arena!.width * 0.16);
  expect(heroName.top - heroImage.bottom).toBeGreaterThanOrEqual(-2);
  expect(monsterName.top - monsterImage.bottom).toBeGreaterThanOrEqual(-2);
  expect(heroName.top - heroImage.bottom).toBeLessThan(28);
  expect(monsterName.top - monsterImage.bottom).toBeLessThan(28);
  expect(Math.abs(heroImage.height / heroImage.width - monsterImage.height / monsterImage.width)).toBeLessThan(1.2);

  const heroCenter = (heroImage.left + heroImage.right) / 2;
  const monsterCenter = (monsterImage.left + monsterImage.right) / 2;
  const centerPoint = (center.left + center.right) / 2;
  expect(Math.abs((heroCenter + monsterCenter) / 2 - centerPoint)).toBeLessThan(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}

async function assertCombatEquipmentLayout(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.viewportSize()!;
  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.combat-overlay__fighter-image--hero')?.getBoundingClientRect();
    const entries = [...document.querySelectorAll<HTMLElement>('.combat-overlay__weapon-entry')].map(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });
    return {
      hero: hero ? { left: hero.left, top: hero.top, right: hero.right, bottom: hero.bottom } : null,
      entries,
    };
  });

  expect(layout.hero).not.toBeNull();
  expect(layout.entries.length).toBeGreaterThan(0);
  expect(layout.entries.every(entry => entry.left >= -1 && entry.right <= viewport.width + 1)).toBeTruthy();
  expect(layout.entries.every(entry => !(
    entry.left < layout.hero!.right
    && entry.right > layout.hero!.left
    && entry.top < layout.hero!.bottom
    && entry.bottom > layout.hero!.top
  ))).toBeTruthy();
}

async function runCombatScenario(
  page: import('@playwright/test').Page,
  strength: number,
  verdict: string,
  rollFile: string,
  verdictFile: string,
  withMagic = false,
  reducedMotion = false,
): Promise<void> {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);
  await prepareCombat(page, strength, withMagic);
  const overlay = page.locator('.combat-overlay');
  await expect(overlay).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lancer les dés' })).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
  await expect(page.locator('.combat-overlay__dice')).toBeVisible({ timeout: 10_000 });
  if (page.viewportSize()!.width <= 900 || page.viewportSize()!.height <= 560) {
    await assertCombatLayoutInsideViewport(page);
  }
  await expect(page.locator('.combat-overlay__bonus')).toHaveText('+2 pts');
  if (withMagic) {
    await page.getByRole('button', { name: /Utiliser Tir magique/ }).click({ force: true });
    await expect(page.locator('.combat-overlay__bonus--magic')).toHaveText('+1pt');
  }
  await page.screenshot({ path: `playwright-report/${rollFile}`, fullPage: true });

  await expect(page.locator('.combat-overlay__verdict-title')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.combat-overlay__verdict-title')).toContainText(verdict);
  if (reducedMotion) {
    await expect.poll(() => page.locator('.combat-overlay__verdict-energy').evaluate(element =>
      getComputedStyle(element).animationDuration,
    )).toBe('0.001s');
  }
  const heroScore = page.locator('.combat-overlay__score--hero');
  const monsterScore = page.locator('.combat-overlay__score--monster');
  await expect(heroScore).toBeVisible();
  await expect(monsterScore).toBeVisible();
  const combatColors = await overlay.evaluate(element => {
    const style = getComputedStyle(element);
    const heroScore = element.querySelector('.combat-overlay__score--hero')!;
    const monsterScore = element.querySelector('.combat-overlay__score--monster')!;
    return {
      hero: style.getPropertyValue('--hero-color').trim(),
      monster: style.getPropertyValue('--monster-color').trim(),
      wave: style.getPropertyValue('--combat-wave-color').trim(),
      heroScore: getComputedStyle(heroScore).getPropertyValue('--hero-color').trim(),
      monsterScore: getComputedStyle(monsterScore).getPropertyValue('--monster-color').trim(),
      heroScoreText: getComputedStyle(heroScore.querySelector('.combat-overlay__score-value')!).color,
      monsterScoreText: getComputedStyle(monsterScore.querySelector('.combat-overlay__score-value')!).color,
      verdictText: getComputedStyle(element.querySelector('.combat-overlay__verdict-title')!).color,
      heroScoreBackground: getComputedStyle(heroScore).backgroundImage,
      monsterScoreBackground: getComputedStyle(monsterScore).backgroundImage,
    };
  });
  expect(combatColors.hero).toBe('#F0F0E8');
  expect(combatColors.monster).toBe('#ff5646');
  expect(combatColors.heroScore).toBe('#F0F0E8');
  expect(combatColors.monsterScore).toBe('#ff5646');
  expect(combatColors.heroScoreText).toBe('rgb(255, 255, 255)');
  expect(combatColors.monsterScoreText).toBe('rgb(255, 255, 255)');
  expect(combatColors.verdictText).toBe('rgb(255, 255, 255)');
  expect(combatColors.heroScoreBackground).not.toBe('none');
  expect(combatColors.monsterScoreBackground).not.toBe('none');
  if (strength !== 6) {
    expect(combatColors.wave).toBe(strength > 6 ? '#ff5646' : '#F0F0E8');
  }
  if (page.viewportSize()!.width <= 900 || page.viewportSize()!.height <= 560) {
    await assertCombatLayoutInsideViewport(page);
  }
  await expect(heroScore).not.toContainText('Score de combat');
  await expect(monsterScore).not.toContainText('Force');
  const [heroBox, monsterBox] = await Promise.all([
    heroScore.boundingBox(),
    monsterScore.boundingBox(),
  ]);
  if (!heroBox || !monsterBox) throw new Error('Scores de combat non mesurables');
  expect(Math.abs(heroBox.y - monsterBox.y)).toBeLessThan(2);
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

for (const viewport of [
  { width: 375, height: 844 },
  { width: 768, height: 900 },
  { width: 985, height: 870 },
  { width: 1253, height: 870 },
  { width: 1440, height: 870 },
]) {
  test(`combat conserve les proportions des portraits à ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openBoard(page);
    await prepareCombat(page, 5);
    await expect(page.locator('.combat-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lancer les dés' })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1_100);

    await assertCombatPortraitLayout(page);
    await page.screenshot({ path: `playwright-report/combat-portrait-after-${viewport.width}.png`, fullPage: true });

    await page.getByRole('button', { name: 'Lancer les dés' }).click({ force: true });
    await expect(page.locator('.combat-overlay__dice')).toBeVisible({ timeout: 10_000 });
    await assertCombatEquipmentLayout(page);
    await expect(page.locator('.combat-overlay__score--hero')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.combat-overlay__score--monster')).toBeVisible({ timeout: 10_000 });
    await assertCombatLayoutInsideViewport(page);
  });
}

test('combat fixture reste lisible en paysage court', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-landscape.png', 'combat-victory-landscape.png');
});

test('combat fixture reste lisible sur un écran bas en portrait', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 360 });
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-short.png', 'combat-victory-short.png');
});

test('combat fixture affiche le bonus vert d’un Tir magique', async ({ page }) => {
  await runCombatScenario(page, 6, 'gagne', 'combat-roll-magic.png', 'combat-magic.png', true);
});

test('combat fixture respecte prefers-reduced-motion', async ({ page }) => {
  await runCombatScenario(page, 5, 'gagne', 'combat-roll-reduced-motion.png', 'combat-reduced-motion.png', false, true);
});
