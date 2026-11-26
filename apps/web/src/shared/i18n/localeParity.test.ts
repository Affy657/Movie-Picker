import { describe, it, expect } from 'vitest';
import { fr } from './locales/fr';
import { en } from './locales/en';
import errorCodesSource from '../../../../api-dotnet/MoviePicker.Api/Domain/Exceptions/ErrorCodes.cs?raw';
import familiarFrenchSource from '../../../../api-dotnet/MoviePicker.Api.Tests/Application/familiar-french.json?raw';

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

const OPENING_IMPERATIVE = 'imperativeOpeningASentence';

const DESCRIPTIONS_OPENING_ON_A_THIRD_PERSON_VERB = new Set([
  'tech.architecture.schedulerValue',
  'tech.ci.terraformHint',
  'tech.quality.ruleLiteralHint',
  'tech.quality.ruleImportHint',
  'tech.quality.ruleWriteSeqHint',
]);

const familiarForms = Object.entries(
  JSON.parse(familiarFrenchSource) as Record<string, string[]>
).map(([form, fragments]) => ({ form, pattern: new RegExp(fragments.join(''), 'u') }));

function familiarFormsIn(text: string): string[] {
  return familiarForms.filter(({ pattern }) => pattern.test(text)).map(({ form }) => form);
}

function isFamiliar(text: string): boolean {
  return familiarFormsIn(text).length > 0;
}

function familiarFormsOfEntry(key: string, text: string): string[] {
  return familiarFormsIn(text).filter(
    (form) => form !== OPENING_IMPERATIVE || !DESCRIPTIONS_OPENING_ON_A_THIRD_PERSON_VERB.has(key)
  );
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
    const familiar = frEntries.flatMap(([key, value]) => {
      const forms = typeof value === 'string' ? familiarFormsOfEntry(key, value) : [];
      return forms.length > 0 ? [`${key} (${forms.join(', ')})`] : [];
    });
    expect(familiar, `tutoiement dans : ${familiar.join(', ')}`).toEqual([]);
  });

  it('exempts only the descriptions the sentence rule still reads as an imperative', () => {
    const values = new Map(frEntries);
    const stale = [...DESCRIPTIONS_OPENING_ON_A_THIRD_PERSON_VERB].filter(
      (key) => !familiarFormsIn(String(values.get(key))).includes(OPENING_IMPERATIVE)
    );
    expect(stale, `exemptions à retirer : ${stale.join(', ')}`).toEqual([]);
  });

  it('the French locale writes the typographic apostrophe', () => {
    const straight = frEntries
      .filter(([, value]) => typeof value === 'string' && /\p{L}'[\p{L}\d{]/u.test(value))
      .map(([key]) => key);
    expect(straight, `apostrophe droite dans : ${straight.join(', ')}`).toEqual([]);
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

  it.each([
    'Prépare la soirée.',
    'Choisis le film du soir.',
    'Lance la roue quand tout le monde a voté.',
    'Astuce : partage le lien avec le groupe.',
    'Le film est prêt, donne-lui une note.',
    'Envoie un rappel à la veille.',
    'Léa t’invite à sa soirée.',
    'Vas-y !',
    'Clique ici.',
    'Reviens plus tard.',
    'Viens voir la soirée.',
    'Choisis parmi les films proposés.',
    'Fais attention.',
    'Indique combien de films.',
  ])('the formal "vous" guard catches an imperative it was never given: %s', (text) => {
    expect(isFamiliar(text)).toBe(true);
  });

  it.each([
    'Rejoindre la soirée',
    'Lire la suite',
    'Faites vos soirées entre amis',
    'Dites-le avec vos mots.',
    'Allons-y !',
    'Films les plus proposés',
    'Récupérées une fois puis servies depuis le serveur.',
    'Au programme : Dune le samedi.',
    'Impossible de charger la liste.',
    'De l’invitation au générique',
    'Cliquez ici.',
    'Revenez plus tard.',
    'Venez voir la soirée.',
    'Choisissez parmi les films proposés.',
    'Faites attention.',
    'Indiquez combien de films.',
    'Demandes d’amis',
    '{{count}} films choisis',
  ])('the formal "vous" guard lets the formal and impersonal French through: %s', (text) => {
    expect(isFamiliar(text)).toBe(false);
  });
});
