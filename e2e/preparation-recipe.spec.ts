import { expect, test } from '@playwright/test';

test('INIT-001 affiche l’accueil puis l’écran initial de préparation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Jouer' })).toBeVisible();
  await page.getByRole('link', { name: 'Jouer' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toBeVisible();
  await expect(page.getByText("Combien d'aventuriers entrent dans le donjon ?")).toBeVisible();
});

test('INIT-004 à INIT-010 configurent cinq participants, reviennent en arrière et tirent des héros uniques', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: '5' }).click();
  await page.getByRole('button', { name: 'Jouer à plusieurs sur cet appareil' }).click();
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

test('INIT-003 conserve une préparation initialisée lors du retour depuis le Codex', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();

  await page.getByRole('button', { name: 'Ouvrir le menu de partie' }).click();
  await page.getByRole('menuitem', { name: 'Encyclopédie' }).click();
  await expect(page).toHaveURL(/\/codex\?from=game$/);
  await page.getByRole('button', { name: '← Retour à la partie' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { name: 'Tirage des héros' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouvelle partie' })).toHaveCount(0);
});
