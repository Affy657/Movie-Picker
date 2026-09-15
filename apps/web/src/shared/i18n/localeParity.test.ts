import { describe, it, expect } from 'vitest';
import { fr } from './locales/fr';
import { en } from './locales/en';

function flatten(node: unknown, prefix = ''): Array<[string, unknown]> {
  if (typeof node !== 'object' || node === null) return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key)
  );
}

const frEntries = flatten(fr);
const enEntries = flatten(en);
const frKeys = frEntries.map(([key]) => key);
const enKeys = enEntries.map(([key]) => key);

describe('locale parity', () => {
  it('the English locale covers every French key', () => {
    const missing = frKeys.filter((key) => !enKeys.includes(key));
    expect(missing, `clés absentes de en : ${missing.join(', ')}`).toEqual([]);
  });

  it('the English locale adds no key unknown to the French one', () => {
    const extra = enKeys.filter((key) => !frKeys.includes(key));
    expect(extra, `clés en trop dans en : ${extra.join(', ')}`).toEqual([]);
  });

  it('every value is a non-empty string', () => {
    const invalid = [...frEntries, ...enEntries]
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key);
    expect(invalid, `valeurs invalides : ${invalid.join(', ')}`).toEqual([]);
  });

  it('the French locale uses the formal "vous" everywhere', () => {
    const tutoiement =
      /(^|[\s«(])(tu|Tu|toi|Toi|Ton|tes|Rejoins|Rejoins-la|Connecte-toi|Indique|Demande)(?=[\s.,!?'’»)]|$)/u;
    const familiar = frEntries
      .filter(([, value]) => typeof value === 'string' && tutoiement.test(value))
      .map(([key]) => key);
    expect(familiar, `tutoiement dans : ${familiar.join(', ')}`).toEqual([]);
  });
});
