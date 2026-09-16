import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createEvent, registerAccount } from './helpers';

async function joinEvent(page: Page, slug: string): Promise<void> {
  await page.goto(`/e/${slug}`);
  await page.getByRole('button', { name: /^rejoindre$/i }).click();
  await expect(page.getByRole('region', { name: 'Films proposés' })).toBeVisible({
    timeout: 15_000,
  });
}

async function openParticipants(page: Page): Promise<void> {
  await page.locator('[data-participants-toggle]').click();
  await expect(page.getByTestId('event-participants')).toBeVisible();
}

test.describe('Event management', () => {
  test('the host removes a guest, the guest comes back and leaves on their own', async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    let hostContext: BrowserContext | undefined;
    let guestContext: BrowserContext | undefined;

    try {
      hostContext = await browser.newContext({ locale: 'fr-FR' });
      guestContext = await browser.newContext({ locale: 'fr-FR' });
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await registerAccount(hostPage, 'HoteGestion');
      const slug = await createEvent(hostPage, 'Soirée gestion E2E');

      await registerAccount(guestPage, 'InviteGestion');
      await joinEvent(guestPage, slug);

      await hostPage.reload();
      await openParticipants(hostPage);
      await hostPage.getByTestId('manage-participants-toggle').click();
      await hostPage.getByRole('button', { name: 'Retirer InviteGestion de la soirée' }).click();
      const removeDialog = hostPage.getByRole('dialog', { name: 'Retirer un participant' });
      await expect(removeDialog).toBeVisible();
      await removeDialog.getByRole('button', { name: 'Retirer', exact: true }).click();
      await expect(hostPage.getByTestId('participants-action-success')).toContainText(
        'InviteGestion a été retiré(e) de la soirée.',
        { timeout: 15_000 }
      );
      await expect(hostPage.getByTestId('event-participants')).not.toContainText('InviteGestion');

      await guestPage.reload();
      await expect(guestPage.getByRole('button', { name: /^rejoindre$/i })).toBeVisible({
        timeout: 15_000,
      });

      await joinEvent(guestPage, slug);
      await openParticipants(guestPage);
      await guestPage.getByTestId('leave-event-button').click();
      const leaveDialog = guestPage.getByRole('dialog', { name: 'Quitter la soirée' });
      await expect(leaveDialog).toBeVisible();
      await leaveDialog.getByRole('button', { name: 'Quitter', exact: true }).click();
      await expect(guestPage).toHaveURL(/\/my-events$/, { timeout: 15_000 });

      await guestPage.goto(`/e/${slug}`);
      await expect(guestPage.getByRole('button', { name: /^rejoindre$/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(guestPage.getByRole('button', { name: /proposer un film/i })).toBeHidden();
    } finally {
      await hostContext?.close();
      await guestContext?.close();
    }
  });

  test('the host renames the night, caps it to one seat, then deletes it', async ({ browser }) => {
    test.setTimeout(150_000);
    let hostContext: BrowserContext | undefined;
    let guestContext: BrowserContext | undefined;

    try {
      hostContext = await browser.newContext({ locale: 'fr-FR' });
      guestContext = await browser.newContext({ locale: 'fr-FR' });
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await registerAccount(hostPage, 'HoteReglages');
      const slug = await createEvent(hostPage, 'Soirée réglages E2E');

      await hostPage.getByRole('button', { name: 'Paramètres de la soirée' }).click();
      const settings = hostPage.getByRole('dialog', { name: 'Paramètres de la soirée' });
      await expect(settings).toBeVisible();

      const saved = settings.getByText('Enregistré', { exact: true });
      await settings.locator('#host-cfg-title').fill('Soirée renommée E2E');
      await expect(settings.getByText('Enregistrement…')).toBeVisible();
      await expect(saved).toBeVisible({ timeout: 15_000 });
      await settings.locator('#host-cfg-max-participants').fill('1');
      await expect(settings.getByText('Enregistrement…')).toBeVisible();
      await expect(saved).toBeVisible({ timeout: 15_000 });
      await settings.getByRole('button', { name: /^fermer$/i }).click();
      await expect(settings).toBeHidden();
      await expect(hostPage.getByRole('heading', { name: 'Soirée renommée E2E' })).toBeVisible();

      await registerAccount(guestPage, 'InviteReglages');
      await guestPage.goto(`/e/${slug}`);
      await expect(guestPage.getByRole('heading', { name: 'Soirée complète' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(guestPage.getByText(/1 participants? maximum/i)).toBeVisible();
      await expect(guestPage.getByRole('button', { name: /^rejoindre$/i })).toBeHidden();

      await hostPage.getByRole('button', { name: 'Paramètres de la soirée' }).click();
      await hostPage.getByTestId('delete-event-button').click();
      const deleteDialog = hostPage.getByTestId('delete-event-confirm-dialog');
      await expect(deleteDialog).toBeVisible();
      await expect(deleteDialog).toContainText('Soirée renommée E2E');
      await hostPage.getByTestId('delete-event-confirm-dialog-confirm').click();
      await expect(hostPage).toHaveURL(/\/my-events$/, { timeout: 15_000 });
      await expect(hostPage.getByRole('heading', { name: 'Mes soirées' })).toBeVisible();
      await expect(hostPage.getByText('Soirée renommée E2E')).toHaveCount(0);

      await guestPage.reload();
      await expect(
        guestPage.getByText("Cette soirée n'existe pas ou a été supprimée.")
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await hostContext?.close();
      await guestContext?.close();
    }
  });
});
