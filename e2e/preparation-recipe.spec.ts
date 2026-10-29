import { expect, test } from '@playwright/test';

test('INIT-001 affiche l’accueil puis l’écran initial de préparation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Jouer' })).toBeVisible();
  await page.getByRole('link', { name: 'Jouer' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect(page.getByText('Prépare ton aventure dans le donjon')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Solo contre IA/ })).toHaveAttribute('aria-checked', 'true');
});

test('INIT-004 à INIT-010 configurent cinq participants, reviennent en arrière et tirent des héros uniques', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: '5' }).click();
  await page.getByRole('radio', { name: /Entre amis/ }).click();
  await page.locator('.game-setup__human-count', { hasText: '3' }).click();
  await expect(page.getByText(/3 joueurs humains/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  await expect(page.locator('.game-setup__player-roll')).toHaveCount(5);

  await page.getByRole('button', { name: 'Étape précédente' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect(page.locator('.game-setup__player-count--selected')).toHaveText('5');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();

  const heroCards = page.locator('.game-setup__player-roll img[alt="Carte Héros"]');
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(heroCards).toHaveCount(5);
  expect(new Set(await heroCards.evaluateAll((images) => images.map((image) => image.getAttribute('src')))).size).toBe(5);
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });
});

test('la première étape présente les trois modes et un résumé synchronisé', async ({ page }) => {
  await page.goto('/play');

  const summary = page.locator('.game-setup__party-summary');
  await expect(summary).toContainText('Vous + 1 adversaire IA');

  await page.getByRole('button', { name: '4', exact: true }).click();
  await expect(summary).toContainText('Vous + 3 adversaires IA');

  await page.getByRole('radio', { name: /Entre amis/ }).click();
  await page.locator('.game-setup__human-count', { hasText: '3' }).click();
  await expect(summary).toContainText('3 joueurs humains + 1 adversaire IA');

  await page.getByRole('radio', { name: /IA contre IA/ }).click();
  await expect(summary).toContainText('4 aventuriers IA');
  await expect(page.getByRole('radio', { name: /Solo contre IA/ })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('radio', { name: /IA contre IA/ })).toHaveAttribute('aria-checked', 'true');
});

test('la progression du setup reste entièrement visible sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 407, height: 904 });
  await page.goto('/play');

  const content = page.locator('.game-setup__content');
  await expect(content).toBeVisible();
  await expect(content).toHaveCSS('background-image', /hero-background-panel\.webp/);

  const progress = page.locator('.game-setup__progress');
  await expect(progress).toBeVisible();

  const geometry = await progress.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const children = Array.from(element.children).map(child => child.getBoundingClientRect());
    return {
      left: bounds.left,
      right: bounds.right,
      childrenInside: children.every(child => child.left >= bounds.left - 1 && child.right <= bounds.right + 1),
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
    };
  });

  expect(geometry.childrenInside).toBe(true);
  expect(geometry.hasHorizontalOverflow).toBe(false);
});

test('INIT-003 conserve une préparation initialisée lors du retour depuis le Codex', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();

  await page.getByRole('button', { name: 'Ouvrir le menu de partie' }).click();
  await page.getByRole('menuitem', { name: 'Encyclopédie' }).click();
  await expect(page).toHaveURL(/\/codex\?from=game$/);
  await page.getByRole('button', { name: 'Retour à la partie' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toHaveCount(0);
});

test('le gabarit de préparation reste contenu sur les écrans intermédiaires et courts', async ({ page }) => {
  for (const viewport of [
    { width: 800, height: 500 },
    { width: 1024, height: 480 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/play');
    await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();

    const geometry = await page.locator('.game-setup__content').evaluate(element => {
      const content = element.getBoundingClientRect();
      const stage = element.querySelector('.game-setup__stage')!.getBoundingClientRect();
      return {
        contentLeft: content.left,
        contentRight: content.right,
        contentBottom: content.bottom,
        stageLeft: stage.left,
        stageRight: stage.right,
        stageBottom: stage.bottom,
      };
    });

    expect(geometry.contentLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.contentRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.contentBottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.stageLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.stageRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.stageBottom).toBeLessThanOrEqual(viewport.height + 1);

    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  }
});
