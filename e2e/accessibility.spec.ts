import { expect, test } from '@playwright/test';

test('le lien d’évitement place le focus sur le contenu principal', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.app__skip-link')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('les actions principales de l’accueil restent nommées au clavier', async ({ page }) => {
  await page.goto('/');
  const unnamedButtons = await page.locator('button').evaluateAll(buttons => buttons
    .filter(button => !button.getAttribute('aria-label') && !button.textContent?.trim())
    .length);

  expect(unnamedButtons).toBe(0);
  await expect(page.getByRole('button', { name: 'Paramètres' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Didacticiel' })).toBeVisible();
});
