import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = 'MoviePicker1';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@e2e.test`;
}

function asciiSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase() || 'user'
  );
}

async function registerAccount(page: Page, displayName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Pseudo').fill(displayName);
  await page.getByLabel('E-mail').fill(uniqueEmail(asciiSlug(displayName)));
  await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
}

test.describe('Parcours critique', () => {
  test('inscription hôte → création soirée → invité rejoint → propose un film → hôte lance la roue', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ locale: 'fr-FR' });
    const guestContext = await browser.newContext({ locale: 'fr-FR' });
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await registerAccount(hostPage, 'HôteE2E');

      await hostPage.goto('/new');
      const titleInput = hostPage.getByLabel(/^titre$/i);
      await expect(titleInput).toHaveValue(/.+/);
      await titleInput.fill('Soirée E2E Playwright');
      await hostPage.getByLabel(/^date$/i).fill('2030-12-20');
      await hostPage.getByLabel(/^heure$/i).fill('20:30');
      await hostPage.getByRole('button', { name: /créer la soirée/i }).click();

      await expect(hostPage).toHaveURL(/\/e\/[^/?]+/);
      const slug = hostPage.url().match(/\/e\/([^/?]+)/)?.[1];
      expect(slug).toBeTruthy();
      await expect(hostPage.getByRole('heading', { name: /^films$/i })).toBeVisible();

      await registerAccount(guestPage, 'InvitéE2E');
      await guestPage.goto(`/e/${slug}`);
      await guestPage.getByRole('button', { name: /^rejoindre$/i }).click();
      await expect(guestPage.getByRole('heading', { name: /^films$/i })).toBeVisible();

      const guestSearch = guestPage.getByPlaceholder(/rechercher un film/i);
      await guestSearch.fill('stub');
      await expect(guestPage.getByText(/film e2e stub/i).first()).toBeVisible();
      await guestPage
        .getByRole('button', { name: /^ajouter$/i })
        .first()
        .click();
      await expect(guestSearch).toHaveValue('');

      await hostPage.reload();
      await expect(hostPage.getByText(/film e2e stub/i).first()).toBeVisible({ timeout: 15_000 });

      await hostPage.getByRole('button', { name: /lancer la roue/i }).click();
      const closeWheelButton = hostPage.getByRole('button', { name: /c.?est parti/i });
      await expect(closeWheelButton).toBeVisible({ timeout: 15_000 });
      await closeWheelButton.click();
      await expect(hostPage.getByText(/film gagnant/i)).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
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
