import { expect, test } from '@playwright/test';

async function openHeaderMenu(page: import('@playwright/test').Page): Promise<void> {
  const trigger = page.getByRole('button', { name: 'Ouvrir le menu de partie' });
  await trigger.click();
  await expect(page.getByRole('menu', { name: 'Commandes de partie' })).toBeVisible();
}

test('Karak se charge et affiche l’entrée de partie', async ({ page }) => {
  await page.goto('/game');

  await expect(page).toHaveTitle(/Karak/i);
  await expect(page.getByRole('link', { name: 'Entrer' })).toBeVisible();

  await page.screenshot({
    path: 'playwright-report/karak-home.png',
    fullPage: true,
  });
});

test('la page de jeu affiche la préparation de partie', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Jouer' })).toBeVisible();
  await page.getByRole('link', { name: 'Jouer' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect(page.getByText("Combien d'aventuriers entrent dans le donjon ?")).toBeVisible();
});

test('l’accueil met en avant le logo et conserve une hiérarchie typographique cohérente', async ({ page }) => {
  await page.goto('/');

  const logo = page.locator('.home__logo');
  await expect(logo).toBeVisible();
  await expect(page.getByRole('link', { name: "Découvrir l'univers du jeu" })).toBeVisible();
  await expect(page.locator('.home__background')).toHaveAttribute('src', '/assets/board/karak-cover.png');
  await expect(page.getByText("Six héros. Un donjon. D'innombrables trésors.")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explorez les catacombes' })).toHaveCount(0);

  const visual = await page.locator('.home__content').evaluate(element => {
    const logoElement = element.querySelector('.home__logo');
    const title = element.querySelector('h1');
    return {
      logoWidth: logoElement?.getBoundingClientRect().width ?? 0,
      titleFont: title ? getComputedStyle(title).fontFamily : '',
    };
  });

  expect(visual.logoWidth).toBeGreaterThan(300);
  expect(visual.titleFont.toLowerCase()).toContain('georgia');
});

test('la préférence de mouvement réduit neutralise les animations de l’accueil', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animation = await page.locator('.home__content').evaluate(element => {
    const play = element.querySelector('.home__play');
    return {
      content: getComputedStyle(element).animationName,
      play: play ? getComputedStyle(play).animationName : '',
      shimmer: play ? getComputedStyle(play, '::after').animationName : '',
    };
  });

  expect(animation).toEqual({ content: 'none', play: 'none', shimmer: 'none' });
});

test('les aides contextuelles utilisent les commandes Karak et restaurent le focus', async ({ page }) => {
  await page.goto('/play');

  const help = page.getByRole('button', { name: /Afficher l’aide/ }).first();
  await expect(help).toBeVisible();

  const buttonStyle = await help.evaluate(element => {
    const style = getComputedStyle(element);
    return { backgroundImage: style.backgroundImage, fontFamily: style.fontFamily };
  });
  expect(buttonStyle.backgroundImage).toContain('linear-gradient');
  expect(buttonStyle.fontFamily.toLowerCase()).toContain('georgia');

  await help.click();
  const popover = page.getByRole('dialog', { name: 'Choisir les joueurs' });
  await expect(popover).toBeVisible();
  await popover.click();
  await expect(popover).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(help).toBeFocused();
});

test('une aide contextuelle se ferme par clic extérieur', async ({ page }) => {
  await page.goto('/play');

  const help = page.getByRole('button', { name: /Afficher l’aide/ }).first();
  await help.click();
  const popover = page.getByRole('dialog', { name: 'Choisir les joueurs' });
  await expect(popover).toBeVisible();

  await page.locator('h1').click({ position: { x: 2, y: 2 } });

  await expect(popover).toBeHidden();
});

test('le Codex depuis l’accueil revient à l’accueil', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home__lore').click();

  await expect(page).toHaveURL(/\/codex\?from=home$/);
  await expect(page.getByRole('heading', { name: 'Karak', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '← Accueil' })).toBeVisible();

  await page.getByRole('button', { name: '← Accueil' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /Jouer/ })).toBeVisible();
});

test('le Codex depuis la préparation revient à la préparation', async ({ page }) => {
  await page.goto('/play');
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Encyclopédie' }).click();

  await expect(page).toHaveURL(/\/codex\?from=game$/);
  await page.getByRole('button', { name: '← Retour à la partie' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
});

test('l’accueil et la préparation restent sans débordement aux six dimensions cibles', async ({ page }) => {
  const viewports = [
    [1920, 1080],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [844, 390],
  ] as const;

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('.home__logo')).toBeVisible();
    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
    await page.getByRole('link', { name: /Jouer/ }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
  }
});

test('la préparation reste lisible sur écran étroit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();

  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await openHeaderMenu(page);
  await expect(page.getByRole('button', { name: "Retour à l'accueil" })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Encyclopédie' })).toBeVisible();
  await expect(page.getByAltText('Karak')).toBeVisible();
  await page.screenshot({
    path: 'playwright-report/karak-setup-narrow.png',
    fullPage: true,
  });
});

test('le header contient et centre son logo et son menu', async ({ page }) => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/play');
    await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();

    const geometry = await page.locator('.game-header').evaluate(header => {
      const headerBox = header.getBoundingClientRect();
      const logoBox = header.querySelector('.game-header__logo')?.getBoundingClientRect();
      return {
        header: { top: headerBox.top, bottom: headerBox.bottom, center: headerBox.top + headerBox.height / 2 },
        logo: logoBox && { top: logoBox.top, bottom: logoBox.bottom, center: logoBox.top + logoBox.height / 2 },
      };
    });

    expect(geometry.logo).toBeTruthy();
    expect(geometry.logo!.top).toBeGreaterThanOrEqual(geometry.header.top);
    expect(geometry.logo!.bottom).toBeLessThanOrEqual(geometry.header.bottom);
    expect(Math.abs(geometry.logo!.center - geometry.header.center)).toBeLessThanOrEqual(2);
    await page.getByRole('button', { name: 'Ouvrir le menu de partie' }).click();
    await expect(page.getByRole('menu', { name: 'Commandes de partie' })).toBeVisible();
    await expect(page.getByRole('button', { name: "Retour à l'accueil" })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Encyclopédie' })).toBeVisible();
  }
});

test('le menu du header reste compact et accessible sur toutes les largeurs', async ({ page }) => {
  const viewports = [200, 320, 375, 607, 640, 667, 768, 1024, 1366];

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 871 });
    await page.goto('/play');
    await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();

    const menuTrigger = page.getByRole('button', { name: 'Ouvrir le menu de partie' });
    await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
    await menuTrigger.click();
    const menu = page.getByRole('menu', { name: 'Commandes de partie' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Tutoriel' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Paramètres' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Encyclopédie' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');

    const geometry = await page.locator('.game-header').evaluate(header => {
      const headerBox = header.getBoundingClientRect();
      const headerStyle = getComputedStyle(header);
      const logo = header.querySelector('.game-header__logo')?.getBoundingClientRect();
      const actionBoxes = Array.from(header.querySelectorAll<HTMLElement>('.karak-header-action'))
        .map(action => action.getBoundingClientRect());
      if (!logo) throw new Error('Logo du header introuvable');

      const overlaps = actionBoxes.some(action =>
        action.left < logo.right && action.right > logo.left &&
        action.top < logo.bottom && action.bottom > logo.top,
      );
      const contained = actionBoxes.every(action =>
        action.left >= headerBox.left && action.right <= headerBox.right &&
        action.top >= headerBox.top && action.bottom <= headerBox.bottom,
      );

      return {
        overlaps,
        contained,
        headerBackgroundImage: headerStyle.backgroundImage,
        headerBackgroundColor: headerStyle.backgroundColor,
        headerBorderBottomWidth: headerStyle.borderBottomWidth,
        headerHeight: headerBox.height,
        topSpace: Math.min(...actionBoxes.map(action => action.top - headerBox.top)),
        bottomSpace: Math.min(...actionBoxes.map(action => headerBox.bottom - action.bottom)),
        actionSizes: actionBoxes.map(action => ({ width: action.width, height: action.height })),
      };
    });

    expect(geometry.overlaps).toBe(false);
    expect(geometry.contained).toBe(true);
    expect(geometry.headerBackgroundImage).toBe('none');
    expect(geometry.headerBackgroundColor).toBe('rgb(98, 83, 69)');
    expect(geometry.headerBorderBottomWidth).toBe('0px');
    expect(geometry.actionSizes.every(action => action.width >= 44 && action.height >= 44)).toBe(true);

    if (width <= 600) {
      expect(geometry.headerHeight).toBeGreaterThanOrEqual(64);
      expect(geometry.bottomSpace).toBeGreaterThanOrEqual(8);
    }

    const styleSignatures = await page.locator('.game-header .karak-header-action').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return {
        border: style.border,
        borderRadius: style.borderRadius,
        backgroundImage: style.backgroundImage,
        color: style.color,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
      };
    }));

    expect(new Set(styleSignatures.map(signature => JSON.stringify(signature))).size).toBe(1);
  }
});

test('la préférence de mouvement réduit neutralise les animations de préparation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/play');
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();

  const animation = await page.locator('.game-setup__content').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      name: style.animationName,
      duration: style.animationDuration,
    };
  });

  expect(animation.name).toBe('none');
  expect(animation.duration).toBe('0s');
});

test('la préparation progresse jusqu’à la détermination du premier joueur', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  // Le bouton arrive avec l'animation d'entrée du panneau de préparation.
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({
    path: 'playwright-report/karak-first-player.png',
    fullPage: true,
  });
});

test('une partie atteint le plateau après les lancers de préparation', async ({ page }) => {
  // Le générateur est limité à ce test navigateur : aucune logique de production
  // n'est modifiée, mais la partie jouée devient reproductible pour la recette.
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
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  for (let attempt = 0; attempt < 20; attempt++) {
    const rollButton = page.locator('button[aria-label^="Lancer les dés du joueur"], button[aria-label^="Relancer les dés du joueur"]').first();
    if (await rollButton.count() > 0 && await rollButton.isVisible()) {
      await rollButton.click({ force: true });
    }
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) {
      break;
    }
    await page.waitForTimeout(400);
  }

  await expect(page.getByRole('button', { name: 'Entrer dans le donjon' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible({ timeout: 10_000 });

  const combatOverlay = page.locator('.combat-overlay');
  if (await combatOverlay.isVisible().catch(() => false)) {
    const rollButton = page.getByRole('button', { name: 'Lancer les dés' });
    await expect(rollButton).toBeVisible({ timeout: 5_000 });
    await rollButton.click({ force: true });
    await expect(page.locator('.combat-overlay__dice')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.combat-overlay__score-summary')).toHaveCount(0);
    await page.screenshot({ path: 'playwright-report/karak-combat-roll.png', fullPage: true });

    await expect.poll(async () => {
      const decision = await page.getByRole('button', { name: /Terminer sans autre sort/ }).count();
      const continueButton = await page.getByRole('button', { name: 'Continuer' }).count();
      return decision + continueButton > 0 || !(await combatOverlay.isVisible());
    }, { timeout: 10_000 }).toBe(true);

    const finishWithoutMagic = page.getByRole('button', { name: /Terminer sans autre sort/ });
    if (await finishWithoutMagic.isVisible().catch(() => false)) {
      await finishWithoutMagic.click({ force: true });
    }
    const continueButton = page.getByRole('button', { name: 'Continuer' });
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click({ force: true });
    }
    await expect(combatOverlay).toBeHidden({ timeout: 10_000 });
  }

  const explorationTarget = page.locator('button.board__exploration-target').first();
  if (await explorationTarget.isVisible().catch(() => false)) {
    await explorationTarget.click({ force: true });
    await expect(page.locator('.board__tile--pending')).toBeVisible();
    await expect(page.locator('.board__exploration-reveal')).toHaveCount(0);
    await page.locator('button.board__exploration-target').first().click({ force: true });
    await expect(page.locator('.board__tile--pending')).toBeVisible();
    await expect(page.locator('button.board__confirm')).toBeVisible();
    await page.locator('button.board__confirm').click({ force: true });
    await expect(page.locator('.board__tile--pending')).toHaveCount(0);
  }
  await page.screenshot({
    path: 'playwright-report/karak-board-start.png',
    fullPage: true,
  });
});

test('les fiches de héros sont accessibles depuis le plateau', async ({ page }) => {
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
  const infoButton = page.getByRole('button', { name: /Afficher les informations de/ }).first();
  await expect(infoButton).toBeVisible();
  await infoButton.click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await expect(page.locator('.codex-dialog__close')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect(page.getByRole('button', { name: /^Consulter pouvoir 1 :/ }).first()).toBeVisible();
  const emptyTreasure = page.locator('.player-sidebar--left .treasure-panel__empty');
  await expect(emptyTreasure).toHaveAttribute('aria-label', 'Aucun trésor');
  await expect(emptyTreasure.locator('img')).toBeVisible();
  await expect(emptyTreasure.locator('.treasure-panel__empty-strike')).toBeVisible();
});

test('quitter la préparation réinitialise la partie sans confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();

  await openHeaderMenu(page);
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Jouer' })).toBeVisible();

  await page.goto('/play');
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
});

test('quitter une partie active demande confirmation et permet l’annulation', async ({ page }) => {
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

  await openHeaderMenu(page);
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await expect(page.getByRole('heading', { name: 'Quitter la partie ?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Quitter la partie ?' })).toHaveCount(0);
  await expect(page.locator('app-board')).toBeVisible();

  await openHeaderMenu(page);
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await page.getByRole('button', { name: 'Quitter la partie' }).click();
  await expect(page).toHaveURL(/\/$/);
});
