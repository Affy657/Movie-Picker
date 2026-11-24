import type { WatchProviderOffer } from '@/shared/types/movie';

const FAMILY_SUFFIXES = [
  ' standard with ads',
  ' basic with ads',
  ' premium with ads',
  ' with ads',
  ' amazon channel',
  ' apple tv channel',
  ' roku premium channel',
];

export function providerFamilyName(name: string): string {
  const clean = name.trim().replaceAll(/\s+/g, ' ');
  const lower = clean.toLowerCase();
  const suffix = FAMILY_SUFFIXES.find((candidate) => lower.endsWith(candidate));
  return suffix ? clean.slice(0, clean.length - suffix.length) : clean;
}

export function subscriptionFamilies(
  providers: readonly WatchProviderOffer[] | null | undefined
): WatchProviderOffer[] {
  const families = new Map<string, { offer: WatchProviderOffer; plain: boolean }>();
  for (const provider of providers ?? []) {
    if (provider.type !== 'flatrate') continue;
    const family = providerFamilyName(provider.name);
    const key = family.toLowerCase();
    const plain = provider.name.trim().toLowerCase() === key;
    const current = families.get(key);
    if (!current || (plain && !current.plain)) {
      families.set(key, { offer: { ...provider, name: family }, plain });
    }
  }
  return [...families.values()].map((entry) => entry.offer);
}

export type WatchOfferSummary =
  | { kind: 'subscription'; families: WatchProviderOffer[] }
  | { kind: 'paid'; rent: boolean }
  | { kind: 'none' };

export function watchOfferSummary(
  providers: readonly WatchProviderOffer[] | null | undefined
): WatchOfferSummary {
  const families = subscriptionFamilies(providers);
  if (families.length > 0) return { kind: 'subscription', families };
  const offers = providers ?? [];
  const rent = offers.some((p) => p.type === 'rent');
  const buy = offers.some((p) => p.type === 'buy');
  return rent || buy ? { kind: 'paid', rent } : { kind: 'none' };
}

export function splitProviderSlots<T>(items: readonly T[], slots: number) {
  if (items.length <= slots) return { shown: [...items], hidden: [] as T[] };
  const visible = Math.max(slots - 1, 0);
  return { shown: items.slice(0, visible), hidden: items.slice(visible) };
}
