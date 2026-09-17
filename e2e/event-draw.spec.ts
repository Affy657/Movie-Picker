import { test, expect } from '@playwright/test';
import {
  addStubMovie,
  createEvent,
  isoDateDaysFromNow,
  registerAccount,
  STUB_MOVIE,
} from './helpers';

test.describe('Draw (host)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('names the winner by hand, then takes it out of the results', async ({ page }) => {
    test.setTimeout(120_000);
    await registerAccount(page, 'HoteChoix');
    await createEvent(page, 'Soirée choix manuel E2E');
    await addStubMovie(page);

    await page.getByRole('button', { name: /choisir moi-même/i }).click();
    await expect(page.getByText(/choisissez le film à désigner gagnant/i)).toBeVisible();
    await page
      .getByRole('button', { name: `${STUB_MOVIE} : désigner ce film comme gagnant` })
      .click();

    const dialog = page.getByRole('dialog').filter({ hasText: /film choisi par l.hôte/i });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByRole('button', { name: /c.est parti/i }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole('region', { name: /ce soir, vous regardez/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Film gagnant désigné')).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Films proposés' })
        .getByText('Film gagnant', { exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Autres actions sur le tirage' }).click();
    await page.getByRole('menuitem', { name: 'Retirer un gagnant' }).click();
    await expect(page.getByText(/choisissez le film gagnant à retirer/i)).toBeVisible();
    await page.getByRole('button', { name: `${STUB_MOVIE} : retirer ce film du palmarès` }).click();

    await expect(page.getByRole('button', { name: 'Lancer la roue' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('region', { name: /ce soir, vous regardez/i })).toBeHidden();
    await expect(page.getByText('Film gagnant', { exact: true })).toBeHidden();
  });

  test('closes a night whose time has passed without picking a movie', async ({ page }) => {
    test.setTimeout(120_000);
    await registerAccount(page, 'HoteSuspens');
    await createEvent(page, 'Soirée en suspens E2E', isoDateDaysFromNow(-2));

    const banner = page.getByRole('status', { name: 'En suspens' });
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText(/aucun film n.a été choisi/i);
    await expect(page.getByRole('button', { name: 'Lancer la roue' })).toBeHidden();

    await banner.getByRole('button', { name: 'Clôturer sans film' }).click();
    const confirm = page.getByRole('dialog', { name: /clôturer sans choisir de film/i });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText('Soirée en suspens E2E');
    await confirm.getByRole('button', { name: 'Clôturer sans film' }).click();

    await expect(page.getByText("Aucun film n'a été choisi")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/la soirée est clôturée/i)).toBeVisible();
    await expect(banner).toBeHidden();
    await expect(page.getByRole('button', { name: /proposer un film/i })).toBeHidden();
  });
});
