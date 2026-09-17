import { vi } from 'vitest';

export function stubMatchMedia(matches: boolean | ((query: string) => boolean)) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: typeof matches === 'function' ? matches(query) : matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

export function stubHoverCapability() {
  stubMatchMedia((query) => query.includes('hover'));
}
