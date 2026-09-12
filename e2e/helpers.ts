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

export async function fillCreateEventForm(page: Page, title: string): Promise<void> {
  await page.locator('#create-title').fill(title);
  await page.locator('#create-date').fill('2030-12-20');
  await page.locator('#create-time').fill('20:30');
  await page.getByRole('button', { name: /créer la soirée/i }).click();
}

export async function addStubMovie(page: Page): Promise<void> {
  await page.getByRole('button', { name: /proposer un film/i }).click();
  const search = page.getByRole('combobox', { name: /proposer un film/i });
  await search.fill('stub');
  const result = page.getByRole('listitem').filter({ hasText: /film e2e stub/i });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.getByRole('button', { name: /^ajouter$/i }).click();
  await expect(search).toHaveValue('', { timeout: 15_000 });
  await page
    .getByRole('heading', { name: /proposer un film/i })
    .locator('..')
    .getByRole('button', { name: /^fermer$/i })
    .click();
  await expect(search).toBeHidden();
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
  await dismissWhatsNewModal(page);
}

export async function dismissWhatsNewModal(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: 'Menu du compte' })
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  const modal = page.getByRole('dialog', { name: /quoi de neuf/i });
  const appeared = await modal
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;
  await modal.getByRole('button', { name: /c.est noté/i }).click();
  await modal.waitFor({ state: 'hidden', timeout: 5000 });
}
