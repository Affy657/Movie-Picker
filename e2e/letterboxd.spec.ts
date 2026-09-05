import { test, expect } from '@playwright/test';
import { registerAccount } from './helpers';

test.describe('Import Letterboxd', () => {
  test('importe la watchlist, arbitre un titre ambigu et retrouve les films dans Ma liste', async ({
    page,
  }) => {
    await registerAccount(page, 'LetterboxdE2E');

    await page.goto('/watchlist');
    await page.getByRole('button', { name: /importer depuis letterboxd/i }).click();

    const connectDialog = page.getByRole('dialog', { name: /importer depuis letterboxd/i });
    await expect(connectDialog).toBeVisible({ timeout: 15_000 });
    await connectDialog.getByLabel('Pseudo Letterboxd').fill('e2euser');
    await connectDialog.getByRole('button', { name: /connecter et importer/i }).click();

    const choicesDialog = page.getByRole('dialog').filter({ hasText: /titre à confirmer/i });
    await expect(choicesDialog).toBeVisible({ timeout: 30_000 });
    await expect(choicesDialog.getByText('Titre ambigu E2E')).toBeVisible();

    const options = choicesDialog.getByRole('radio');
    await expect(options).toHaveCount(3);
    const chosen = options.filter({ hasText: /autre film test/i });
    await chosen.click();
    await expect(chosen).toHaveAttribute('aria-checked', 'true');

    await choicesDialog.getByRole('button', { name: /confirmer et terminer/i }).click();

    const doneDialog = page.getByRole('dialog', { name: /import terminé/i });
    await expect(doneDialog).toBeVisible({ timeout: 30_000 });
    await expect(doneDialog.getByText('1 titre ajouté à votre liste')).toBeVisible();
    await expect(doneDialog.getByText('1 titre confirmé à la main')).toBeVisible();
    await doneDialog.getByRole('button', { name: /voir ma liste/i }).click();
    await expect(doneDialog).toBeHidden();

    await expect(page.getByText('Film E2E Stub').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Autre film test').first()).toBeVisible();
  });

  test('affiche une erreur quand la watchlist Letterboxd est inaccessible', async ({ page }) => {
    await registerAccount(page, 'LetterboxdKO');

    await page.goto('/watchlist');
    await page.getByRole('button', { name: /importer depuis letterboxd/i }).click();

    const connectDialog = page.getByRole('dialog', { name: /importer depuis letterboxd/i });
    await expect(connectDialog).toBeVisible({ timeout: 15_000 });
    await connectDialog.getByLabel('Pseudo Letterboxd').fill('e2eintrouvable');
    await connectDialog.getByRole('button', { name: /connecter et importer/i }).click();

    await expect(connectDialog.getByRole('alert')).toContainText(/inaccessible/i, {
      timeout: 30_000,
    });
  });
});
