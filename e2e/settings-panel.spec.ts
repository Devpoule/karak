import { expect, test } from '@playwright/test';

test('le panneau de paramètres applique et conserve les préférences', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Paramètres' }).click();

  await expect(page.getByRole('dialog', { name: 'Paramètres' })).toBeVisible();
  await page.getByRole('radio', { name: 'Animations réduites' }).check();
  await page.getByRole('radio', { name: 'Grande' }).check();
  await page.getByRole('radio', { name: 'Contraste renforcé' }).check();

  await expect(page.locator('html')).toHaveAttribute('data-karak-motion', 'reduced');
  await expect(page.locator('html')).toHaveAttribute('data-karak-text-scale', 'large');
  await expect(page.locator('html')).toHaveAttribute('data-karak-contrast', 'high');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-karak-motion', 'reduced');
  await expect(page.locator('html')).toHaveAttribute('data-karak-text-scale', 'large');
  await expect(page.locator('html')).toHaveAttribute('data-karak-contrast', 'high');

  await page.getByRole('button', { name: 'Paramètres' }).click();
  await page.getByRole('button', { name: 'Réinitialiser' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-karak-motion');
  await expect(page.locator('html')).not.toHaveAttribute('data-karak-text-scale');
  await expect(page.locator('html')).not.toHaveAttribute('data-karak-contrast');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paramètres' })).toBeHidden();
});

test('le panneau reste accessible depuis la partie sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/play');
  await page.getByRole('button', { name: 'Paramètres' }).click();

  await expect(page.getByRole('dialog', { name: 'Paramètres' })).toBeVisible();
  const layout = await page.getByRole('dialog', { name: 'Paramètres' }).evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await page.getByRole('button', { name: 'Fermer les paramètres' }).click();
  await expect(page.getByRole('dialog', { name: 'Paramètres' })).toBeHidden();
});
