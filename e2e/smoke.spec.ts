import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('link', { name: 'Codex' })).toBeVisible();

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
  await page.getByRole('link', { name: 'Codex' }).click();

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
  await expect(page.locator('.game-header__turn-label--compact')).toHaveText('Tour');
  await expect(page.locator('.game-header__turn-label--full')).toBeHidden();
  await page.screenshot({
    path: 'playwright-report/karak-setup-narrow.png',
    fullPage: true,
  });
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

  const explorationControl = page.locator('button.board__movement-control--explore').first();
  if (await explorationControl.isVisible().catch(() => false)) {
    await explorationControl.click({ force: true });
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

  await expect(page.getByRole('button', { name: /^Pouvoir 1 :/ }).first()).toBeVisible();
});

test('quitter la préparation réinitialise la partie sans confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();

  await page.getByRole('button', { name: /Accueil/ }).click();
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

  await page.getByRole('button', { name: /Accueil/ }).click();
  await expect(page.getByRole('heading', { name: 'Quitter la partie ?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Quitter la partie ?' })).toHaveCount(0);
  await expect(page.locator('app-board')).toBeVisible();

  await page.getByRole('button', { name: /Accueil/ }).click();
  await page.getByRole('button', { name: 'Quitter la partie' }).click();
  await expect(page).toHaveURL(/\/$/);
});
