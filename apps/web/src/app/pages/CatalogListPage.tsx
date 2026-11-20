import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router';
import { Film } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useTranslation, type Translate } from '@/shared/i18n';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ListMoviesPage from '@/features/library/components/ListMoviesPage';
import ListNotFound from '@/features/library/components/ListNotFound';
import { CatalogSource } from '@/features/library/components/ListSource';
import SaveListAction from '@/features/library/components/SaveListAction';
import { sourceOrderSorts } from '@/features/library/components/WatchlistToolbar';
import type { SavedListSource } from '@/features/library/api/savedListsApi';
import type { LibraryEntry } from '@/features/library/hooks/useLibraryToolbar';
import { useSavedListToggle } from '@/features/library/hooks/useSavedLists';
import { useWatchedKeys } from '@/features/library/hooks/useWatched';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import { listCountLabel, withWatchedCount } from '@/features/library/utils/listCount';
import { listPageLabels } from '@/features/library/utils/listPageLabels';
import { watchedPercent } from '@/features/library/utils/listProgress';
import type { ShowcaseQuery, ShowcaseTheme } from '@/features/movies/api/showcaseApi';
import { useMovieCollection, useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { isShowcaseTheme, THEME_LABEL_KEYS } from '@/features/movies/showcaseSections';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';
import { readShowcaseListArrival } from './showcaseListState';

export type CatalogListVariant = 'collection' | 'theme';

type CatalogSelection =
  { variant: 'collection'; collectionId: number } | { variant: 'theme'; theme: ShowcaseTheme };

function selectionOf(
  variant: CatalogListVariant,
  params: { collectionId?: string; theme?: string }
): CatalogSelection | null {
  if (variant === 'theme')
    return isShowcaseTheme(params.theme) ? { variant, theme: params.theme } : null;
  const collectionId = Number(params.collectionId);
  return Number.isSafeInteger(collectionId) && collectionId > 0 ? { variant, collectionId } : null;
}

function queryOf(selection: CatalogSelection | null): ShowcaseQuery {
  if (selection?.variant === 'theme') return { section: 'theme', theme: selection.theme };
  return { section: 'collection', collectionId: selection?.collectionId };
}

function sourceOf(selection: CatalogSelection | null): SavedListSource | null {
  if (!selection) return null;
  return selection.variant === 'theme'
    ? { sourceType: 'explorerTheme', sourceId: selection.theme }
    : { sourceType: 'tmdbCollection', sourceId: String(selection.collectionId) };
}

function backOf(variant: CatalogListVariant, t: Translate) {
  return variant === 'collection'
    ? { to: ROUTES.movieCollections, label: t('showcase.sections.collectionsTitle') }
    : { to: ROUTES.home, label: t('showcase.backToHome') };
}

function catalogName(
  selection: CatalogSelection | null,
  collectionName: string | undefined,
  t: Translate
): string | null {
  if (selection?.variant === 'theme') return t(THEME_LABEL_KEYS[selection.theme]);
  return collectionName ? collectionDisplayName(collectionName) : null;
}

export default function CatalogListPage({ variant }: Readonly<{ variant: CatalogListVariant }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSignedIn = !!user;
  const params = useParams<{ collectionId?: string; theme?: string }>();
  const location = useLocation();
  const arrival = readShowcaseListArrival(location.state);

  const selection = useMemo(
    () => selectionOf(variant, { collectionId: params.collectionId, theme: params.theme }),
    [variant, params.collectionId, params.theme]
  );
  const query = useMemo(() => queryOf(selection), [selection]);
  const source = useMemo(() => sourceOf(selection), [selection]);

  const showcase = useMovieShowcase(query, selection !== null);
  const saga = useMovieCollection(
    selection?.variant === 'collection' ? selection.collectionId : null
  );

  const savedToggle = useSavedListToggle(source, isSignedIn);
  const watchedKeys = useWatchedKeys(isSignedIn && selection !== null);
  const watchlistToggle = useWatchlistToggle(isSignedIn);

  const rows = showcase.data?.items;
  const items = useMemo<LibraryEntry[]>(
    () =>
      (rows ?? []).map((row) => ({
        ...toTitleSummary(row),
        genreIds: row.genreIds ?? [],
        runtimeMinutes: row.runtimeMinutes ?? null,
        createdAt: '',
      })),
    [rows]
  );

  const sorts = useMemo(() => sourceOrderSorts(t), [t]);

  const name = catalogName(selection, arrival.collectionName ?? saga?.name, t);

  usePageSeo({
    title: pageTitle(name ?? t('showcase.sections.collectionsTitle')),
    description: t(
      variant === 'collection'
        ? 'showcase.sections.collectionsSubtitle'
        : 'showcase.sections.themeSubtitle'
    ),
    noindex: true,
  });

  if (!selection) {
    return (
      <ListNotFound
        title={t('showcase.unknownSelection')}
        message={t('showcase.unknownSelectionMessage')}
        back={{ to: ROUTES.home, label: t('showcase.backToHome') }}
      />
    );
  }

  const watched = watchedKeys.ready ? watchedKeys.countAmong(items) : 0;
  const isWatched = isSignedIn ? (entry: LibraryEntry) => watchedKeys.has(entry) : undefined;

  return (
    <ListMoviesPage
      title={name}
      subtitle={rows ? withWatchedCount(listCountLabel(items.length, t), watched, t) : null}
      description={saga?.overview}
      items={items}
      isLoading={showcase.isPending}
      isError={showcase.isError}
      storageScope="catalog"
      storageListId={source?.sourceId ? `${variant}_${source.sourceId}` : undefined}
      randomPick={{ historyKey: 'catalog.randomPick', source: 'catalog' }}
      emptyIcon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
      labels={{
        ...listPageLabels(
          name ?? '',
          { title: t('showcase.empty'), message: t('showcase.emptyMessage') },
          t
        ),
        loadError: t('showcase.error'),
      }}
      header={{
        back: backOf(variant, t),
        progress: watchedPercent(watched, items.length),
        source: <CatalogSource kind={variant === 'collection' ? 'saga' : 'selection'} />,
        primary: isSignedIn
          ? ({ isMobile }) => <SaveListAction isSignedIn compact={isMobile} toggle={savedToggle} />
          : undefined,
      }}
      toolbarOptions={{ sorts }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched,
        showListBadge: true,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: savedToggle.error ?? watchlistToggle.error,
      }}
    />
  );
}
