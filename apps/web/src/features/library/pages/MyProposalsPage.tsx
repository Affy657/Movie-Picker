import { useMemo } from 'react';
import { Film, Trophy } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ProfileCardBadge } from '@/features/movies/components/OwnerRatingBadge';
import ListMoviesPage, {
  type ListMoviesCardActions,
} from '@/features/library/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/library/components/WatchlistToolbar';
import type { ProposedMovie } from '@/features/library/api/proposedMoviesApi';
import { useMyProposedMovies } from '@/features/library/hooks/useMyProposedMovies';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import { proposalsCountLabel, type ProposalsKind } from '@/features/library/utils/proposalsCount';

type ProposalEntry = ProposedMovie & { createdAt: string };

const NO_MOVIES: ProposedMovie[] = [];

function toEntry(movie: ProposedMovie): ProposalEntry {
  return { ...movie, createdAt: movie.lastProposedAt };
}

function subtitleOf(movies: readonly ProposedMovie[], kind: ProposalsKind, t: Translate): string {
  const count = movies.length;
  const proposals = movies.reduce((sum, movie) => sum + movie.proposalCount, 0);
  if (proposals <= count) return proposalsCountLabel(count, kind, t);
  return pluralizeCount(
    count,
    `myProposals.${kind}.countRepeatedOne`,
    `myProposals.${kind}.countRepeated`,
    t,
    { count, proposals }
  );
}

function timesBadgeSlot(
  kind: ProposalsKind,
  t: Translate
): ListMoviesCardActions<ProposalEntry>['leadingBadge'] {
  return (entry) =>
    entry.proposalCount > 1 ? (
      <ProfileCardBadge
        description={t(`myProposals.${kind}.timesDescription`, { count: entry.proposalCount })}
      >
        {t('myProposals.timesBadge', { count: entry.proposalCount })}
      </ProfileCardBadge>
    ) : null;
}

export default function MyProposalsPage({
  winningOnly = false,
}: Readonly<{ winningOnly?: boolean }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const kind: ProposalsKind = winningOnly ? 'winning' : 'proposals';
  const title = t(`myProposals.${kind}.title`);
  useNoindexPage(pageTitle(title), winningOnly ? ROUTES.myWinningProposals : ROUTES.myProposals);

  const proposalsQuery = useMyProposedMovies(winningOnly, { enabled: !!user });
  const watchlistToggle = useWatchlistToggle(!!user);

  const movies = proposalsQuery.data ?? NO_MOVIES;
  const entries = useMemo(() => movies.map(toEntry), [movies]);

  const sorts = useMemo<WatchlistSortConfig>(
    () => ({
      keys: ['createdAt', 'title', 'year'],
      labels: { createdAt: t('myProposals.sortProposedAt'), year: t('myProposals.sortYear') },
    }),
    [t]
  );

  const EmptyIcon = winningOnly ? Trophy : Film;

  return (
    <ListMoviesPage
      title={title}
      subtitle={proposalsQuery.data ? subtitleOf(proposalsQuery.data, kind, t) : null}
      items={entries}
      isLoading={proposalsQuery.isPending}
      isError={proposalsQuery.isError}
      storageScope="proposals"
      storageListId={winningOnly ? 'winning' : undefined}
      emptyIcon={<EmptyIcon aria-hidden size={ICON_SIZE['3xl']} />}
      labels={{
        listAria: t(`myProposals.${kind}.listAria`),
        loading: t(`myProposals.${kind}.loading`),
        loadError: t(`myProposals.${kind}.loadError`),
        searchLabel: t(`myProposals.${kind}.searchLabel`),
        searchPlaceholder: t('myProposals.searchPlaceholder'),
        searchPlaceholderShort: t('myProposals.searchPlaceholderShort'),
        emptyTitle: t(`myProposals.${kind}.emptyTitle`),
        emptyMessage: t(`myProposals.${kind}.emptyMessage`),
      }}
      toolbarOptions={{ sorts }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        showListBadge: false,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        leadingBadge: timesBadgeSlot(kind, t),
        error: watchlistToggle.error,
      }}
    />
  );
}
