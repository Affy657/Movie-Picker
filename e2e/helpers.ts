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

export async function fillCreateEventForm(page: Page, title: string): Promise<void> {
  await page.locator('#create-title').fill(title);
  await page.locator('#create-date').fill('2030-12-20');
  await page.locator('#create-time').fill('20:30');
  await page.getByRole('button', { name: /créer la soirée/i }).click();
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

/**
 * La modale "Quoi de neuf ?" s'ouvre automatiquement à la première connexion
 * d'un compte (voir useWhatsNew) et intercepte les clics tant qu'elle est ouverte.
 * Chaque nouveau compte e2e étant un utilisateur inédit, elle apparaît à chaque fois.
 */
export async function dismissWhatsNewModal(page: Page): Promise<void> {
  // La modale se déclenche une fois l'utilisateur résolu par AuthContext, pas
  // au moment du changement d'URL : attendre un repère fiable de session active
  // avant de conclure trop vite qu'elle ne va pas s'afficher.
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
