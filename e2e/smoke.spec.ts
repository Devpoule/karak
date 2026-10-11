import { expect, test } from '@playwright/test';

test('Karak se charge et affiche l’entrée de partie', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Karak/i);
  await expect(page.getByRole('img', { name: 'Karak', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Règles du jeu' })).toBeVisible();

  await page.screenshot({
    path: 'playwright-report/karak-home.png',
    fullPage: true,
  });
});

test('la page de jeu affiche la préparation de partie', async ({ page }) => {
  await page.goto('/game');

  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await page.getByRole('button', { name: 'Jouer' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect(page.getByText("Combien d'aventuriers entrent dans le donjon ?")).toBeVisible();
});

test('la préparation reste lisible sur écran étroit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game');
  await page.getByRole('button', { name: 'Jouer' }).click();

  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await page.screenshot({
    path: 'playwright-report/karak-setup-narrow.png',
    fullPage: true,
  });
});

test('la préparation progresse jusqu’à la détermination du premier joueur', async ({ page }) => {
  await page.goto('/game');
  await page.getByRole('button', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  // Le bouton arrive avec l'animation d'entrée du panneau de préparation.
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Tirer les héros' }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({
    path: 'playwright-report/karak-first-player.png',
    fullPage: true,
  });
});

test('une partie atteint le plateau après les lancers de préparation', async ({ page }) => {
  await page.goto('/game');
  await page.getByRole('button', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Tirer les héros' }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  for (let attempt = 0; attempt < 8; attempt++) {
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
