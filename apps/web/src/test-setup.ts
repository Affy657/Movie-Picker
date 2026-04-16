import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

/** jsdom : `getComputedStyle(elt, pseudoElt)` n'est pas implémenté ; axe l'utilise pour le contraste. */
const getComputedStyleOrig = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, _pseudoElt?: string | null): CSSStyleDeclaration =>
  getComputedStyleOrig(elt);

/**
 * axe-core appelle `getContext('2d')` pour analyser le contraste ; jsdom ne l'implémente pas.
 * Stub minimal sans dépendance native `canvas`.
 */
const canvas2dStub = {
  measureText: () => ({ width: 0 }),
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = function mockCanvasGetContext(
  ...args: Parameters<HTMLCanvasElement['getContext']>
) {
  const [contextId] = args;
  if (contextId === '2d') return canvas2dStub;
  return null;
} as HTMLCanvasElement['getContext'];

/** i18n : forcer la locale FR par défaut en test (JSDOM expose navigator.language = "en"). */
localStorage.setItem('moviepicker-locale', 'fr');

/**
 * Les tests montent directement `AuthProvider` qui probe `/auth/me`. En prod
 * cette requête est court-circuitée si `mp.session-hint` est absent (pour
 * éviter le 401 en console, cf. `features/auth/session-hint`). En test on pose
 * le flag avant chaque test pour laisser MSW / les mocks répondre (200 ou 401
 * selon le scénario) — un test 401 efface l'indice et sans ce reset le test
 * suivant court-circuiterait la probe.
 */
beforeEach(() => {
  localStorage.setItem('mp.session-hint', '1');
});

/** ThemeProvider / prefers-color-scheme (jsdom n'implémente pas matchMedia). */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
