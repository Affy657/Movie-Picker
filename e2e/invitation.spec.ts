import { test, expect, type BrowserContext } from '@playwright/test';
import {
  STUB_MOVIE,
  TEST_PASSWORD,
  addStubMovie,
  asciiSlug,
  createEvent,
  registerAccount,
  uniqueEmail,
} from './helpers';

test.describe('Invitation to a movie night', () => {
  test('a guest without an account votes, creates one from the card and comes back joined', async ({
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

      await registerAccount(hostPage, 'HôteInvit');
      const slug = await createEvent(hostPage, 'Soirée invitation E2E');
      await addStubMovie(hostPage);

      await guestPage.goto(`/e/${slug}`);
      const card = guestPage.getByRole('region', { name: 'Rejoindre la soirée' });
      await expect(
        card.getByText('HôteInvit vous invite à « Soirée invitation E2E ».')
      ).toBeVisible();

      await guestPage
        .getByRole('button', { name: new RegExp(`voter pour ${STUB_MOVIE}`, 'i') })
        .first()
        .click();
      await expect(card.getByRole('status')).toHaveText('Pour voter, rejoignez d’abord la soirée.');

      const register = card.getByRole('link', { name: 'Créer un compte' });
      await expect(card.getByRole('link', { name: 'J’ai déjà un compte' })).toBeVisible();
      await register.click();
      await expect(guestPage).toHaveURL(/\/register\?returnTo=/);

      await guestPage.getByLabel('Pseudo').fill('InvitéE2E');
      await guestPage
        .getByLabel('E-mail', { exact: true })
        .fill(uniqueEmail(asciiSlug('InvitéE2E')));
      await guestPage.getByLabel('Mot de passe').fill(TEST_PASSWORD);
      await guestPage.getByRole('button', { name: 'Créer mon compte' }).click();

      await expect(
        guestPage.getByRole('region', { name: 'Vous avez rejoint la soirée' })
      ).toBeVisible({ timeout: 15_000 });
      await expect(guestPage).toHaveURL(new RegExp(`/e/${slug}$`));
      await expect(guestPage.getByRole('heading', { name: 'Rejoindre la soirée' })).toBeHidden();

      await hostPage.reload();
      await hostPage.getByTestId('participants-toggle').click();
      await expect(hostPage.getByRole('dialog').getByText('InvitéE2E')).toBeVisible();
    } finally {
      await hostContext?.close();
      await guestContext?.close();
    }
  });
});
