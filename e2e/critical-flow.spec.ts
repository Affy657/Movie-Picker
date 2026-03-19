import { test, expect } from '@playwright/test';

test.describe('Parcours critique', () => {
  test('créer soirée → invité rejoint → propose film → hôte lance la roue', async ({ browser }) => {
    const hostPage = await browser.newPage();
    const guestPage = await browser.newPage();

    await hostPage.goto('/new');
    await hostPage.getByLabel(/^titre$/i).fill('E2E Playwright');
    await hostPage.getByLabel(/^date$/i).fill('2030-12-20');
    await hostPage.getByLabel(/^heure$/i).fill('20:30');
    await hostPage.getByRole('button', { name: /créer la soirée/i }).click();

    await expect(hostPage).toHaveURL(/\/s\/[^/?]+\?host=/);
    const slugMatch = hostPage.url().match(/\/s\/([^/?]+)/);
    expect(slugMatch).toBeTruthy();
    const slug = slugMatch![1];

    await hostPage.getByPlaceholder(/alice/i).fill('HôteE2E');
    await hostPage.getByRole('button', { name: /rejoindre/i }).click();
    await expect(hostPage.getByRole('heading', { name: /^films$/i })).toBeVisible();

    await guestPage.goto(`/s/${slug}`);
    await guestPage.getByPlaceholder(/alice/i).fill('InvitéE2E');
    await guestPage.getByRole('button', { name: /rejoindre/i }).click();
    await expect(guestPage.getByRole('heading', { name: /^films$/i })).toBeVisible();

    await guestPage.getByPlaceholder(/rechercher un film/i).fill('stub');
    await guestPage.getByRole('button', { name: /^rechercher$/i }).click();
    await expect(guestPage.getByText(/film e2e stub/i)).toBeVisible();
    await guestPage
      .getByRole('button', { name: /^ajouter$/i })
      .first()
      .click();

    await expect(hostPage.getByText(/film e2e stub/i)).toBeVisible({ timeout: 15_000 });

    await hostPage.getByRole('button', { name: /lancer la roue/i }).click();
    await expect(hostPage.getByText(/film gagnant/i)).toBeVisible({ timeout: 15_000 });

    await hostPage.close();
    await guestPage.close();
  });
});
