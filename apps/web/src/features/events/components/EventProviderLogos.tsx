import clsx from 'clsx';
import { Tag } from 'lucide-react';
import FixedMenu from '@/shared/components/FixedMenu';
import { MenuItem } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { isSafeTmdbLogoUrl, tmdbLogoSrcForUi } from '@/shared/utils/tmdbLogo';
import { safeTmdbWatchHref } from '@/shared/utils/tmdbWatchPage';
import { splitProviderSlots, watchOfferSummary } from '@/shared/utils/watchProviderFamilies';
import styles from './EventProviderLogos.module.css';

function ProviderLogo({
  provider,
  decorative = false,
}: Readonly<{ provider: WatchProviderOffer; decorative?: boolean }>) {
  const label = decorative ? undefined : provider.name;
  if (isSafeTmdbLogoUrl(provider.logoPath)) {
    return (
      <img
        className={styles.logo}
        src={tmdbLogoSrcForUi(provider.logoPath)}
        alt={label ?? ''}
        title={label}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span
      className={clsx(styles.logo, styles.logoFallback)}
      role={decorative ? undefined : 'img'}
      aria-label={label}
      aria-hidden={decorative || undefined}
      title={label}
    >
      {provider.name.slice(0, 1)}
    </span>
  );
}

function SubscriptionsMenu({
  families,
  hiddenCount,
  title,
  watchPageUrl,
}: Readonly<{
  families: WatchProviderOffer[];
  hiddenCount: number;
  title: string;
  watchPageUrl?: string | null;
}>) {
  const { t } = useTranslation();
  const href = safeTmdbWatchHref(watchPageUrl);
  return (
    <FixedMenu
      ariaLabel={t('movies.watchProviders.subscriptionsLabel')}
      triggerContent={`+${hiddenCount}`}
      triggerAriaLabel={t('movies.watchProviders.moreSubscriptionsAria', {
        more: hiddenCount,
        count: families.length,
        title,
      })}
      triggerClassName={styles.more}
    >
      {(close) =>
        families.map((family) => (
          <MenuItem
            key={family.providerId}
            icon={<ProviderLogo provider={family} decorative />}
            href={href ?? undefined}
            external={!!href}
            onClick={href ? undefined : close}
          >
            {family.name}
          </MenuItem>
        ))
      }
    </FixedMenu>
  );
}

export default function EventProviderLogos({
  providers,
  slots,
  title,
  watchPageUrl,
  onOpenDetails,
}: Readonly<{
  providers: readonly WatchProviderOffer[] | null | undefined;
  slots: number;
  title: string;
  watchPageUrl?: string | null;
  onOpenDetails: () => void;
}>) {
  const { t } = useTranslation();
  const summary = watchOfferSummary(providers);

  if (summary.kind === 'none') {
    return (
      <span className={styles.root}>
        <span className={styles.none}>{t('movies.watchProviders.noOfferLabel')}</span>
      </span>
    );
  }

  if (summary.kind === 'paid') {
    const label = summary.rent
      ? t('movies.watchProviders.paidOnlyLabel')
      : t('movies.watchProviders.typeBuy');
    return (
      <span className={styles.root}>
        <button
          type="button"
          className={styles.paid}
          onClick={onOpenDetails}
          aria-label={t('movies.watchProviders.paidOnlyAria', { label, title })}
        >
          <Tag aria-hidden size={ICON_SIZE.xs} />
          <span className={styles.paidLabel}>{label}</span>
        </button>
      </span>
    );
  }

  const { shown, hidden } = splitProviderSlots(summary.families, slots);
  return (
    <span className={styles.root}>
      {shown.map((family) => (
        <ProviderLogo key={family.providerId} provider={family} />
      ))}
      {hidden.length > 0 ? (
        <SubscriptionsMenu
          families={summary.families}
          hiddenCount={hidden.length}
          title={title}
          watchPageUrl={watchPageUrl}
        />
      ) : null}
    </span>
  );
}
