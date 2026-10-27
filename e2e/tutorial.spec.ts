import { expect, test } from '@playwright/test';

async function setTutorialProgress(page: import('@playwright/test').Page, completed: number): Promise<void> {
  await page.evaluate(count => {
    const root = document.querySelector('app-root');
    const ng = (window as Window & { ng?: { getComponent(node: Element): any } }).ng;
    const tutorial = root && ng?.getComponent(root.querySelector('app-tutorial') ?? root);
    if (!tutorial) throw new Error('Tutorial component unavailable');

    const objectives = ['movement', 'exploration', 'combat', 'west-branch', 'east-branch', 'portal', 'exit'];
    tutorial.session.objectives.set(Object.fromEntries(
      objectives.map((objective, index) => [objective, index < count]),
    ));
  }, completed);
}

test('le didacticiel affiche les objectifs dans le logement droit du HUD sur desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tutorial');

  const checklist = page.locator('app-player-hud app-tutorial-checklist');
  await expect(page.locator('app-board')).toBeVisible();
  await expect(checklist).toBeVisible();
  await expect(checklist.getByText('DIDACTICIEL', { exact: true })).toBeVisible();
  await expect(checklist.locator('.tutorial-checklist__items li')).toHaveCount(7);
  await expect(checklist.locator('.tutorial-checklist__item--current')).toHaveText('Se déplacer');
  await expect(checklist.getByRole('progressbar', { name: 'Progression du didacticiel' })).toHaveAttribute('aria-valuenow', '0');
  await expect(checklist.getByRole('button')).toHaveCount(0);
  await expect(page.locator('.tutorial__play-area > app-tutorial-checklist')).toHaveCount(0);
  await expect(page.locator('.player-hud__side--right app-player-sidebar')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Choisissez le passage à explorer' })).toBeVisible();
  await expect(page.locator('.board__tile')).toHaveCount(1);
  await expect(page.locator('.player-hud__side--left .movement-counter')).toHaveAttribute('aria-label', '4 points disponibles');

  const layout = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('app-player-hud app-tutorial-checklist');
    const help = document.querySelector<HTMLElement>('app-tutorial-help');
    const header = document.querySelector<HTMLElement>('app-game-header');
    const leftSidebar = document.querySelector<HTMLElement>('.player-hud__side--left');
    if (!panel || !help || !header || !leftSidebar) throw new Error('Tutorial HUD layout unavailable');
    const panelRect = panel.getBoundingClientRect();
    const helpRect = help.getBoundingClientRect();
    return {
      panel: panelRect.toJSON(),
      help: helpRect.toJSON(),
      helpClearOfChecklist: helpRect.right <= panelRect.left || helpRect.left >= panelRect.right
        || helpRect.bottom <= panelRect.top || helpRect.top >= panelRect.bottom,
      header: header.getBoundingClientRect().toJSON(),
      leftSidebar: leftSidebar.getBoundingClientRect().toJSON(),
      viewportWidth: window.innerWidth,
    };
  });
  expect(layout.panel.left).toBeGreaterThan(layout.viewportWidth / 2);
  expect(layout.panel.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.helpClearOfChecklist).toBe(true);
  expect(layout.panel.top).toBeGreaterThanOrEqual(layout.header.bottom);
  expect(layout.panel.left).toBeGreaterThan(layout.leftSidebar.right);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Choisissez le passage à explorer' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Aide : Exploration · passage' })).toBeVisible();
});

test('la check-list reflète les jalons métier à 0/7, 3/7 et 7/7', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tutorial');

  const checklist = page.locator('app-player-hud app-tutorial-checklist');
  const progress = checklist.getByRole('progressbar', { name: 'Progression du didacticiel' });
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(checklist.locator('.tutorial-checklist__item--completed')).toHaveCount(0);

  await setTutorialProgress(page, 3);
  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await expect(checklist.locator('.tutorial-checklist__item--completed')).toHaveCount(3);
  await expect(checklist.locator('.tutorial-checklist__item--current')).toHaveText('Explorer la branche ouest');

  await setTutorialProgress(page, 7);
  await expect(progress).toHaveAttribute('aria-valuenow', '7');
  await expect(checklist.locator('.tutorial-checklist__item--completed')).toHaveCount(7);
  await expect(checklist.locator('.tutorial-checklist__item--current')).toHaveCount(0);
});

test('quitter le didacticiel demande confirmation et ne garde pas sa session', async ({ page }) => {
  await page.goto('/tutorial');
  const leaveButton = page.locator('.game-header__leave-trigger');
  const menuButton = page.getByRole('button', { name: 'Ouvrir le menu de partie' });
  await expect(leaveButton).toBeVisible();
  const headerActions = await Promise.all([
    leaveButton.boundingBox(),
    menuButton.boundingBox(),
  ]);
  if (!headerActions[0] || !headerActions[1]) throw new Error('Tutorial header actions unavailable');
  expect(headerActions[0].x + headerActions[0].width).toBeLessThanOrEqual(headerActions[1].x);

  await leaveButton.click();

  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();

  await leaveButton.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Quitter le didacticiel' }).click();
  await expect(page.getByRole('link', { name: 'Didacticiel' })).toBeVisible();

  await page.goto('/tutorial');
  await expect(page.getByText('0 / 7 objectifs', { exact: true })).toBeVisible();
  await expect(page.locator('.board__tile')).toHaveCount(1);
});

test('le volet compact reste repliable sans chevaucher le header ou les commandes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 709 });
  await page.goto('/tutorial');

  const mobileChecklist = page.locator('.tutorial__play-area > app-tutorial-checklist');
  const toggle = page.getByRole('button', { name: 'Déplier les objectifs du didacticiel' });
  await expect(page.getByRole('heading', { name: 'Choisissez le passage à explorer' })).toBeVisible();
  await expect(mobileChecklist).toBeVisible();
  await expect(page.locator('app-player-hud app-tutorial-checklist')).toHaveCount(0);
  await expect(mobileChecklist.locator('.tutorial-checklist__items li')).toHaveCount(0);

  const collapsedLayout = await page.evaluate(() => {
    const trigger = document.querySelector<HTMLElement>('.tutorial-checklist__toggle');
    const header = document.querySelector<HTMLElement>('app-game-header');
    const controls = [...document.querySelectorAll<HTMLElement>('.player-hud__turn-controls button')];
    if (!trigger || !header || controls.length === 0) throw new Error('Compact tutorial controls unavailable');
    const overlaps = (first: DOMRect, second: DOMRect) =>
      first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
    return {
      belowHeader: trigger.getBoundingClientRect().top >= header.getBoundingClientRect().bottom,
      overlapsTurnControls: controls.some(control => overlaps(trigger.getBoundingClientRect(), control.getBoundingClientRect())),
    };
  });
  expect(collapsedLayout.belowHeader).toBe(true);
  expect(collapsedLayout.overlapsTurnControls).toBe(false);

  await toggle.click();
  await expect(mobileChecklist.locator('.tutorial-checklist__items li')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Replier les objectifs du didacticiel' })).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await page.getByRole('button', { name: 'Réduire' }).click();
  await expect(page.getByRole('button', { name: 'Aide : Exploration · passage' })).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(mobileChecklist).toBeVisible();
  await expect(mobileChecklist.locator('.tutorial-checklist__items li')).toHaveCount(7);
  const shortLayout = await mobileChecklist.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(shortLayout.right).toBeLessThanOrEqual(shortLayout.viewportWidth);
  expect(shortLayout.bottom).toBeLessThanOrEqual(shortLayout.viewportHeight);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(mobileChecklist).toBeVisible();
  const tabletLayout = await page.evaluate(() => {
    const checklist = document.querySelector<HTMLElement>('.tutorial__play-area > app-tutorial-checklist');
    const header = document.querySelector<HTMLElement>('app-game-header');
    if (!checklist || !header) throw new Error('Tablet tutorial checklist unavailable');
    const checklistRect = checklist.getBoundingClientRect();
    return {
      top: checklistRect.top,
      right: checklistRect.right,
      bottom: checklistRect.bottom,
      headerBottom: header.getBoundingClientRect().bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(tabletLayout.top).toBeGreaterThanOrEqual(tabletLayout.headerBottom);
  expect(tabletLayout.right).toBeLessThanOrEqual(tabletLayout.viewportWidth);
  expect(tabletLayout.bottom).toBeLessThanOrEqual(tabletLayout.viewportHeight);
});

