import { afterEach, describe, expect, it } from 'vitest';

import { en } from '@/shared/i18n/locales/en';
import { fr } from '@/shared/i18n/locales/fr';
import { BOOT_FAILURE_COPY } from '@/shared/pwa/bootFailure';

import indexHtml from '../index.html?raw';

function entryFailureScript(): string {
  const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
  const scripts = [...parsed.querySelectorAll('script')]
    .filter((element) => element.attributes.length === 0)
    .map((element) => element.textContent ?? '');
  const script = scripts.find((code) => code.includes("addEventListener('error'"));
  expect(script).toBeDefined();
  return script!;
}

function startShell(lang: 'fr' | 'en'): { splash: HTMLElement; root: HTMLElement } {
  document.documentElement.lang = lang;
  document.body.innerHTML = '<div id="splash"></div><div id="root"></div>';
  new Function(entryFailureScript())();
  return {
    splash: document.getElementById('splash')!,
    root: document.getElementById('root')!,
  };
}

function failToLoad(element: HTMLElement): void {
  document.body.append(element);
  element.dispatchEvent(new Event('error'));
}

function moduleScript(): HTMLScriptElement {
  const script = document.createElement('script');
  script.type = 'module';
  return script;
}

describe('entry graph failure fallback', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.lang = 'fr';
  });

  it.each(['fr', 'en'] as const)(
    'replaces the splash with the reload panel when the entry module fails, in %s',
    (lang) => {
      const { root } = startShell(lang);

      failToLoad(moduleScript());

      expect(document.getElementById('splash')).toBeNull();
      const panel = root.querySelector('.boot-failure');
      expect(panel).toHaveAttribute('role', 'alert');
      expect(panel?.querySelector('p')).toHaveTextContent(BOOT_FAILURE_COPY[lang].message);
      expect(panel?.querySelector('button')).toHaveTextContent(
        BOOT_FAILURE_COPY[lang].reloadButton
      );
    }
  );

  it('keeps the splash when another resource fails', () => {
    const { root } = startShell('fr');

    failToLoad(document.createElement('img'));
    failToLoad(document.createElement('script'));

    expect(document.getElementById('splash')).not.toBeNull();
    expect(root).toBeEmptyDOMElement();
  });

  it('leaves a mounted application alone', () => {
    const { root } = startShell('fr');
    root.innerHTML = '<main>app</main>';

    failToLoad(moduleScript());

    expect(root.querySelector('.boot-failure')).toBeNull();
    expect(document.getElementById('splash')).not.toBeNull();
  });
});

describe('coquille de demarrage', () => {
  it('reprend mot pour mot le titre de la page d accueil dans les deux langues', () => {
    expect(indexHtml).toContain(fr.home.title);
    expect(indexHtml).toContain(en.home.title);
  });

  it('ne pose la coquille que sur la route racine', () => {
    expect(indexHtml).toContain("location.pathname === '/'");
  });

  it('reprend la cle de stockage et la langue par defaut de preferredLocale', () => {
    expect(indexHtml).toContain("localStorage.getItem('moviepicker-locale')");
    expect(indexHtml).toContain("stored === 'en' ? 'en' : 'fr'");
    expect(indexHtml).not.toContain('navigator.language');
  });

  it('titre la coquille comme la page d accueil, en francais', () => {
    expect(indexHtml).toContain(`<title>${fr.home.seoTitle}</title>`);
    expect(indexHtml).toContain(`<meta property="og:title" content="${fr.home.seoTitle}" />`);
  });
});
