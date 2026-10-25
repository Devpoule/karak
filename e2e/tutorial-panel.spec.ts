import { expect, test } from '@playwright/test';

test('le tutoriel parcourt les cinq étapes depuis l’accueil', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutoriel' }).click();

  await expect(page.getByRole('dialog', { name: 'Préparez votre aventure' })).toBeVisible();
  for (let step = 0; step < 4; step++) {
    await page.getByRole('button', { name: 'Suivant' }).click();
  }
  await expect(page.getByRole('dialog', { name: 'Vainquez le Dragon' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminer le tutoriel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('le tutoriel reste utilisable au clavier et sur mobile dans la partie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ouvrir le menu de partie' }).click();
  await page.getByRole('button', { name: 'Tutoriel' }).click();

  await expect(page.getByRole('dialog', { name: 'Préparez votre aventure' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog', { name: 'Explorez les catacombes' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('dialog', { name: 'Préparez votre aventure' })).toBeVisible();

  const layout = await page.getByRole('dialog').evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
