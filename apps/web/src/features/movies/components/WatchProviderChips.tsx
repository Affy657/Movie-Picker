import clsx from 'clsx';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n/t';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import styles from './WatchProviderChips.module.css';

/** TMDB peut renvoyer une URL complète ou un chemin `/t/p/...`. */
function toAbsoluteTmdbLogoUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith('https://image.tmdb.org')) return t;
  if (t.startsWith('http://image.tmdb.org')) return `https://${t.slice(7)}`;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `https://image.tmdb.org${t}`;
  return t;
}

function isSafeTmdbLogoUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(toAbsoluteTmdbLogoUrl(url));
    return u.protocol === 'https:' && u.hostname === 'image.tmdb.org';
  } catch {
    return false;
  }
}

/** Taille TMDB adaptée au cadre d’affichage (logos agrandis en liste / cartes). */
function tmdbLogoSrcForUi(url: string): string {
  const abs = toAbsoluteTmdbLogoUrl(url);
  try {
    const u = new URL(abs);
    if (u.hostname !== 'image.tmdb.org') return abs;
    u.pathname = u.pathname.replace(/\/t\/p\/w\d+\//i, '/t/p/w154/');
    return u.toString();
  } catch {
    return abs;
  }
}

function monetizationLabel(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  type: string
): string {
  switch (type) {
    case 'flatrate':
      return t('movies.watchProviders.typeFlatrate');
    case 'rent':
      return t('movies.watchProviders.typeRent');
    case 'buy':
      return t('movies.watchProviders.typeBuy');
    default:
      return type;
  }
}

interface WatchProviderChipsProps {
  providers: WatchProviderOffer[];
  className?: string;
  /** Affichage plus compact (ex. résultats de recherche). */
  variant?: 'default' | 'compact';
  /**
   * Page TMDB « où regarder » pour ce film (`/movie/{id}/watch`).
   * Si définie et valide (HTTPS + themoviedb.org), chaque puce ouvre cette page dans un nouvel onglet.
   * Les parents peuvent pré-filtrer avec `isSafeTmdbWatchPageUrl` ; le composant re-valide en défense en profondeur.
   */
  watchPageUrl?: string | null;
}

export default function WatchProviderChips({
  providers,
  className,
  variant = 'default',
  watchPageUrl,
}: WatchProviderChipsProps) {
  const { t } = useTranslation();
  if (!providers.length) return null;
  const compact = variant === 'compact';
  const rootClass = clsx(styles.list, compact && styles.compact, className);
  const safeWatchHref =
    watchPageUrl != null && isSafeTmdbWatchPageUrl(watchPageUrl) ? watchPageUrl : null;

  return (
    <ul className={rootClass} aria-label={t('movies.watchProviders.listAria')}>
      {providers.map((p) => {
        const hasLogo = isSafeTmdbLogoUrl(p.logoPath);
        const typeStr = monetizationLabel(t, p.type);
        const ariaStatic = t('movies.watchProviders.chipAria', { provider: p.name, type: typeStr });
        const ariaLink = t('movies.watchProviders.chipLinkAria', {
          provider: p.name,
          type: typeStr,
        });

        const chipInner =
          hasLogo && p.logoPath ? (
            <span className={clsx(styles.logoFrame, compact && styles.logoFrameCompact)}>
              {compact ? (
                <span className={styles.logoInset} aria-hidden="true">
                  <img
                    src={tmdbLogoSrcForUi(p.logoPath)}
                    alt=""
                    className={styles.logoImg}
                    loading="lazy"
                  />
                </span>
              ) : (
                <img
                  src={tmdbLogoSrcForUi(p.logoPath)}
                  alt=""
                  className={styles.logoImg}
                  loading="lazy"
                />
              )}
            </span>
          ) : (
            <span className={styles.chipName}>{p.name}</span>
          );

        const chipClass = clsx(styles.chip, hasLogo && styles.chipLogoOnly);

        return (
          <li key={`${p.providerId}-${p.type}`} className={styles.listItem}>
            {safeWatchHref ? (
              <a
                href={safeWatchHref}
                className={clsx(chipClass, styles.chipLink)}
                aria-label={ariaLink}
                target="_blank"
                rel="noreferrer noopener"
              >
                {chipInner}
              </a>
            ) : (
              <div className={chipClass} role="group" aria-label={ariaStatic}>
                {chipInner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
