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

const MONTHS_TO_SEARCH = 30;

async function pickNightStart(page: Page, date: string, time: string): Promise<void> {
  const dayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
  await page
    .getByRole('dialog', { name: 'Nouvelle soirée' })
    .getByRole('button', { name: /^date et heure/i })
    .click();
  const sheet = page.getByRole('dialog', { name: 'Date et heure' });
  const picker = page.getByRole('group', { name: 'Date et heure' }).or(sheet);
  await expect(picker).toBeVisible();
  const day = picker.getByRole('button', { name: dayLabel, exact: true });
  const towards = date < isoDateDaysFromNow(0) ? 'Mois précédent' : 'Mois suivant';
  for (let month = 0; month < MONTHS_TO_SEARCH && !(await day.isVisible()); month += 1) {
    await picker.getByRole('button', { name: towards }).click();
  }
  await day.click();
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: time, exact: true }).click();
    await sheet.getByRole('button', { name: 'Valider' }).click();
    await expect(sheet).toBeHidden();
    return;
  }
  await picker.getByRole('textbox', { name: 'Heure' }).fill(time);
  await picker.getByRole('textbox', { name: 'Heure' }).press('Enter');
  await expect(picker).toBeHidden();
}

export async function fillCreateEventForm(
  page: Page,
  title: string,
  date = isoDateDaysFromNow(365)
): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Nouvelle soirée' });
  await pickNightStart(page, date, '20:30');
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
  await expect(winnerMarker(page).first()).toBeVisible({ timeout: 15_000 });
}

export function winnerMarker(page: Page) {
  const films = page.getByRole('region', { name: 'Films proposés' });
  return films
    .getByRole('img', { name: 'Film gagnant' })
    .or(films.getByText('Film gagnant', { exact: true }));
}

export async function registerAccount(page: Page, displayName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Nom affiché').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail(asciiSlug(displayName)));
  await page.getByLabel('Mot de passe', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
  await page
    .getByRole('button', { name: 'Menu du compte' })
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
}
