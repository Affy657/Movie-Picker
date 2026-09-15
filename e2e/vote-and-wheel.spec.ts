import { test, expect } from '@playwright/test';
import {
  addStubMovie,
  fillCreateEventForm,
  registerAccount,
  spinWheelAndDismissWinner,
} from './helpers';

test.describe('Vote and wheel (host)', () => {
  test('proposes a film, votes, spins the wheel, cancels the draw, then spins again', async ({
    page,
  }) => {
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

    await page.getByRole('button', { name: 'Autres actions sur le tirage' }).click();
    await page.getByRole('menuitem', { name: 'Repartir de zéro' }).click();
    const resetDialog = page.getByRole('dialog').filter({ hasText: /repartir de zéro/i });
    await expect(resetDialog).toBeVisible({ timeout: 15_000 });
    await resetDialog.getByRole('button', { name: 'Repartir de zéro' }).click();
    await expect(page.getByRole('button', { name: 'Lancer la roue' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
