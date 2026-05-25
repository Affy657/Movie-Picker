// IDs are TMDB provider IDs (https://www.themoviedb.org/settings/api)
const PROVIDER_SEARCH_URLS: Record<number, (title: string) => string> = {
  2: (t) => `https://tv.apple.com/fr/search?term=${encodeURIComponent(t)}`,   // Apple iTunes
  3: (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`, // Google Play
  8: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,      // Netflix
  9: (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`, // Amazon Prime Video
  35: (t) => `https://www.rakuten.tv/fr/search?q=${encodeURIComponent(t)}`,   // Rakuten TV
  56: (t) => `https://www.ocs.fr/programme?q=${encodeURIComponent(t)}`,       // OCS
  67: (t) => `https://www.molotov.tv/search?q=${encodeURIComponent(t)}`,      // Molotov
  68: (t) => `https://www.microsoft.com/fr-fr/search/shop/films?q=${encodeURIComponent(t)}`, // Microsoft Store
  119: (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`, // Amazon Prime Video (FR)
  190: (t) => `https://www.canalplus.com/recherche/${encodeURIComponent(t)}`, // Canal+
  234: (t) => `https://www.arte.tv/fr/search/?q=${encodeURIComponent(t)}`,    // Arte
  236: (t) => `https://www.france.tv/recherche/?q=${encodeURIComponent(t)}`,  // France.tv
  283: (t) => `https://www.crunchyroll.com/fr/search?q=${encodeURIComponent(t)}`, // Crunchyroll
  318: (t) => `https://animationdigitalnetwork.com/video?q=${encodeURIComponent(t)}`, // ADN
  337: (t) => `https://www.disneyplus.com/fr-fr/search?q=${encodeURIComponent(t)}`, // Disney+
  350: (t) => `https://tv.apple.com/fr/search?term=${encodeURIComponent(t)}`, // Apple TV+
  381: (t) => `https://www.canalplus.com/recherche/${encodeURIComponent(t)}`, // MyCanal
  531: (t) => `https://www.paramountplus.com/fr/search/${encodeURIComponent(t)}/`, // Paramount+
  564: (t) => `https://www.shadowz.fr/search?q=${encodeURIComponent(t)}`,    // Shadowz
};

export function providerDirectUrl(
  providerId: number,
  title: string,
  fallback: string | null
): string | null {
  const fn = PROVIDER_SEARCH_URLS[providerId];
  if (fn) return fn(title);
  return fallback;
}
