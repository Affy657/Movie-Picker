import clsx from 'clsx';
import type { WatchProviderOffer } from '@/shared/types/movie';
import styles from './WatchProviderChips.module.css';

function isSafeTmdbLogoUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'image.tmdb.org';
  } catch {
    return false;
  }
}

/** Taille TMDB adaptée au cadre d’affichage (logos agrandis en liste / cartes). */
function tmdbLogoSrcForUi(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== 'image.tmdb.org') return url;
    u.pathname = u.pathname.replace(/\/t\/p\/w\d+\//i, '/t/p/w154/');
    return u.toString();
  } catch {
    return url;
  }
}

const typeLabel = (t: string) =>
  t === 'flatrate' ? 'Abonnement' : t === 'rent' ? 'Location' : t === 'buy' ? 'Achat' : t;

interface WatchProviderChipsProps {
  providers: WatchProviderOffer[];
  className?: string;
  /** Affichage plus compact (ex. résultats de recherche). */
  variant?: 'default' | 'compact';
}

export default function WatchProviderChips({
  providers,
  className,
  variant = 'default',
}: WatchProviderChipsProps) {
  if (!providers.length) return null;
  const compact = variant === 'compact';
  const rootClass = clsx(styles.list, compact && styles.compact, className);
  return (
    <ul className={rootClass} aria-label="Offres de visionnage indicatives">
      {providers.map((p) => {
        const hasLogo = isSafeTmdbLogoUrl(p.logoPath);
        const a11yLabel = `${p.name} (${typeLabel(p.type)})`;
        return (
          <li
            key={`${p.providerId}-${p.type}`}
            className={clsx(styles.chip, hasLogo && styles.chipLogoOnly)}
            aria-label={a11yLabel}
            title={a11yLabel}
          >
            {hasLogo && p.logoPath ? (
              <span className={clsx(styles.logoFrame, compact && styles.logoFrameCompact)}>
                <img
                  src={tmdbLogoSrcForUi(p.logoPath)}
                  alt=""
                  className={styles.logo}
                  loading="lazy"
                />
              </span>
            ) : (
              <span className={styles.chipName}>{p.name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
