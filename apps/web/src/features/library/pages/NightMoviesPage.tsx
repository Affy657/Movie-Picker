import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Clapperboard, Plus, Trophy } from 'lucide-react';
import { buttonClass } from '@/shared/components/Button';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation, type Translate } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { ToolbarExtraFilter } from '@/features/movies/hooks/useCollectionToolbar';
import { ProfileCardBadge } from '@/features/movies/components/OwnerRatingBadge';
import type { MovieContributor } from '@/features/movies/components/movieCardParts';
import ListMoviesPage, {
  type ListMoviesCardActions,
} from '@/features/library/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/library/components/WatchlistToolbar';
import type { NightMovie, NightMovieProposer } from '@/features/library/api/nightMoviesApi';
import { useNightMovies } from '@/features/library/hooks/useNightMovies';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import { listCountLabel } from '@/features/library/utils/listCount';
import { contributorFrom } from '@/features/library/utils/listMembers';

type NightScope = 'all' | 'winners' | 'mine';

type NightEntry = NightMovie & { createdAt: string };

const NO_MOVIES: NightMovie[] = [];

const SCOPE_MATCHES: Readonly<Record<NightScope, (entry: NightEntry) => boolean>> = {
  all: () => true,
  winners: (entry) => entry.isWinner,
  mine: (entry) => entry.proposedByMe,
};

function toEntry(movie: NightMovie): NightEntry {
  return { ...movie, createdAt: movie.lastProposedAt };
}

function contributorOf(proposer: NightMovieProposer | null, t: Translate): MovieContributor | null {
  if (!proposer) return null;
  return contributorFrom(
    { avatarId: proposer.avatarId, name: proposer.pseudo, isViewer: proposer.isMe },
    { byYou: 'nightMovies.page.proposedByYou', by: 'nightMovies.page.proposedBy' },
    t
  );
}

function WinnerBadge() {
  const { t } = useTranslation();
  return (
    <ProfileCardBadge
      description={t('nightMovies.page.winnerBadgeAria')}
      icon={<Trophy size={ICON_SIZE.xs} aria-hidden />}
    >
      {t('nightMovies.page.winnerBadge')}
    </ProfileCardBadge>
  );
}

const winnerBadgeSlot: ListMoviesCardActions<NightEntry>['leadingBadge'] = (entry) =>
  entry.isWinner ? <WinnerBadge /> : null;

function ScopeFilter({
  value,
  onChange,
  compact,
}: Readonly<{ value: NightScope; onChange: (value: NightScope) => void; compact: boolean }>) {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      { value: 'all' as const, label: t('nightMovies.page.scopeAll') },
      { value: 'winners' as const, label: t('nightMovies.page.scopeWinners') },
      { value: 'mine' as const, label: t('nightMovies.page.scopeMine') },
    ],
    [t]
  );
  return (
    <SegmentedRadioGroup
      id="night-movies-scope"
      options={options}
      value={value}
      onChange={onChange}
      ariaLabel={t('nightMovies.page.scopeLabel')}
      size={compact ? 'sm' : 'md'}
    />
  );
}

function EmptyActions() {
  const { t } = useTranslation();
  return (
    <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
      <Plus size={ICON_SIZE.md} aria-hidden />
      <span>{t('nightMovies.page.emptyAction')}</span>
    </Link>
  );
}

export default function NightMoviesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  useNoindexPage(pageTitle(t('nightMovies.title')), ROUTES.nightMovies);

  const nightMoviesQuery = useNightMovies({ enabled: !!user });
  const watchlistToggle = useWatchlistToggle(!!user);
  const [scope, setScope] = useState<NightScope>('all');

  const movies = nightMoviesQuery.data ?? NO_MOVIES;
  const entries = useMemo(() => movies.map(toEntry), [movies]);

  const sorts = useMemo<WatchlistSortConfig>(
    () => ({
      keys: ['createdAt', 'title', 'year'],
      labels: {
        createdAt: t('nightMovies.page.sortProposedAt'),
        year: t('nightMovies.page.sortYear'),
      },
    }),
    [t]
  );

  const scopeFilter = useMemo<ToolbarExtraFilter<NightEntry> & { control: ReactNode }>(
    () => ({
      control: <ScopeFilter value={scope} onChange={setScope} compact={isMobile} />,
      matches: SCOPE_MATCHES[scope],
      active: scope !== 'all',
      reset: () => setScope('all'),
    }),
    [scope, isMobile]
  );

  const contributor = useMemo<ListMoviesCardActions<NightEntry>['contributor']>(
    () => ({
      columnLabel: t('nightMovies.page.proposedByColumn'),
      of: (entry) => contributorOf(entry.lastProposer, t),
    }),
    [t]
  );

  return (
    <ListMoviesPage
      title={t('nightMovies.title')}
      subtitle={nightMoviesQuery.data ? listCountLabel(nightMoviesQuery.data.length, t) : null}
      description={t('nightMovies.page.description')}
      items={entries}
      isLoading={nightMoviesQuery.isPending}
      isError={nightMoviesQuery.isError}
      storageScope="nightMovies"
      emptyIcon={<Clapperboard aria-hidden size={ICON_SIZE['3xl']} />}
      emptyActions={<EmptyActions />}
      labels={{
        listAria: t('nightMovies.title'),
        loading: t('nightMovies.page.loading'),
        loadError: t('nightMovies.page.loadError'),
        searchLabel: t('nightMovies.page.searchLabel'),
        searchPlaceholder: t('nightMovies.page.searchPlaceholder'),
        searchPlaceholderShort: t('nightMovies.page.searchPlaceholderShort'),
        emptyTitle: t('nightMovies.page.emptyTitle'),
        emptyMessage: t('nightMovies.page.emptyMessage'),
      }}
      toolbarOptions={{ sorts, scopeFilter }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        showListBadge: false,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        leadingBadge: winnerBadgeSlot,
        isWatched: (entry) => entry.isWatched,
        contributor,
        error: watchlistToggle.error,
      }}
    />
  );
}
