import { describe, it, expect } from 'vitest';
import { fr } from './locales/fr';
import { en } from './locales/en';
import errorCodesSource from '../../../../api-dotnet/MoviePicker.Api/Domain/Exceptions/ErrorCodes.cs?raw';

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

const apiErrorCodes = Array.from(
  errorCodesSource.matchAll(/public const string \w+ = "([^"]+)";/g),
  ([, code]) => code ?? ''
);

const TUTOIEMENT =
  /(^|[\s«(])(tu|Tu|te|Te|toi|Toi|ton|Ton|ta|Ta|tes|Tes|tien|tienne|tiennes|Rejoins|Rejoins-la|Connecte-toi|Indique|Demande|Pense|Réessaie|Essaie|Confirme|Organise|Vérifie|Choisis|Ajoute|Clique|Regarde|Utilise|Saisis|Retrouve|Découvre|Reviens|Viens|Fais|Prends|Crée)(?=[\s.,!?'’»)]|$)/u;

const IMPERATIVE_WITH_PRONOUN =
  /(^|[\s«(])\p{L}*[a-yà-ÿ]-(toi|en|la|le|les|lui|leur)(?=[\s.,!?'’»)]|$)/u;

function isFamiliar(text: string): boolean {
  return TUTOIEMENT.test(text) || IMPERATIVE_WITH_PRONOUN.test(text);
}

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

  it('translates every error code of the API in both locales', () => {
    expect(apiErrorCodes).toContain('not_found');
    const untranslated = Object.entries({ fr, en }).flatMap(([localeCode, locale]) =>
      apiErrorCodes
        .filter((reason) => !Object.hasOwn(locale.apiErrors, reason))
        .map((reason) => `${localeCode}.apiErrors.${reason}`)
    );
    expect(untranslated, `untranslated API error codes: ${untranslated.join(', ')}`).toEqual([]);
  });

  it('the French locale uses the formal "vous" everywhere', () => {
    const familiar = frEntries
      .filter(([, value]) => typeof value === 'string' && isFamiliar(value))
      .map(([key]) => key);
    expect(familiar, `tutoiement dans : ${familiar.join(', ')}`).toEqual([]);
  });

  it('the formal "vous" guard catches every familiar form already met', () => {
    expect(isFamiliar('Pense à vérifier les spams.')).toBe(true);
    expect(isFamiliar('Réessaie dans quelques instants.')).toBe(true);
    expect(isFamiliar('Demande-en un nouveau ci-dessous.')).toBe(true);
    expect(isFamiliar('Confirme le mot de passe')).toBe(true);
    expect(isFamiliar('Organise la tienne')).toBe(true);
    expect(isFamiliar('Pensez à vérifier les spams.')).toBe(false);
    expect(isFamiliar('Demandez-en un nouveau ci-dessous.')).toBe(false);
    expect(isFamiliar('Organisez la vôtre')).toBe(false);
    expect(isFamiliar('Comment les deux moitiés tiennent ensemble')).toBe(false);
  });
});
