import { Link } from 'react-router';
import { Film, SearchX } from 'lucide-react';
import { buttonClass } from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import WatchlistSkeleton from '@/features/library/components/WatchlistSkeleton';
import { ROUTES } from '@/app/routes';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import type { ShowcaseListVariant } from '@/features/movies/showcaseSections';
import styles from './ShowcaseListPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import InlineError from '@/shared/components/InlineError';

type Props = {
  variant: ShowcaseListVariant;
  searchQuery: string;
  queryEnabled: boolean;
  isPending: boolean;
  isError: boolean;
  totalCount: number;
  onRetry: () => void;
};

type StateKeys = {
  loading: TranslationKey;
  error: TranslationKey;
  empty: TranslationKey;
  emptyMessage: TranslationKey;
};

const SEARCH_KEYS: StateKeys = {
  loading: 'showcase.searchLoading',
  error: 'showcase.searchError',
  empty: 'showcase.searchEmpty',
  emptyMessage: 'showcase.searchEmptyMessage',
};

const SELECTION_KEYS: StateKeys = {
  loading: 'showcase.loading',
  error: 'showcase.error',
  empty: 'showcase.empty',
  emptyMessage: 'showcase.emptyMessage',
};

function stateKeysOf(variant: ShowcaseListVariant): StateKeys {
  if (variant === 'search') return SEARCH_KEYS;
  if (variant === 'most-proposed') {
    return { ...SELECTION_KEYS, emptyMessage: 'showcase.emptyMessageMostProposed' };
  }
  return SELECTION_KEYS;
}

export default function ShowcaseListStates({
  variant,
  searchQuery,
  queryEnabled,
  isPending,
  isError,
  totalCount,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const searching = variant === 'search';
  const keys = stateKeysOf(variant);

  if (!queryEnabled) {
    return (
      <EmptyState
        icon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
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
    return <WatchlistSkeleton label={t(keys.loading)} gridClassName={styles.grid} />;
  }

  if (isError) {
    return (
      <InlineError message={t(keys.error)} retryLabel={t('showcase.retry')} onRetry={onRetry} />
    );
  }

  if (totalCount === 0) {
    const EmptyIcon = searching ? SearchX : Film;
    return (
      <EmptyState
        icon={<EmptyIcon aria-hidden size={ICON_SIZE['3xl']} />}
        title={t(keys.empty, { query: searchQuery })}
        message={t(keys.emptyMessage)}
      />
    );
  }

  return null;
}
