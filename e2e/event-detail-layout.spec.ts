import { test, expect, type Locator, type Page } from '@playwright/test';
import { addStubMovie, fillCreateEventForm, registerAccount } from './helpers';

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return rect;
}

async function settled(locator: Locator) {
  await locator.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished)
    )
  );
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
    const dialog = page.getByRole('dialog', { name: /proposer un film/i });
    const search = dialog.getByRole('searchbox', { name: /chercher un film/i });
    await expect(search).toBeVisible({ timeout: 15_000 });
    await settled(dialog);

    const searchBox = await box(search);

    const searchButton = dialog.getByRole('button', { name: /^rechercher$/i });
    const buttonBox = await box(searchButton);
    expect(buttonBox.y).toBeGreaterThanOrEqual(searchBox.y);
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(searchBox.y + searchBox.height + 1);
    await expect(searchButton).toHaveCSS('position', 'absolute');

    await dialog
      .getByRole('button', { name: /^fermer$/i })
      .last()
      .click();
    await expect(dialog).toBeHidden();

    await addStubMovie(page);

    await expect(page.getByRole('button', { name: 'Note', exact: true })).toBeVisible();
    const condensedParticipants = page.getByTestId('participants-toggle-condensed');
    await expect(condensedParticipants).toBeVisible();
    await expect(condensedParticipants).toHaveAccessibleName('1 participant');

    await page.getByRole('button', { name: 'Autre façon de choisir le film' }).click();
    await page.getByRole('menuitem', { name: 'Choisir moi-même' }).click();
    const firstPick = page.locator('[data-testid^="manual-pick-"]').first();
    await expect(firstPick).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await box(firstPick)).y - (await stickyBottom(page)), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(0);
  });
});
