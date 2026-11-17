import { useMemo, useState, type ComponentProps } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { BookmarkPlus, Copy, Link2, Rows3 } from 'lucide-react';
import { buttonClass } from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import { MenuItem } from '@/shared/components/Menu';
import PageLayout from '@/shared/components/PageLayout';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation, type Translate } from '@/shared/i18n';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ListActionsMenu from '@/features/watchlist/components/ListActionsMenu';
import ListMoviesPage from '@/features/watchlist/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/watchlist/components/WatchlistToolbar';
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import { useDimWatched } from '@/features/watched/hooks/useDimWatched';
import type { ListCreator } from '@/features/lists/api/listsApi';
import type { PublicListDetail } from '@/features/lists/api/publicListsApi';
import type { SavedListSource } from '@/features/lists/api/savedListsApi';
import AvatarOverline from '@/features/lists/components/AvatarOverline';
import CopyLinkStatus from '@/features/lists/components/CopyLinkStatus';
import ListFormDialog from '@/features/lists/components/ListFormDialog';
import ListNotFound from '@/features/lists/components/ListNotFound';
import ListProgress from '@/features/lists/components/ListProgress';
import SavedToggleButton from '@/features/lists/components/SavedToggleButton';
import { usePublicList } from '@/features/lists/hooks/usePublicLists';
import { useSavedListToggle } from '@/features/lists/hooks/useSavedLists';
import { useListItemsView } from '@/features/lists/hooks/useListItemsView';
import { publicListCountLabel } from '@/features/lists/utils/listCount';
import { firstName, withElision } from '@/features/lists/utils/listMembers';
import { listPageLabels } from '@/features/lists/utils/listPageLabels';

function creatorName(creator: ListCreator | undefined): string | null {
  return creator ? firstName(creator.displayName) : null;
}

function backToLists(handle: string, creator: ListCreator | undefined, t: Translate) {
  const name = creatorName(creator);
  return {
    to: ROUTES.profileLists(handle),
    label: name
      ? withElision(name, 'lists.public.pageTitle', 'lists.public.pageTitleElided', t)
      : t('lists.public.backToHandle', { handle }),
  };
}

function canonicalPathOf(list: PublicListDetail): string {
  return ROUTES.publicList(list.creator.handle, list.id);
}

function publicListSeo(list: PublicListDetail | undefined, isError: boolean, t: Translate) {
  if (isError) return { title: pageTitle(t('lists.page.loadError')), noindex: true };
  if (!list) return { title: pageTitle(t('lists.page.loading')) };
  return {
    title: pageTitle(list.name),
    description: t('lists.public.listSeoDescription', {
      name: list.name,
      creator: list.creator.displayName,
      handle: list.creator.handle,
    }),
    canonical: absoluteUrl(canonicalPathOf(list)),
  };
}

function PublicListLoadError({
  handle,
  onRetry,
}: Readonly<{ handle: string; onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <h1 className="visually-hidden">{t('lists.public.overline', { handle })}</h1>
      <InlineError
        message={t('lists.page.loadError')}
        retryLabel={t('lists.public.retry')}
        onRetry={onRetry}
      />
    </PageLayout>
  );
}

function CreatorOverline({ creator }: Readonly<{ creator: ListCreator }>) {
  const { t } = useTranslation();
  return (
    <AvatarOverline avatarId={creator.avatarId} pseudo={creator.displayName}>
      {t('lists.public.overline', { handle: creator.handle })}
    </AvatarOverline>
  );
}

function SaveForVisitor({ compact }: Readonly<{ compact: boolean }>) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <Link
      to={withReturnTo(ROUTES.login, pathname)}
      className={buttonClass({ size: compact ? 'sm' : 'md' })}
    >
      <BookmarkPlus aria-hidden size={ICON_SIZE.md} />
      <span>{t(compact ? 'lists.saved.saveShort' : 'lists.saved.save')}</span>
    </Link>
  );
}

function SaveAction({
  isSignedIn,
  compact,
  toggle,
}: Readonly<{
  isSignedIn: boolean;
  compact: boolean;
  toggle: ReturnType<typeof useSavedListToggle>;
}>) {
  if (!isSignedIn) return <SaveForVisitor compact={compact} />;
  return (
    <SavedToggleButton
      saved={toggle.saved}
      compact={compact}
      disabled={toggle.isLoading || toggle.isPending}
      onClick={toggle.toggle}
    />
  );
}

function useCreatorOrderSorts(creator: ListCreator | undefined): WatchlistSortConfig {
  const { t } = useTranslation();
  const ownerName = creatorName(creator);
  return useMemo(
    () => ({
      keys: ['relevance', 'title', 'year'],
      labels: {
        relevance: ownerName
          ? withElision(
              ownerName,
              'lists.public.creatorOrder',
              'lists.public.creatorOrderElided',
              t
            )
          : undefined,
        year: t('lists.saved.sortYear'),
      },
      defaultKey: 'relevance',
    }),
    [ownerName, t]
  );
}

function PublicListCopyDialog({
  list,
  onClose,
}: Readonly<{ list: PublicListDetail; onClose: () => void }>) {
  const navigate = useNavigate();
  return (
    <ListFormDialog
      mode="copy"
      copyOf={{
        publicList: { handle: list.creator.handle, listId: list.id },
        name: list.name,
        sourceType: 'memberList',
      }}
      onClose={onClose}
      onSaved={(created) => {
        onClose();
        void navigate(ROUTES.list(created.id));
      }}
    />
  );
}

function PublicListMenu({
  list,
  onCopy,
}: Readonly<{ list: PublicListDetail; onCopy?: () => void }>) {
  const { t } = useTranslation();
  const share = useShareAction(absoluteUrl(canonicalPathOf(list)), list.name, undefined, 'list');
  return (
    <>
      <CopyLinkStatus copied={share.copied} />
      <ListActionsMenu>
        {(pick) => (
          <>
            {onCopy ? (
              <MenuItem
                icon={<Copy aria-hidden size={ICON_SIZE.sm} />}
                aria-haspopup="dialog"
                onClick={pick(onCopy)}
              >
                {t('lists.saved.copy')}
              </MenuItem>
            ) : null}
            <MenuItem
              icon={<Link2 aria-hidden size={ICON_SIZE.sm} />}
              onClick={pick(() => void share.copyLink())}
            >
              {t('lists.page.copyLink')}
            </MenuItem>
          </>
        )}
      </ListActionsMenu>
    </>
  );
}

type ListMoviesProps = ComponentProps<typeof ListMoviesPage>;

interface PublicListHeaderArgs {
  handle: string;
  list: PublicListDetail | undefined;
  isSignedIn: boolean;
  watched: number;
  savedToggle: ReturnType<typeof useSavedListToggle>;
  onCopy: () => void;
  t: Translate;
}

function publicListHeader({
  handle,
  list,
  isSignedIn,
  watched,
  savedToggle,
  onCopy,
  t,
}: PublicListHeaderArgs): ListMoviesProps['header'] {
  const back = backToLists(handle, list?.creator, t);
  if (!list) return { back, stackedOnMobile: true };
  const total = list.items.length;
  return {
    back,
    overline: <CreatorOverline creator={list.creator} />,
    stackedOnMobile: true,
    leading: ({ isMobile }) => (
      <SaveAction isSignedIn={isSignedIn} compact={isMobile} toggle={savedToggle} />
    ),
    progress: isSignedIn && total > 0 ? <ListProgress watched={watched} total={total} /> : null,
    menu: <PublicListMenu list={list} onCopy={isSignedIn ? onCopy : undefined} />,
  };
}

export default function PublicListPage() {
  const { t } = useTranslation();
  const { handle = '', listId = '' } = useParams();
  const { user } = useAuth();
  const isSignedIn = !!user;
  const listQuery = usePublicList(handle, listId);
  const list = listQuery.data;
  const notFound = listQuery.isError && isNotFoundError(listQuery.error);
  usePageSeo(publicListSeo(list, listQuery.isError, t));

  const source = useMemo<SavedListSource>(
    () => ({ sourceType: 'memberList', sourceId: listId }),
    [listId]
  );
  const savedToggle = useSavedListToggle(source, isSignedIn && !list?.viewerRole);
  const watchlistToggle = useWatchlistToggle(isSignedIn);
  const dim = useDimWatched();
  const [copyOpen, setCopyOpen] = useState(false);

  const { items, watchedCount, isWatched } = useListItemsView(list);
  const sorts = useCreatorOrderSorts(list?.creator);

  if (notFound) {
    return (
      <ListNotFound
        title={t('lists.public.notFoundTitle')}
        message={t('lists.public.notFoundMessage')}
        back={{ to: ROUTES.profile(handle), label: t('lists.public.notFoundBack', { handle }) }}
      />
    );
  }
  if (listQuery.isError) {
    return <PublicListLoadError handle={handle} onRetry={() => void listQuery.refetch()} />;
  }
  if (list?.viewerRole) return <Navigate to={ROUTES.list(list.id)} replace />;

  const name = list?.name ?? null;

  return (
    <ListMoviesPage
      title={name}
      subtitle={list ? publicListCountLabel(list, t) : null}
      description={list?.description}
      items={items}
      isLoading={listQuery.isPending}
      isError={false}
      storageScope="publicList"
      storageListId={listId}
      emptyIcon={<Rows3 aria-hidden size={ICON_SIZE['3xl']} />}
      labels={listPageLabels(
        name ?? '',
        { title: t('lists.page.emptyTitle'), message: t('lists.public.listEmptyMessage') },
        t
      )}
      header={publicListHeader({
        handle,
        list,
        isSignedIn,
        watched: watchedCount,
        savedToggle,
        onCopy: () => setCopyOpen(true),
        t,
      })}
      toolbarOptions={{
        sorts,
        dimWatched: isSignedIn ? { enabled: dim.enabled, onChange: dim.change } : undefined,
      }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched,
        showListBadge: true,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: savedToggle.error ?? dim.error ?? watchlistToggle.error,
      }}
    >
      {copyOpen && list ? (
        <PublicListCopyDialog list={list} onClose={() => setCopyOpen(false)} />
      ) : null}
    </ListMoviesPage>
  );
}
