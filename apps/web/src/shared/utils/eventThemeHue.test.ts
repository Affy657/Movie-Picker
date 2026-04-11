import { describe, it, expect } from 'vitest';
import { themeHueFromLabel } from '@/shared/utils/eventThemeHue';

describe('themeHueFromLabel', () => {
  it('retourne null pour null / undefined / chaîne vide', () => {
    expect(themeHueFromLabel(null)).toBeNull();
    expect(themeHueFromLabel(undefined)).toBeNull();
    expect(themeHueFromLabel('')).toBeNull();
    expect(themeHueFromLabel('   ')).toBeNull();
  });

  it('retourne un nombre entre 0 et 359 pour un thème valide', () => {
    const hue = themeHueFromLabel('Horreur');
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('est déterministe (même entrée → même résultat)', () => {
    expect(themeHueFromLabel('Sci-fi')).toBe(themeHueFromLabel('Sci-fi'));
  });

  it('produit des valeurs différentes pour des thèmes différents', () => {
    expect(themeHueFromLabel('Action')).not.toBe(themeHueFromLabel('Comédie'));
  });
});
