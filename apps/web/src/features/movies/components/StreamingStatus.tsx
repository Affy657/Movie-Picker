import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import styles from './StreamingStatus.module.css';

type Props = {
  providers?: WatchProviderOffer[] | null;
  watchPageUrl?: string | null;
  maxVisible?: number;
  className?: string;
};

export default function StreamingStatus({
  providers,
  watchPageUrl,
  maxVisible = 3,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!providers) return null;
  const streaming = providers.filter((p) => p.type === 'flatrate');
  if (streaming.length === 0) {
    return (
      <div className={clsx(styles.root, className)}>
        <span className={clsx(styles.badge, styles.off)}>{t('movies.search.notStreaming')}</span>
      </div>
    );
  }
  return (
    <div className={clsx(styles.root, className)}>
      <span className={clsx(styles.badge, styles.on)}>
        <Check size={ICON_SIZE.xs} aria-hidden />
        <span className={styles.badgeText}>{t('movies.search.streaming')}</span>
      </span>
      <WatchProviderChips
        providers={streaming}
        variant="compact"
        maxVisible={maxVisible}
        showTypeIcon={false}
        watchPageUrl={watchPageUrl}
      />
    </div>
  );
}
