import { expect, test } from '@playwright/test';

async function enterDungeon(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('button[title="Tirer les héros"]').click({ force: true });
  await expect(page.getByRole('heading', { name: /Qui commence/ })).toBeVisible({ timeout: 10_000 });

  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = page.locator('button[aria-label^="Lancer les dés"], button[aria-label^="Relancer les dés"]').first();
    if (await roll.isVisible().catch(() => false)) await roll.click({ force: true });
    if (await page.getByRole('button', { name: 'Entrer dans le donjon' }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }

  await page.getByRole('button', { name: 'Entrer dans le donjon' }).click();
  await expect(page.locator('app-board')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.toast-container')).toBeVisible({ timeout: 5_000 });
}

test('les notifications sont alignees sur le HUD sans debordement sur desktop et mobile', async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await enterDungeon(page);

    const geometry = await page.locator('.toast-container').evaluate(toast => {
      const toastBox = toast.getBoundingClientRect();
      const headerBox = document.querySelector('.game-header')?.getBoundingClientRect();
      const sidebars = Array.from(document.querySelectorAll<HTMLElement>('.player-hud__side')).map(element => element.getBoundingClientRect());
      const controls = Array.from(document.querySelectorAll<HTMLElement>('.player-hud__player-control')).map(element => element.getBoundingClientRect());
      const intersects = (first: DOMRect, second: DOMRect): boolean =>
        first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
      return {
        toast: { left: toastBox.left, right: toastBox.right, top: toastBox.top, bottom: toastBox.bottom, width: toastBox.width, height: toastBox.height },
        headerBottom: headerBox?.bottom ?? 0,
        controlHeight: controls[0] ? Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>('.player-hud__player-control')!).height) : 0,
        sidebarOverlap: sidebars.some(sidebar => intersects(toastBox, sidebar)),
        controlOverlap: controls.some(control => intersects(toastBox, control)),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        style: toast.getAttribute('style') ?? '',
      };
    });

    expect(geometry.overflow).toBe(false);
    expect(geometry.toast.top).toBeGreaterThan(geometry.headerBottom);
    expect(geometry.sidebarOverlap).toBe(false);
    expect(geometry.controlOverlap, JSON.stringify({ viewport, geometry })).toBe(false);
    expect(Math.abs(geometry.toast.height - geometry.controlHeight), JSON.stringify({ viewport, geometry })).toBeLessThanOrEqual(1);
    expect(geometry.style).toContain('--toast-hero-color');

    if (viewport.width > 640) {
      expect(Math.abs(geometry.toast.width - viewport.width / 3)).toBeLessThanOrEqual(1);
    } else {
      expect(geometry.toast.width).toBeLessThanOrEqual(viewport.width - 16);
    }

    await page.screenshot({
      path: `playwright-report/notification-layout-${viewport.width <= 640 ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
  }
});
