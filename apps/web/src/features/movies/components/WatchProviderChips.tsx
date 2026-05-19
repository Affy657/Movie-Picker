import { useId, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft } from 'lucide-react';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n/t';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import styles from './WatchProviderChips.module.css';

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

  variant?: 'default' | 'compact';

  watchPageUrl?: string | null;

  maxVisible?: number;
}

export default function WatchProviderChips({
  providers,
  className,
  variant = 'default',
  watchPageUrl,
  maxVisible,
}: WatchProviderChipsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  if (!providers.length) return null;
  const compact = variant === 'compact';
  const rootClass = clsx(styles.list, compact && styles.compact, className);
  const safeWatchHref =
    watchPageUrl != null && isSafeTmdbWatchPageUrl(watchPageUrl) ? watchPageUrl : null;

  const overflow = !!maxVisible && providers.length > maxVisible;
  const collapsed = overflow && !expanded;
  const visibleProviders = collapsed ? providers.slice(0, maxVisible) : providers;
  const hiddenCount = providers.length - (maxVisible ?? providers.length);

  return (
    <ul className={rootClass} id={listId} aria-label={t('movies.watchProviders.listAria')}>
      {visibleProviders.map((p) => {
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
                    crossOrigin="anonymous"
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
      {overflow ? (
        <li className={styles.listItem}>
          <button
            type="button"
            className={clsx(styles.chip, styles.chipMore)}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={listId}
            aria-label={
              expanded
                ? t('movies.watchProviders.showLessAria')
                : t('movies.watchProviders.showMoreAria', { count: hiddenCount })
            }
          >
            {expanded ? <ChevronLeft aria-hidden size={14} /> : `+${hiddenCount}`}
          </button>
        </li>
      ) : null}
    </ul>
  );
}
