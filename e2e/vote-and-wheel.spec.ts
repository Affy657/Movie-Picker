import { test, expect } from '@playwright/test';
import {
  addStubMovie,
  fillCreateEventForm,
  registerAccount,
  spinWheelAndDismissWinner,
} from './helpers';

test.describe('Vote et roue (hote)', () => {
  test('propose un film, vote, lance la roue, annule le tirage puis relance', async ({ page }) => {
    test.setTimeout(120_000);
    await registerAccount(page, 'HoteRoue');

    await page.goto('/new');
    await fillCreateEventForm(page, 'Soirée vote E2E');
    await expect(page).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });

    await addStubMovie(page);

    await page.getByRole('button', { name: 'Voter pour Film E2E Stub' }).click();
    await expect(page.getByRole('button', { name: /retirer mon vote pour/i })).toBeVisible({
      timeout: 15_000,
    });

    await spinWheelAndDismissWinner(page);

    await page.getByRole('button', { name: 'Annuler le tirage' }).click();
    await expect(page.getByRole('button', { name: 'Lancer la roue' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
