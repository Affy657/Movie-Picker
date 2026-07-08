import { Fragment, useId, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Euro, Film, PlayCircle, Tag } from 'lucide-react';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n/t';
import { isSafeTmdbLogoUrl, tmdbLogoSrcForUi } from '@/shared/utils/tmdbLogo';
import styles from './WatchProviderChips.module.css';

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

export const TYPE_ORDER = ['flatrate', 'rent', 'buy'] as const;
const KNOWN_TYPES = new Set<string>(TYPE_ORDER);

export function ModeIcon({ type, size }: Readonly<{ type: string; size: number }>) {
  switch (type) {
    case 'flatrate':
      return <PlayCircle aria-hidden size={size} />;
    case 'rent':
      return <Tag aria-hidden size={size} />;
    case 'buy':
      return <Euro aria-hidden size={size} />;
    default:
      return <Film aria-hidden size={size} />;
  }
}

interface WatchProviderChipsProps {
  providers: WatchProviderOffer[];
  className?: string;
  variant?: 'default' | 'compact';
  watchPageUrl?: string | null;
  maxVisible?: number;
  onMoreClick?: () => void;
}

export default function WatchProviderChips({
  providers,
  className,
  variant = 'default',
  watchPageUrl,
  maxVisible,
  onMoreClick,
}: Readonly<WatchProviderChipsProps>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const rootId = useId();
  if (!providers.length) return null;
  const compact = variant === 'compact';
  const rootClass = clsx(styles.root, compact && styles.compact, className);
  const safeWatchHref = (() => {
    if (!watchPageUrl) return null;
    try {
      const u = new URL(watchPageUrl.trim());
      if (u.protocol !== 'https:') return null;
      const h = u.hostname.toLowerCase();
      if (h !== 'www.themoviedb.org' && h !== 'themoviedb.org') return null;
      return `https://www.themoviedb.org${encodeURI(u.pathname)}${u.search ? encodeURI(u.search) : ''}`;
    } catch {
      return null;
    }
  })();

  const groups = [
    ...TYPE_ORDER.map((type) => ({
      type: type as string,
      items: providers.filter((p) => p.type === type),
    })),
    { type: 'other', items: providers.filter((p) => !KNOWN_TYPES.has(p.type)) },
  ].filter((g) => g.items.length > 0);

  const collapsed = !!maxVisible && !expanded;

  const renderChip = (p: WatchProviderOffer) => {
    const hasLogo = isSafeTmdbLogoUrl(p.logoPath);
    const typeStr = monetizationLabel(t, p.type);
    const ariaStatic = t('movies.watchProviders.chipAria', { provider: p.name, type: typeStr });
    const ariaLink = t('movies.watchProviders.chipLinkAria', { provider: p.name, type: typeStr });

    const chipInner =
      hasLogo && p.logoPath ? (
        <img src={tmdbLogoSrcForUi(p.logoPath)} alt="" className={styles.logoImg} loading="lazy" />
      ) : (
        <span className={styles.chipName}>{p.name}</span>
      );

    const chipClass = clsx(styles.chip, hasLogo ? styles.chipLogo : styles.chipText);
    const href = safeWatchHref;
    const key = `${p.providerId}-${p.type}`;

    return href ? (
      <a
        key={key}
        href={href}
        className={clsx(chipClass, styles.chipLink)}
        aria-label={ariaLink}
        target="_blank"
        rel="noreferrer noopener"
      >
        {chipInner}
      </a>
    ) : (
      <span key={key} className={chipClass} role="img" aria-label={ariaStatic}>
        {chipInner}
      </span>
    );
  };

  return (
    <dl className={rootClass} id={rootId} aria-label={t('movies.watchProviders.listAria')}>
      {groups.map((g) => {
        const label = monetizationLabel(t, g.type);
        const hadOverflow = !!maxVisible && g.items.length > maxVisible;
        const limited = collapsed && maxVisible ? g.items.slice(0, maxVisible) : g.items;
        const hidden = g.items.length - limited.length;
        return (
          <Fragment key={g.type}>
            <dt className={styles.label} aria-label={label} title={label}>
              <ModeIcon type={g.type} size={compact ? 15 : 17} />
            </dt>
            <dd className={styles.logos}>
              {limited.map(renderChip)}
              {hadOverflow ? (
                <button
                  type="button"
                  className={styles.more}
                  onClick={onMoreClick ?? (() => setExpanded((v) => !v))}
                  aria-expanded={onMoreClick ? undefined : expanded}
                  aria-controls={onMoreClick ? undefined : rootId}
                  aria-label={
                    expanded
                      ? t('movies.watchProviders.showLessAria')
                      : t('movies.watchProviders.showMoreAria', { count: hidden })
                  }
                >
                  {expanded ? <ChevronLeft aria-hidden size={14} /> : `+${hidden}`}
                </button>
              ) : null}
            </dd>
          </Fragment>
        );
      })}
    </dl>
  );
}
