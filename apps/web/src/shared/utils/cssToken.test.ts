import { afterEach, describe, expect, it } from 'vitest';
import { readCssToken } from './cssToken';

describe('readCssToken', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--token-under-test');
  });

  it('reads the computed value of a custom property on the document root', () => {
    document.documentElement.style.setProperty('--token-under-test', ' #2563eb ');

    expect(readCssToken('--token-under-test')).toBe('#2563eb');
  });

  it('reads the value inherited by a given element', () => {
    document.documentElement.style.setProperty('--token-under-test', 'rgba(0, 0, 0, 0.5)');
    const element = document.createElement('div');
    document.body.append(element);

    expect(readCssToken('--token-under-test', element)).toBe('rgba(0, 0, 0, 0.5)');

    element.remove();
  });

  it('returns an empty string for a token that is declared nowhere', () => {
    expect(readCssToken('--token-under-test')).toBe('');
  });
});
