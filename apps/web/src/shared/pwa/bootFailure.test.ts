import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/i18n/locales/en';
import { fr } from '@/shared/i18n/locales/fr';
import { BOOT_FAILURE_COPY, showBootFailure } from '@/shared/pwa/bootFailure';

function emptyRoot(): HTMLElement {
  return document.createElement('div');
}

describe('showBootFailure', () => {
  it('words the failure in the language of the visitor', () => {
    const root = emptyRoot();

    showBootFailure(root, 'en');

    expect(root.querySelector('[role="alert"]')).toHaveTextContent(en.errors.boot.message);
  });

  it('offers a reload', () => {
    const root = emptyRoot();
    const reload = vi.fn();

    showBootFailure(root, 'fr', reload);
    root.querySelector('button')?.click();

    expect(root.querySelector('button')).toHaveTextContent(fr.errors.boot.reloadButton);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('leaves the prerendered page readable under the message', () => {
    const root = emptyRoot();
    root.innerHTML = '<h1>Soutenir le projet</h1>';

    showBootFailure(root, 'fr');

    expect(root.querySelector('h1')).toHaveTextContent('Soutenir le projet');
    expect(root.firstElementChild).toHaveAttribute('role', 'alert');
  });

  it('does nothing without a root', () => {
    expect(() => showBootFailure(null, 'fr')).not.toThrow();
  });
});

describe('BOOT_FAILURE_COPY', () => {
  it('repeats the locales word for word, it has to work when they failed to load', () => {
    expect(BOOT_FAILURE_COPY.fr).toEqual(fr.errors.boot);
    expect(BOOT_FAILURE_COPY.en).toEqual(en.errors.boot);
  });
});
