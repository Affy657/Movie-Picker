import { expect, type Page } from '@playwright/test';

export const TEST_PASSWORD = 'MoviePicker1';

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@e2e.test`;
}

export function asciiSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase() || 'user'
  );
}

export const STUB_MOVIE = 'Film E2E Stub';
export const OTHER_STUB_MOVIE = 'Autre film test';

export function isoDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function fillCreateEventForm(
  page: Page,
  title: string,
  date = '2030-12-20'
): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Nouvelle soirée' });
  await dialog.getByRole('radio', { name: /autre date/i }).click();
  await dialog.locator('#create-date').fill(date);
  await dialog.getByRole('radio', { name: 'Autre', exact: true }).click();
  await dialog.locator('#create-time').fill('20:30');
  await dialog.locator('#create-title').fill(title);
  await dialog.getByRole('button', { name: /créer la soirée/i }).click();
  await page
    .getByRole('dialog', { name: 'Soirée créée' })
    .getByRole('button', { name: 'Ouvrir la soirée' })
    .click();
}

export async function createEvent(page: Page, title: string, date?: string): Promise<string> {
  await page.goto('/new');
  await fillCreateEventForm(page, title, date);
  await expect(page).toHaveURL(/\/e\/[^/?]+/, { timeout: 15_000 });
  const slug = page.url().match(/\/e\/([^/?]+)/)?.[1];
  if (!slug) throw new Error('event slug not found in url');
  return slug;
}

export async function addStubMovie(page: Page, title: string = STUB_MOVIE): Promise<void> {
  await page.getByRole('button', { name: /proposer un film/i }).click();
  const dialog = page.getByRole('dialog', { name: /proposer un film/i });
  const search = dialog.getByRole('searchbox', { name: /chercher un film/i });
  await search.fill('stub');
  const result = dialog
    .getByRole('list', { name: /résultats de la recherche/i })
    .getByRole('listitem')
    .filter({ hasText: title });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.getByRole('button', { name: /^proposer « /i }).click();
  await expect(dialog.getByText(/est proposé à la soirée/i)).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: /^terminé$/i }).click();
  await expect(dialog).toBeHidden();
}

export async function spinWheelAndDismissWinner(page: Page): Promise<void> {
  await page.getByRole('button', { name: /lancer la roue/i }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: /film sélectionné/i });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole('button', { name: /c.est parti/i }).click();
  const winnerBadge = page
    .getByRole('region', { name: 'Films proposés' })
    .getByText('Film gagnant', { exact: true });
  await expect(winnerBadge.first()).toBeVisible({ timeout: 15_000 });
}

export async function registerAccount(page: Page, displayName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Pseudo').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail(asciiSlug(displayName)));
  await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
  await page
    .getByRole('button', { name: 'Menu du compte' })
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
}
