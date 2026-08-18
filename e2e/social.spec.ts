import { test, expect, type BrowserContext } from '@playwright/test';
import { registerAccount } from './helpers';

test.describe('Parcours social (suivre puis inviter)', () => {
  test("un hote suit un ami puis l'invite a sa soiree", async ({ browser }) => {
    let ctxA: BrowserContext | undefined;
    let ctxB: BrowserContext | undefined;

    try {
      ctxA = await browser.newContext({ locale: 'fr-FR' });
      ctxB = await browser.newContext({ locale: 'fr-FR' });
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      await registerAccount(pageB, 'AmiE2E');
      await pageB.getByRole('button', { name: 'Menu du compte' }).click();
      await pageB.getByRole('link', { name: 'Voir mon profil public' }).click();
      await pageB.waitForURL(/\/u\/[^/?]+/);
      const profilePath = new URL(pageB.url()).pathname;

      await registerAccount(pageA, 'HoteSocial');
      await pageA.goto(profilePath);
      await pageA.getByRole('button', { name: 'Suivre' }).click();
      await expect(pageA.getByRole('button', { name: 'Ne plus suivre' })).toBeVisible({
        timeout: 15_000,
      });

      await pageA.goto('/new');
      await pageA.getByLabel(/^titre$/i).fill('Soirée social E2E');
      await pageA.getByLabel(/^date$/i).fill('2030-12-20');
      await pageA.getByLabel(/^heure$/i).fill('20:30');
      await pageA.getByRole('button', { name: /créer la soirée/i }).click();
      await expect(pageA).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });

      await pageA.getByRole('button', { name: 'Inviter' }).click();
      await pageA.getByRole('button', { name: 'Inviter des amis' }).click();
      await expect(pageA.getByRole('heading', { name: 'Inviter des amis' })).toBeVisible();
      const inviteBtn = pageA.getByRole('button', { name: /inviter amie2e/i });
      await expect(inviteBtn).toBeVisible({ timeout: 15_000 });
      await inviteBtn.click();
      await expect(pageA.getByText('Invité ✓')).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctxA?.close();
      await ctxB?.close();
    }
  });
});
