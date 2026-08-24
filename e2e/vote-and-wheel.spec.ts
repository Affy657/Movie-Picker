import { test, expect } from '@playwright/test';
import { fillCreateEventForm, registerAccount } from './helpers';

test.describe('Vote et roue (hote)', () => {
  test('propose un film, vote, lance la roue, annule le tirage puis relance', async ({ page }) => {
    await registerAccount(page, 'HoteRoue');

    await page.goto('/new');
    await fillCreateEventForm(page, 'Soirée vote E2E');
    await expect(page).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });

    const search = page.getByRole('combobox', { name: /proposer un film/i });
    await search.fill('stub');
    const result = page.getByRole('listitem').filter({ hasText: /film e2e stub/i });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await result.getByRole('button', { name: /^ajouter$/i }).click();
    await expect(search).toHaveValue('', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Voter pour Film E2E Stub' }).click();
    await expect(page.getByRole('button', { name: /retirer mon vote pour/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Lancer la roue' }).click();
    await expect(page.getByText('Film sélectionné !')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(page.getByText('Film gagnant', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Annuler le tirage' }).click();
    await expect(page.getByRole('button', { name: 'Lancer la roue' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
