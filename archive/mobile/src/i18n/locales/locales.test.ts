import { fr } from './fr';
import { en } from './en';
import { isLocaleCode, SUPPORTED_LOCALES, LOCALE_LABELS } from './index';

function collectKeys(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys.sort();
}

describe('i18n locales parity', () => {
  it('exposes the expected locale codes', () => {
    expect(SUPPORTED_LOCALES).toEqual(['fr', 'en']);
    expect(LOCALE_LABELS).toEqual({ fr: 'Français', en: 'English' });
  });

  it('isLocaleCode narrows known codes', () => {
    expect(isLocaleCode('fr')).toBe(true);
    expect(isLocaleCode('en')).toBe(true);
    expect(isLocaleCode('es')).toBe(false);
    expect(isLocaleCode('')).toBe(false);
  });

  it('fr and en share the exact same deep key structure', () => {
    const frKeys = collectKeys(fr);
    const enKeys = collectKeys(en);

    const missingInEn = frKeys.filter((k) => !enKeys.includes(k));
    const missingInFr = enKeys.filter((k) => !frKeys.includes(k));

    expect({ missingInEn, missingInFr }).toEqual({ missingInEn: [], missingInFr: [] });
  });

  it('every leaf is a non-empty string', () => {
    const verify = (obj: unknown, path = ''): string[] => {
      if (obj == null || typeof obj !== 'object') return [];
      const issues: string[] = [];
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const key = path ? `${path}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          issues.push(...verify(v, key));
        } else if (typeof v !== 'string' || v.length === 0) {
          issues.push(key);
        }
      }
      return issues;
    };
    expect(verify(fr)).toEqual([]);
    expect(verify(en)).toEqual([]);
  });
});
