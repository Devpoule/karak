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

async function assertCardInsideViewport(page: import('@playwright/test').Page): Promise<void> {
  const geometry = await page.locator('.player-hud__power-card-host .hero-power-card').evaluate(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  });
  const viewport = page.viewportSize()!;
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(viewport.width);
  expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.height).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}

async function openFirstPowerConsultation(page: import('@playwright/test').Page): Promise<void> {
  const closedPlayerTab = page.getByRole('button', { name: /Afficher la fiche du joueur/ }).first();
  if (await closedPlayerTab.isVisible().catch(() => false)) {
    await closedPlayerTab.click();
  }
  const power = page.locator('.player-sidebar__power-badge:visible').first();
  await expect(power).toBeVisible();
  await power.click();
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
}

test('la consultation du pouvoir reste centrée et refermable au clavier', async ({ page }) => {
  await openBoard(page);
  const trigger = page.locator('.player-sidebar__power-badge').first();
  await openFirstPowerConsultation(page);
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
  await assertCardInsideViewport(page);
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('le bouton du pouvoir retrouve son apparence normale après fermeture', async ({ page }) => {
  await openBoard(page);
  const power = page.locator('.player-sidebar:visible').first().locator('.player-sidebar__power-badge:visible').nth(1);
  await expect(power).toBeVisible();

  await power.click();
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  await page.mouse.move(0, 0);

  const afterEscape = await power.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      className: element.className,
      ariaPressed: element.getAttribute('aria-pressed'),
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      transform: style.transform,
      filter: style.filter,
      active: element.matches(':active'),
    };
  });
  expect(afterEscape.className).not.toContain('player-sidebar__power-badge--selected');
  expect(afterEscape.ariaPressed).toBe('false');
  expect(afterEscape.backgroundImage).toContain('linear-gradient');
  expect(afterEscape.boxShadow).toBe('none');
  expect(afterEscape.transform).toBe('none');
  expect(afterEscape.active).toBe(false);

});

test('le bouton retrouve son apparence normale après fermeture par clic extérieur', async ({ page }) => {
  await openBoard(page);
  const power = page.locator('.player-sidebar:visible').first().locator('.player-sidebar__power-badge:visible').nth(1);
  await power.click();
  const powerLabel = await power.getAttribute('aria-label');
  await expect(page.locator('.player-hud__power-card-host .hero-power-card')).toBeVisible();
  await page.locator('.player-hud__power-card-host').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  await page.mouse.move(0, 0);
  const closedPower = page.locator(`button[aria-label="${powerLabel}"]`);
  await expect(closedPower).toHaveAttribute('aria-pressed', 'false');
  await expect(closedPower).not.toHaveClass(/player-sidebar__power-badge--selected/);
});

test('la consultation ignore le clic intérieur et se ferme par le fond extérieur', async ({ page }) => {
  await openBoard(page);
  await openFirstPowerConsultation(page);

  const host = page.locator('.player-hud__power-card-host');
  const card = host.locator('.hero-power-card');
  await card.click({ position: { x: 20, y: 20 } });
  await expect(host).toBeVisible();

  const geometry = await card.evaluate(element => {
    const box = element.getBoundingClientRect();
    const description = element.querySelector<HTMLElement>('.hero-power-card__content > p:not(.hero-power-card__power)');
    const close = element.querySelector<HTMLElement>('.hero-power-card__close');
    return {
      overflowY: getComputedStyle(element).overflowY,
      descriptionVisible: Boolean(description && description.getBoundingClientRect().bottom <= box.bottom),
    closeVisible: Boolean(close && close.getBoundingClientRect().bottom <= box.bottom),
    };
  });
  expect(geometry.overflowY).toBe('hidden');
  expect(geometry.descriptionVisible).toBe(true);
  expect(geometry.closeVisible).toBe(false);

  await host.click({ position: { x: 5, y: 5 } });
  await expect(host).toHaveCount(0);
});

test('un pouvoir maudit reste consultable sans devenir activable', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const player = game?.gameService?.activePlayer;
    const playerService = game?.gameService?.['playerService'];
    if (!player || !playerService) throw new Error('Services de jeu indisponibles');
    player.isCursed = true;
    playerService.curseRevision.update((revision: number) => revision + 1);
  });

  const power = page.locator('.player-sidebar__power-badge:visible').first();
  await expect(power).toBeVisible();
  await power.click();
  const card = page.locator('.player-hud__power-card-host .hero-power-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Pouvoir spécial');
  await expect(card.locator('.hero-power-card__activate')).toHaveCount(0);
  await expect(card.locator('.hero-power-card__decline')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
});

test('les deux pouvoirs du joueur maudit restent consultables', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const game = ng?.getComponent(root?.querySelector('app-game') ?? root!);
    const player = game?.gameService?.activePlayer;
    const playerService = game?.gameService?.['playerService'];
    if (!player || !playerService) throw new Error('Services de jeu indisponibles');
    player.isCursed = true;
    playerService.curseRevision.update((revision: number) => revision + 1);
  });

  const powers = page.locator('.player-sidebar:visible').first().locator('.player-sidebar__power-badge:visible');
  await expect(powers).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    await powers.nth(index).click();
    const card = page.locator('.player-hud__power-card-host .hero-power-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.hero-power-card__activate')).toHaveCount(0);
    await expect(card.locator('.hero-power-card__decline')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.player-hud__power-card-host')).toHaveCount(0);
  }
});

test('la fiche reste entièrement accessible sur les viewports ciblés', async ({ page }) => {
  await openBoard(page);
  const viewports = [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 390, height: 360 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const portrait = page.getByRole('button', { name: /Afficher les informations de/ }).first();
    await expect(portrait).toBeVisible();
    await portrait.click();
    const dialog = page.locator('.codex-dialog');
    const body = dialog.locator('.codex-dialog__body');
    await expect(dialog).toBeVisible();
    const metrics = await body.evaluate(element => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      lastLine: element.getBoundingClientRect().bottom,
      dialogBottom: element.closest('.codex-dialog')!.getBoundingClientRect().bottom,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(0);
    expect(metrics.lastLine).toBeLessThanOrEqual(metrics.dialogBottom);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('la consultation reste contenue en portrait, paysage et faible hauteur', async ({ page }) => {
  await openBoard(page);
  await openFirstPowerConsultation(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 360 }]) {
    await page.setViewportSize(viewport);
    const card = page.locator('.player-hud__power-card-host .hero-power-card');
    await expect(card).toBeVisible();
    await assertCardInsideViewport(page);
  }
});
