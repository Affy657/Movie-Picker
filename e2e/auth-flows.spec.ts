import { test, expect } from '@playwright/test';
import {
  registerAccount,
  uniqueEmail,
  asciiSlug,
  TEST_PASSWORD,
  dismissWhatsNewModal,
} from './helpers';

test.describe('Parcours authentification', () => {
  test('inscription puis deconnexion puis reconnexion depuis une page ouverte sans compte (returnTo)', async ({
    page,
  }) => {
    const displayName = 'AuthE2E';
    const email = uniqueEmail(asciiSlug(displayName));

    await page.goto('/register');
    await page.getByLabel('Pseudo').fill(displayName);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/register'));
    await dismissWhatsNewModal(page);

    await page.getByRole('button', { name: 'Menu du compte' }).click();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page.getByRole('button', { name: 'Menu du compte' })).toBeHidden();

    await page.goto('/new');
    await expect(page).toHaveURL(/\/new$/);
    await page.getByRole('main').getByRole('link', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);

    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/new$/, { timeout: 15_000 });
  });

  test('suppression de compte RGPD depuis les reglages', async ({ page }) => {
    await registerAccount(page, 'DeleteE2E');

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    await page.getByLabel('Saisissez votre mot de passe pour confirmer').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(page).toHaveURL(/\/decouvrir/, { timeout: 15_000 });

    await page.goto('/new');
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole('main').getByRole('link', { name: 'Se connecter' })).toBeVisible();
  });
});
