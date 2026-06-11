import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

const getComputedStyleOrig = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, _pseudoElt?: string | null): CSSStyleDeclaration =>
  getComputedStyleOrig(elt);

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

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

localStorage.setItem('moviepicker-locale', 'fr');

beforeEach(() => {
  localStorage.setItem('mp.session-hint', '1');
});

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
