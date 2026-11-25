import { useMemo, useState, type ComponentProps } from 'react';
import { Bookmark, Import } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncsWithLetterboxd } from '@/features/letterboxd/utils/letterboxdSync';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import LetterboxdConnectModal from '@/features/letterboxd/components/LetterboxdConnectModal';
import {
  useAddToWatchlist,
  useWatchlist,
  useWatchlistAvailability,
} from '@/features/movies/hooks/useWatchlist';
import type { WatchlistAvailabilityItem, WatchlistItem } from '@/features/movies/api/watchlistApi';
import { toAddTitleBody } from '@/shared/utils/titleSummary';
import { watchlistItemKey as itemKey } from '@/features/movies/utils/watchlistItemKey';
import type { ToolbarExtraFilter } from '@/features/movies/hooks/useCollectionToolbar';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import { useCollectionVisibility } from '@/features/library/hooks/useCollectionVisibility';
import CollectionVisibilityMenu from '@/features/library/components/CollectionVisibilityMenu';
import type { LibraryEntry } from '@/features/library/hooks/useLibraryToolbar';
import ListMoviesPage from '@/features/library/components/ListMoviesPage';
import LetterboxdGapBanner from '@/features/library/components/LetterboxdGapBanner';
import { watchlistCountLabel } from '@/features/library/utils/watchlistCount';

type WatchlistEntry = WatchlistItem & Pick<LibraryEntry, 'watchProviders' | 'tmdbWatchPageUrl'>;

function mergeAvailability(
  items: WatchlistItem[],
  availability: WatchlistAvailabilityItem[] | undefined
): WatchlistEntry[] {
  if (!availability) return items;
  const byKey = new Map(availability.map((a) => [itemKey(a.tmdbId, a.mediaType), a]));
  return items.map((item) => {
    const found = byKey.get(itemKey(item.tmdbId, item.mediaType));
    if (!found) return item;
    return {
      ...item,
      voteAverage: item.voteAverage ?? found.voteAverage,
      runtimeMinutes: item.runtimeMinutes ?? found.runtimeMinutes,
      watchProviders: found.watchProviders,
      tmdbWatchPageUrl: found.tmdbWatchPageUrl,
    };
  });
}

function LetterboxdButton({
  isMobile,
  iconOnly,
  onOpen,
}: Readonly<{ isMobile: boolean; iconOnly: boolean; onOpen: () => void }>) {
  const { t } = useTranslation();
  if (!isMobile) {
    return (
      <Button type="button" variant="ghost" onClick={onOpen}>
        <Import size={ICON_SIZE.md} aria-hidden />
        <span>{t('watchlist.letterboxdCta')}</span>
      </Button>
    );
  }
  if (iconOnly) {
    return (
      <IconButton ariaLabel={t('watchlist.letterboxdCta')} onClick={onOpen}>
        <Import size={ICON_SIZE.md} aria-hidden />
      </IconButton>
    );
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onOpen}>
      <Import size={ICON_SIZE.sm} aria-hidden />
      <span>{t('watchlist.letterboxdCtaShort')}</span>
    </Button>
  );
}

type ListMoviesHeader = NonNullable<ComponentProps<typeof ListMoviesPage>['header']>;

function letterboxdButtonSlot(connected: boolean, onOpen: () => void): ListMoviesHeader['leading'] {
  return ({ isMobile, hasItems }) =>
    connected ? null : <LetterboxdButton isMobile={isMobile} iconOnly={hasItems} onOpen={onOpen} />;
}

export default function WatchlistPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useNoindexPage(pageTitle(t('watchlist.title')), ROUTES.watchlist);

  const { data: items = [], isLoading, isError } = useWatchlist({ enabled: !!user });
  const availabilityQuery = useWatchlistAvailability({ enabled: !!user && items.length > 0 });
  const availabilityItems = availabilityQuery.data?.items;
  const availabilityPending = availabilityQuery.isPending || !!availabilityQuery.data?.partial;
  const entries = useMemo(
    () => mergeAvailability(items, availabilityItems),
    [items, availabilityItems]
  );
  const [letterboxdModalOpen, setLetterboxdModalOpen] = useState(false);

  const addMutation = useAddToWatchlist();
  const watchlistToggle = useWatchlistToggle(!!user);
  const visibility = useCollectionVisibility('isWatchlistPublic');

  const syncedWithLetterboxd = syncsWithLetterboxd(user, 'watchlist');
  const missingOnLetterboxd = syncedWithLetterboxd
    ? items.filter((item) => item.onLetterboxd === false).length
    : 0;
  const [missingOnly, setMissingOnly] = useState(false);
  const showingMissing = missingOnly && missingOnLetterboxd > 0;
  const missingFilter = useMemo<ToolbarExtraFilter<WatchlistEntry>>(
    () => ({
      matches: (entry) => !showingMissing || entry.onLetterboxd === false,
      active: showingMissing,
      reset: () => setMissingOnly(false),
    }),
    [showingMissing]
  );

  return (
    <ListMoviesPage
      title={t('watchlist.title')}
      subtitle={watchlistCountLabel(items.length, t)}
      items={entries}
      isLoading={isLoading}
      isError={isError}
      availabilityPending={availabilityPending}
      storageScope="watchlist"
      randomPick={{ historyKey: 'watchlist.randomPick', source: 'watchlist' }}
      emptyIcon={<Bookmark aria-hidden size={ICON_SIZE['3xl']} />}
      labels={{
        listAria: t('watchlist.listAria'),
        loading: t('watchlist.loadingDetail'),
        loadError: t('watchlist.loadError'),
        addPanelTitle: t('watchlist.addPanel.title'),
        emptyTitle: t('watchlist.empty.title'),
        emptyMessage: t('watchlist.empty.message'),
      }}
      toolbarOptions={{
        scopeFilter: missingFilter,
        banner:
          missingOnLetterboxd > 0 ? (
            <LetterboxdGapBanner
              count={missingOnLetterboxd}
              showing={showingMissing}
              onShow={() => setMissingOnly(true)}
              onShowAll={() => setMissingOnly(false)}
            />
          ) : null,
      }}
      header={{
        letterboxdSynced: syncedWithLetterboxd,
        menu: visibility.ready ? (
          <CollectionVisibilityMenu isPublic={visibility.isPublic} onChange={visibility.change} />
        ) : null,
        leading: letterboxdButtonSlot(!!user?.letterboxdUsername, () =>
          setLetterboxdModalOpen(true)
        ),
      }}
      card={{
        inWatchlist: () => true,
        showListBadge: false,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: visibility.error ?? watchlistToggle.error,
      }}
      onAddItem={async (item) => {
        await addMutation.mutateAsync(toAddTitleBody(item));
      }}
    >
      {letterboxdModalOpen && (
        <LetterboxdConnectModal open onClose={() => setLetterboxdModalOpen(false)} />
      )}
    </ListMoviesPage>
  );
}
