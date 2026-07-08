import { test, expect, type BrowserContext } from '@playwright/test';
import { registerAccount } from './helpers';

test.describe('Parcours critique', () => {
  test('inscription hôte → création soirée → invité rejoint → propose un film → hôte lance la roue', async ({
    browser,
  }) => {
    let hostContext: BrowserContext | undefined;
    let guestContext: BrowserContext | undefined;

    try {
      hostContext = await browser.newContext({ locale: 'fr-FR' });
      guestContext = await browser.newContext({ locale: 'fr-FR' });
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await registerAccount(hostPage, 'HôteE2E');

      await hostPage.goto('/new');
      const titleInput = hostPage.getByLabel(/^titre$/i);
      await titleInput.fill('Soirée E2E Playwright');
      await expect(titleInput).toHaveValue('Soirée E2E Playwright');
      await hostPage.getByLabel(/^date$/i).fill('2030-12-20');
      await hostPage.getByLabel(/^heure$/i).fill('20:30');
      await hostPage.getByRole('button', { name: /créer la soirée/i }).click();

      await expect(hostPage).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });
      const slug = hostPage.url().match(/\/e\/([^/?]+)/)?.[1];
      expect(slug).toBeTruthy();
      await expect(hostPage.getByRole('region', { name: 'Films proposés' })).toBeVisible();

      await registerAccount(guestPage, 'InvitéE2E');
      await guestPage.goto(`/e/${slug}`);
      await guestPage.getByRole('button', { name: /^rejoindre$/i }).click();
      await expect(guestPage.getByRole('region', { name: 'Films proposés' })).toBeVisible();

      const guestSearch = guestPage.getByRole('combobox', { name: /proposer un film/i });
      await guestSearch.fill('stub');
      const stubResult = guestPage.getByRole('listitem').filter({ hasText: /film e2e stub/i });
      await expect(stubResult).toBeVisible({ timeout: 15_000 });
      await stubResult.getByRole('button', { name: /^ajouter$/i }).click();
      await expect(guestSearch).toHaveValue('', { timeout: 15_000 });

      await hostPage.reload();
      await expect(hostPage.getByText(/film e2e stub/i).first()).toBeVisible({ timeout: 15_000 });

      await hostPage.getByRole('button', { name: /lancer la roue/i }).click();
      await expect(hostPage.getByText(/film sélectionné/i)).toBeVisible({ timeout: 15_000 });
      await hostPage.getByRole('button', { name: 'Fermer', exact: true }).click();
      await expect(hostPage.getByText(/film gagnant/i)).toBeVisible();
    } finally {
      await hostContext?.close();
      await guestContext?.close();
    }
  });

  test('une page protégée redirige les visiteurs non connectés vers la connexion', async ({
    page,
  }) => {
    await page.goto('/new');
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });
});
