import type { WatchProviderOffer } from '../types/event';

function isSafeTmdbLogoUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'image.tmdb.org';
  } catch {
    return false;
  }
}

const typeLabel = (t: string) =>
  t === 'flatrate' ? 'Abonnement' : t === 'rent' ? 'Location' : t === 'buy' ? 'Achat' : t;

interface WatchProviderChipsProps {
  providers: WatchProviderOffer[];
  className?: string;
}

export default function WatchProviderChips({ providers, className }: WatchProviderChipsProps) {
  if (!providers.length) return null;
  return (
    <ul
      className={className ?? 'watch-provider-chips'}
      aria-label="Offres de visionnage indicatives"
    >
      {providers.map((p) => (
        <li
          key={`${p.providerId}-${p.type}`}
          className="watch-provider-chip"
          title={`${p.name} (${typeLabel(p.type)})`}
        >
          {isSafeTmdbLogoUrl(p.logoPath) ? (
            <img
              src={p.logoPath}
              alt=""
              width={22}
              height={22}
              className="watch-provider-chip-logo"
            />
          ) : null}
          <span className="watch-provider-chip-name">{p.name}</span>
        </li>
      ))}
    </ul>
  );
}
