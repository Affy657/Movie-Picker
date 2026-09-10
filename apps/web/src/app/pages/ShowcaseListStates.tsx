import { Link } from 'react-router';
import { Film } from 'lucide-react';
import Button, { buttonClass } from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import type { ShowcaseListVariant } from '@/features/movies/showcaseSections';
import styles from './ShowcaseListPage.module.css';

type Props = {
  variant: ShowcaseListVariant;
  queryEnabled: boolean;
  isPending: boolean;
  isError: boolean;
  totalCount: number;
  onRetry: () => void;
};

export default function ShowcaseListStates({
  variant,
  queryEnabled,
  isPending,
  isError,
  totalCount,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const searching = variant === 'search';

  if (!queryEnabled) {
    return (
      <EmptyState
        icon={<Film aria-hidden size={28} />}
        title={searching ? t('showcase.searchEmptyQuery') : t('showcase.unknownSelection')}
        message={searching ? t('home.intro') : t('showcase.unknownSelectionMessage')}
        actions={
          searching ? undefined : (
            <Link to={ROUTES.home} className={buttonClass({ variant: 'primary', size: 'sm' })}>
              {t('showcase.backToHome')}
            </Link>
          )
        }
      />
    );
  }

  if (isPending) {
    return <WatchlistSkeleton label={t('showcase.loading')} gridClassName={styles.grid} />;
  }

  if (isError) {
    return (
      <p className={styles.state} role="alert">
        {t('showcase.error')}
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t('showcase.retry')}
        </Button>
      </p>
    );
  }

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<Film aria-hidden size={28} />}
        title={t('showcase.empty')}
        message={
          variant === 'most-proposed'
            ? t('showcase.emptyMessageMostProposed')
            : t('showcase.emptyMessage')
        }
      />
    );
  }

  return null;
}
