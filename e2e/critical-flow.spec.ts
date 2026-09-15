import { test, expect, type BrowserContext } from '@playwright/test';
import {
  addStubMovie,
  fillCreateEventForm,
  registerAccount,
  spinWheelAndDismissWinner,
} from './helpers';

test.describe('Critical journey', () => {
  test('host signs up, creates a movie night, a guest joins and proposes a film, the host spins the wheel', async ({
    browser,
  }) => {
    let hostContext: BrowserContext | undefined;
    let guestContext: BrowserContext | undefined;

    try {
      test.setTimeout(150_000);
      hostContext = await browser.newContext({ locale: 'fr-FR' });
      guestContext = await browser.newContext({ locale: 'fr-FR' });
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await registerAccount(hostPage, 'HôteE2E');

      await hostPage.goto('/new');
      await fillCreateEventForm(hostPage, 'Soirée E2E Playwright');

      await expect(hostPage).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });
      const slug = hostPage.url().match(/\/e\/([^/?]+)/)?.[1];
      expect(slug).toBeTruthy();
      await expect(hostPage.getByRole('region', { name: 'Films proposés' })).toBeVisible();

      await registerAccount(guestPage, 'InvitéE2E');
      await guestPage.goto(`/e/${slug}`);
      await guestPage.getByRole('button', { name: /^rejoindre$/i }).click();
      await expect(guestPage.getByRole('region', { name: 'Films proposés' })).toBeVisible();

      await addStubMovie(guestPage);

      await hostPage.reload();
      await expect(hostPage.getByText(/film e2e stub/i).first()).toBeVisible({ timeout: 15_000 });

      await spinWheelAndDismissWinner(hostPage);
    } finally {
      await hostContext?.close();
      await guestContext?.close();
    }
  });

  test('an account-only page stays open to signed-out visitors, with a sign-in call to action', async ({
    page,
  }) => {
    await page.goto('/new');
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole('main').getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Créer un compte' })
    ).toBeVisible();
  });
});
