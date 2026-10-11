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
