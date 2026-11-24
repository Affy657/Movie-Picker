import { useId, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import InlineError from '@/shared/components/InlineError';
import { useTranslation } from '@/shared/i18n';
import type { FollowUserItem } from '@/features/profile/api/profileApi';
import { containsMatch } from '@/features/profile/lib/highlightMatch';
import FollowListEmptyState from './FollowListEmptyState';
import { MIN_SEARCH_LENGTH } from './FollowSearchBar';
import styles from './FollowListModal.module.css';

type RenderRow = (item: FollowUserItem, highlight: string) => ReactNode;

type Props = {
  term: string;
  debouncedTerm: string;
  members: readonly FollowUserItem[];
  membersPending: boolean;
  membersFailed: boolean;
  onRetryMembers: () => void;
  ownLists: boolean;
  globalQuery: UseQueryResult<{ items: FollowUserItem[] }>;
  globalEnabled: boolean;
  renderRow: RenderRow;
};

function matchesTerm(item: FollowUserItem, term: string): boolean {
  return containsMatch(item.displayName, term) || containsMatch(item.handle, term);
}

type SearchView = 'loading' | 'idle' | 'noMatch' | 'results';

function searchView({
  nothingToShow,
  busy,
  failed,
  termLength,
}: Readonly<{
  nothingToShow: boolean;
  busy: boolean;
  failed: boolean;
  termLength: number;
}>): SearchView {
  if (!nothingToShow || failed) return 'results';
  if (busy) return 'loading';
  if (termLength === 0) return 'idle';
  return termLength >= MIN_SEARCH_LENGTH ? 'noMatch' : 'results';
}

function ResultSection({
  label,
  items,
  highlight,
  renderRow,
}: Readonly<{
  label: string;
  items: readonly FollowUserItem[];
  highlight: string;
  renderRow: RenderRow;
}>) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        {label}
      </h3>
      <ul className={styles.list}>{items.map((item) => renderRow(item, highlight))}</ul>
    </section>
  );
}

export default function FollowSearchResults({
  term,
  debouncedTerm,
  members,
  membersPending,
  membersFailed,
  onRetryMembers,
  ownLists,
  globalQuery,
  globalEnabled,
  renderRow,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const memberMatches = members.filter((item) => matchesTerm(item, term));
  const memberHandles = new Set(members.map((item) => item.handle));
  const globalMatches = globalEnabled
    ? (globalQuery.data?.items ?? []).filter((item) => !memberHandles.has(item.handle))
    : [];
  const tooShort = term.length > 0 && term.length < MIN_SEARCH_LENGTH;
  const waitingForGlobal =
    term.length >= MIN_SEARCH_LENGTH && (term !== debouncedTerm || globalQuery.isPending);
  const globalFailed = globalEnabled && globalQuery.isError && !globalQuery.data;
  const view = searchView({
    nothingToShow: memberMatches.length === 0 && globalMatches.length === 0,
    busy: membersPending || waitingForGlobal,
    failed: globalFailed || membersFailed,
    termLength: term.length,
  });

  if (view === 'loading') return <p className={styles.placeholder}>{t('common.loading')}</p>;
  if (view === 'idle') return <FollowListEmptyState kind="searchIdle" />;
  if (view === 'noMatch') return <FollowListEmptyState kind="searchEmpty" />;

  return (
    <div className={styles.panel}>
      {tooShort ? (
        <p className={styles.hint}>
          {t('profile.follow.search.minLength', { count: String(MIN_SEARCH_LENGTH) })}
        </p>
      ) : null}
      {membersFailed ? (
        <InlineError
          message={t('profile.follow.loadError')}
          retryLabel={t('common.retry')}
          onRetry={onRetryMembers}
        />
      ) : null}
      {memberMatches.length > 0 ? (
        <ResultSection
          label={t(
            ownLists ? 'profile.follow.search.inYourLists' : 'profile.follow.search.inTheseLists'
          )}
          items={memberMatches}
          highlight={term}
          renderRow={renderRow}
        />
      ) : null}
      {globalFailed ? (
        <InlineError
          message={t('profile.follow.search.error')}
          retryLabel={t('common.retry')}
          onRetry={() => void globalQuery.refetch()}
        />
      ) : null}
      {globalMatches.length > 0 ? (
        <ResultSection
          label={t('profile.follow.search.everywhere')}
          items={globalMatches}
          highlight={debouncedTerm}
          renderRow={renderRow}
        />
      ) : null}
    </div>
  );
}
