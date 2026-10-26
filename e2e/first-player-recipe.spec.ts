import { expect, test, type Page } from '@playwright/test';

/** Force seulement les deux valeurs métier du prochain lancer dans ce navigateur. */
async function nextDice(page: Page, die1: number, die2: number): Promise<void> {
  await page.evaluate(([first, second]) => {
    const values = [(first - 1) / 6, (second - 1) / 6];
    let index = 0;
    Math.random = () => values[index++] ?? 0.5;
  }, [die1, die2]);
}

async function expectDice(page: Page, playerIndex: number, die1: number, die2: number): Promise<void> {
  const card = page.locator('.game-setup__player-roll').nth(playerIndex);
  await expect(card.locator('.game-setup__die--stopped')).toHaveCount(2);
  await expect(card.locator('.game-setup__die--stopped').nth(0)).toHaveAttribute('data-value', String(die1));
  await expect(card.locator('.game-setup__die--stopped').nth(1)).toHaveAttribute('data-value', String(die2));
  await expect(card.locator('.game-setup__roll-equation')).toHaveText(`${die1}+${die2}=${die1 + die2}`);
}

/** Contrôle atomiquement les résultats et le verrouillage pendant une transition d'égalité. */
async function expectTieTransition(
  page: Page,
  expectedRolls: Array<{ dice: [number, number]; equation: string }>,
): Promise<void> {
  const stage = page.locator('.game-setup__stage--player-cards');

  await expect.poll(async () => stage.evaluate((element) => ({
    message: element.querySelector('[role="status"]')?.textContent?.replace(/\s+/g, ' ').trim(),
    rolls: Array.from(element.querySelectorAll('.game-setup__player-roll')).map(card => ({
      dice: Array.from(card.querySelectorAll('.game-setup__die--stopped'))
        .map(die => Number(die.getAttribute('data-value'))),
      equation: card.querySelector('.game-setup__roll-equation')?.textContent?.replace(/\s+/g, '').trim() ?? '',
    })),
    rollingPlayerCount: element.querySelectorAll('.game-setup__dice').length,
    rollActions: Array.from(element.querySelectorAll('button[aria-label*="les dés du joueur"]'))
      .map(button => button.getAttribute('aria-label')),
  }))).toEqual({
    message: 'Égalité au meilleur score entre Joueur 1 et Joueur 2. Les résultats restent affichés avant la manche de départage.',
    rolls: expectedRolls,
    rollingPlayerCount: 0,
    rollActions: [],
  });
}

test('recette 01 : égalités répétées, relances et premier tour de quatre mouvements', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Jouer à plusieurs sur cet appareil' }).click();
  await page.locator('.game-setup__human-count').filter({ hasText: '2' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  await nextDice(page, 4, 4);
  await page.getByRole('button', { name: 'Lancer les dés du joueur 1' }).click({ force: true });
  await expect(page.getByRole('button', { name: 'Lancer les dés du joueur 1' })).toHaveCount(0);
  await expect(page.locator('.game-setup__player-roll').first().locator('.game-setup__dice .game-setup__die')).toHaveCount(2);
  await expectDice(page, 0, 4, 4);

  await nextDice(page, 5, 3);
  await page.getByRole('button', { name: 'Lancer les dés du joueur 2' }).click({ force: true });
  await expect(page.getByRole('button', { name: 'Lancer les dés du joueur 2' })).toHaveCount(0);
  await expectTieTransition(page, [
    { dice: [4, 4], equation: '4+4=8' },
    { dice: [5, 3], equation: '5+3=8' },
  ]);
  await expect(page.getByRole('button', { name: 'Relancer les dés du joueur 1' })).toBeVisible();
  await expect(page.locator('.game-setup__die--stopped')).toHaveCount(0);

  await nextDice(page, 1, 5);
  await page.getByRole('button', { name: 'Relancer les dés du joueur 1' }).click({ force: true });
  await expectDice(page, 0, 1, 5);

  await nextDice(page, 3, 3);
  await page.getByRole('button', { name: 'Relancer les dés du joueur 2' }).click({ force: true });
  await expectTieTransition(page, [
    { dice: [1, 5], equation: '1+5=6' },
    { dice: [3, 3], equation: '3+3=6' },
  ]);
  await expect(page.getByRole('button', { name: 'Relancer les dés du joueur 1' })).toBeVisible();

  await nextDice(page, 1, 1);
  await page.getByRole('button', { name: 'Relancer les dés du joueur 1' }).click({ force: true });
  await expectDice(page, 0, 1, 1);

  await nextDice(page, 6, 6);
  await page.getByRole('button', { name: 'Relancer les dés du joueur 2' }).click({ force: true });
  await expectDice(page, 1, 6, 6);
  await expect(page.getByText("Joueur 2 commence l'aventure !")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prêts pour l’aventure ?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Relancer les dés du joueur/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible();
  await expect(page.locator('.board__hero--active')).toHaveCount(1);
  await expect(page.locator('.player-hud__player-control--active')).toContainText('J2');
  const activeMovementCounter = page.locator('.player-hud__side--active app-movement-counter');
  await expect(activeMovementCounter.locator('.movement-counter__point')).toHaveCount(4);
  await expect(activeMovementCounter.locator('.movement-counter__point--consumed')).toHaveCount(0);
});

test('recette 01 : une IA participe automatiquement après le joueur humain', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  await nextDice(page, 1, 1);
  await page.getByRole('button', { name: 'Lancer les dés du joueur 1' }).click({ force: true });
  await expectDice(page, 0, 1, 1);
  await nextDice(page, 6, 6);
  await expect(page.getByText('Joueur 2 lance les dés...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lancer les dés du joueur 2' })).toHaveCount(0);
  await expectDice(page, 1, 6, 6);
  await expect(page.getByText("Joueur 2 commence l'aventure !")).toBeVisible();
});

test('recette 01 : des IA ex æquo attendent puis relancent automatiquement', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer' }).click();
  await page.getByRole('button', { name: 'Simuler une partie IA contre IA' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Tirer les héros', exact: true }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Qui commence ?' })).toBeVisible({ timeout: 10_000 });

  await nextDice(page, 3, 3);
  await expect(page.getByText('Joueur 1 lance les dés...')).toBeVisible();
  await expectDice(page, 0, 3, 3);
  await nextDice(page, 4, 2);
  await expectTieTransition(page, [
    { dice: [3, 3], equation: '3+3=6' },
    { dice: [4, 2], equation: '4+2=6' },
  ]);

  await nextDice(page, 2, 2);
  await expect(page.getByText('Joueur 1 relance les dés...')).toBeVisible();
  await expectDice(page, 0, 2, 2);
  await nextDice(page, 5, 5);
  await expect(page.getByText('Joueur 2 relance les dés...')).toBeVisible();
  await expectDice(page, 1, 5, 5);
  await expect(page.getByText("Joueur 2 commence l'aventure !")).toBeVisible();
});
