import { test, expect, type Locator, type Page } from '@playwright/test';
import { addStubMovie, fillCreateEventForm, registerAccount } from './helpers';

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return rect;
}

async function stickyBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('[data-event-sticky-bar]');
    if (!bar) throw new Error('sticky bar not found');
    return bar.getBoundingClientRect().bottom;
  });
}

test.describe('Event page layout', () => {
  test('what the sticky bar opens stays below it, on desktop', async ({ page }) => {
    test.setTimeout(120_000);
    await registerAccount(page, 'HoteMiseEnPage');

    await page.goto('/new');
    await fillCreateEventForm(page, 'Soirée mise en page E2E');
    await expect(page).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });

    await page.getByRole('button', { name: /proposer un film/i }).click();
    const search = page.getByRole('combobox', { name: /proposer un film/i });
    await expect(search).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await box(search)).y - (await stickyBottom(page)), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(0);

    const searchBox = await box(search);

    const searchButton = page.getByRole('button', { name: /^rechercher$/i }).first();
    const buttonBox = await box(searchButton);
    expect(buttonBox.y).toBeGreaterThanOrEqual(searchBox.y);
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(searchBox.y + searchBox.height + 1);
    await expect(searchButton).toHaveCSS('position', 'absolute');

    await page
      .getByRole('heading', { name: /proposer un film/i })
      .locator('..')
      .getByRole('button', { name: /^fermer$/i })
      .click();
    await expect(search).toBeHidden();

    await addStubMovie(page);

    await expect(page.getByRole('button', { name: 'Note' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1 participant' })).toBeVisible();

    await page.getByRole('button', { name: /choisir moi-même/i }).click();
    const firstPick = page.locator('[data-testid^="manual-pick-"]').first();
    await expect(firstPick).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await box(firstPick)).y - (await stickyBottom(page)), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(0);
  });
});
