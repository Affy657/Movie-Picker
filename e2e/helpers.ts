import { type Page } from '@playwright/test';

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

export async function registerAccount(page: Page, displayName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Pseudo').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail(asciiSlug(displayName)));
  await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
}
