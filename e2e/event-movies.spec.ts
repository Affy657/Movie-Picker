import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  addStubMovie,
  createEvent,
  OTHER_STUB_MOVIE,
  registerAccount,
  STUB_MOVIE,
} from './helpers';

function movieMenu(page: Page, title: string) {
  return page.getByRole('button', { name: new RegExp(`plus d.actions pour « ${title} »`, 'i') });
}

test.describe('Proposals (host)', () => {
  test('marks a film as seen, sets one aside from the draw, then removes it', async ({ page }) => {
    test.setTimeout(120_000);
    await registerAccount(page, 'HoteFilms');
    await createEvent(page, 'Soirée films E2E');
    await addStubMovie(page, STUB_MOVIE);
    await addStubMovie(page, OTHER_STUB_MOVIE);
    await expect(page.getByText('2 films')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `Marquer « déjà vu » pour ${STUB_MOVIE}` }).click();
    const unmark = page.getByRole('button', { name: `Retirer « déjà vu » pour ${STUB_MOVIE}` });
    await expect(unmark).toBeVisible({ timeout: 15_000 });
    await expect(unmark).toHaveAttribute('aria-pressed', 'true');

    await movieMenu(page, OTHER_STUB_MOVIE).click();
    await page.getByRole('menuitem', { name: 'Exclure du tirage' }).click();
    await expect(page.getByText('Hors tirage')).toBeVisible({ timeout: 15_000 });

    await movieMenu(page, OTHER_STUB_MOVIE).click();
    await page.getByRole('menuitem', { name: 'Réintégrer au tirage' }).click();
    await expect(page.getByText('Hors tirage')).toBeHidden({ timeout: 15_000 });

    await movieMenu(page, OTHER_STUB_MOVIE).click();
    await page.getByRole('menuitem', { name: `Retirer ${OTHER_STUB_MOVIE}` }).click();
    const confirm = page.getByRole('dialog', { name: 'Retirer ce film de la soirée ?' });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(OTHER_STUB_MOVIE);
    await confirm.getByRole('button', { name: 'Retirer le film' }).click();

    await expect(page.getByText('1 film', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(OTHER_STUB_MOVIE)).toBeHidden();
    await expect(page.getByText(STUB_MOVIE).first()).toBeVisible();
  });
});

test.describe('Guest on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('joins, proposes a film and votes from the list layout', async ({ browser, page }) => {
    test.setTimeout(150_000);
    let hostContext: BrowserContext | undefined;

    try {
      hostContext = await browser.newContext({ locale: 'fr-FR' });
      const hostPage = await hostContext.newPage();
      await registerAccount(hostPage, 'HoteMobile');
      const slug = await createEvent(hostPage, 'Soirée mobile E2E');

      await registerAccount(page, 'InviteMobile');
      await page.goto(`/e/${slug}`);
      await page.getByRole('button', { name: /^rejoindre$/i }).click();
      await expect(page.getByRole('region', { name: 'Films proposés' })).toBeVisible({
        timeout: 15_000,
      });
      await addStubMovie(page);

      await page.getByRole('button', { name: `Voter pour ${STUB_MOVIE}` }).click();
      await expect(
        page.getByRole('button', { name: `Retirer mon vote pour « ${STUB_MOVIE} »` })
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('1 votant sur 2')).toBeVisible();

      await expect(page.getByRole('toolbar', { name: /mode d.affichage/i })).toBeHidden();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await hostPage.reload();
      await expect(hostPage.getByText(STUB_MOVIE).first()).toBeVisible({ timeout: 15_000 });
      await expect(hostPage.getByText('1 votant sur 2')).toBeVisible();
    } finally {
      await hostContext?.close();
    }
  });
});
