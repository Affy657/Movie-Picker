import type { LocaleCode } from '@/shared/i18n';

export const BOOT_FAILURE_COPY: Record<LocaleCode, { message: string; reloadButton: string }> = {
  fr: {
    message: 'Movie Picker n’a pas pu démarrer. Rechargez la page pour réessayer.',
    reloadButton: 'Recharger la page',
  },
  en: {
    message: 'Movie Picker could not start. Reload the page to try again.',
    reloadButton: 'Reload the page',
  },
};

export function showBootFailure(
  root: HTMLElement | null,
  locale: LocaleCode,
  reload: () => void = () => window.location.reload()
): void {
  if (!root) return;
  const copy = BOOT_FAILURE_COPY[locale];
  const message = document.createElement('p');
  message.textContent = copy.message;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = copy.reloadButton;
  button.addEventListener('click', () => reload());
  const panel = document.createElement('div');
  panel.className = 'boot-failure';
  panel.setAttribute('role', 'alert');
  panel.append(message, button);
  root.prepend(panel);
}
