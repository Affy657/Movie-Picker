import { describe, expect, it } from 'vitest';
import type { WatchProviderOffer } from '@/shared/types/movie';
import {
  providerFamilyName,
  splitProviderSlots,
  subscriptionFamilies,
  watchOfferSummary,
} from './watchProviderFamilies';

const offer = (
  name: string,
  type: string = 'flatrate',
  providerId = name.length,
  logoPath: string | null = `/${name}.png`
): WatchProviderOffer => ({ providerId, name, type, logoPath });

describe('providerFamilyName', () => {
  it.each([
    ['Netflix Standard with Ads', 'Netflix'],
    ['Amazon Prime Video with Ads', 'Amazon Prime Video'],
    ['HBO Max Amazon Channel', 'HBO Max'],
    ['Paramount Plus Apple TV Channel', 'Paramount Plus'],
    ['Canal+ Basic with Ads', 'Canal+'],
    ['Disney Plus', 'Disney Plus'],
  ])('maps %s to %s', (name, family) => {
    expect(providerFamilyName(name)).toBe(family);
  });
});

describe('subscriptionFamilies', () => {
  it('keeps one entry per family, in first-seen order, with the plain entry logo', () => {
    const families = subscriptionFamilies([
      offer('Amazon Prime Video', 'flatrate', 1, '/prime.png'),
      offer('Amazon Prime Video with Ads', 'flatrate', 2, '/prime-ads.png'),
      offer('HBO Max Amazon Channel', 'flatrate', 3, '/max-channel.png'),
      offer('Disney Plus', 'flatrate', 4, '/disney.png'),
      offer('HBO Max', 'flatrate', 5, '/max.png'),
    ]);

    expect(families.map((f) => [f.name, f.logoPath])).toEqual([
      ['Amazon Prime Video', '/prime.png'],
      ['HBO Max', '/max.png'],
      ['Disney Plus', '/disney.png'],
    ]);
  });

  it('ignores rentals and purchases', () => {
    expect(subscriptionFamilies([offer('Apple TV', 'rent'), offer('Google Play', 'buy')])).toEqual(
      []
    );
  });

  it('accepts a missing list', () => {
    expect(subscriptionFamilies(undefined)).toEqual([]);
    expect(subscriptionFamilies(null)).toEqual([]);
  });
});

describe('watchOfferSummary', () => {
  it('reports subscriptions first', () => {
    expect(watchOfferSummary([offer('Netflix'), offer('Apple TV', 'rent')]).kind).toBe(
      'subscription'
    );
  });

  it('reports a paid offer when only rentals or purchases exist', () => {
    expect(watchOfferSummary([offer('Apple TV', 'rent')]).kind).toBe('paid');
    expect(watchOfferSummary([offer('Google Play', 'buy')]).kind).toBe('paid');
  });

  it('reports nothing when no offer exists', () => {
    expect(watchOfferSummary([]).kind).toBe('none');
  });
});

describe('splitProviderSlots', () => {
  const six = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('shows everything that fits', () => {
    expect(splitProviderSlots(six.slice(0, 3), 3)).toEqual({
      shown: ['a', 'b', 'c'],
      hidden: [],
    });
  });

  it('keeps the last slot for the overflow button', () => {
    expect(splitProviderSlots(six, 3)).toEqual({ shown: ['a', 'b'], hidden: ['c', 'd', 'e', 'f'] });
    expect(splitProviderSlots(six.slice(0, 5), 4)).toEqual({
      shown: ['a', 'b', 'c'],
      hidden: ['d', 'e'],
    });
  });
});
