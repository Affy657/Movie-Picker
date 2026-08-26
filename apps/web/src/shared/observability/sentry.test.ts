import { describe, expect, it } from 'vitest';
import { Routes } from 'react-router';
import {
  getInstrumentedRoutes,
  sentryTracePropagationTargets,
  shouldDropSentryEvent,
} from '@/shared/observability/sentry';

describe('shouldDropSentryEvent', () => {
  it('écarte le pont injecté par le navigateur intégré Snapchat', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: "Can't find variable: SCDynimacBridge" }] },
      })
    ).toBe(true);
  });

  it('conserve une erreur applicative', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: 'Cannot read properties of undefined' }] },
      })
    ).toBe(false);
  });

  it('conserve un événement sans exception', () => {
    expect(shouldDropSentryEvent({})).toBe(false);
  });
});

describe('sentryTracePropagationTargets', () => {
  it("extrait l'origine HTTPS de l'API", () => {
    expect(sentryTracePropagationTargets('https://api.movie-picker.fr')).toEqual([
      'https://api.movie-picker.fr',
    ]);
  });

  it('ajoute https si le schéma manque', () => {
    expect(sentryTracePropagationTargets('api.movie-picker.fr/v1')).toEqual([
      'https://api.movie-picker.fr',
    ]);
  });

  it('ignore une URL vide ou invalide', () => {
    expect(sentryTracePropagationTargets('')).toEqual([]);
    expect(sentryTracePropagationTargets('not a url')).toEqual([]);
  });
});

describe('getInstrumentedRoutes', () => {
  it('renvoie Routes tant que Sentry n’est pas initialisé', () => {
    expect(getInstrumentedRoutes(Routes)).toBe(Routes);
  });
});
