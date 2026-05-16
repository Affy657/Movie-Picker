import { t } from './t';

describe('t()', () => {
  it('resolves a top-level key (fr)', () => {
    expect(t('common.appName')).toBe('Movie Picker');
  });

  it('falls back to the raw key when missing', () => {
    // @ts-expect-error tester un chemin inexistant
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('interpolates {{vars}}', () => {
    expect(t('common.pageTitle', { segment: 'Login' })).toBe('Login — Movie Picker');
  });

  it('supports the en locale', () => {
    expect(t('auth.login.title', undefined, 'en')).toBeDefined();
  });
});
