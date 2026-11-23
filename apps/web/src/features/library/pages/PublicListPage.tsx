import { useMemo, useState, type ComponentProps } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Copy, Link2, Rows3 } from 'lucide-react';
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
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ListActionsMenu from '@/features/library/components/ListActionsMenu';
import ListMoviesPage from '@/features/library/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/library/components/WatchlistToolbar';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import type { ListCreator } from '@/features/library/api/listsApi';
import type { PublicListDetail } from '@/features/library/api/publicListsApi';
import type { SavedListSource } from '@/features/library/api/savedListsApi';
import CopyLinkStatus from '@/features/library/components/CopyLinkStatus';
import ListFormDialog from '@/features/library/components/ListFormDialog';
import ListNotFound from '@/features/library/components/ListNotFound';
import { CreatorSource } from '@/features/library/components/ListSource';
import SaveListAction from '@/features/library/components/SaveListAction';
import { usePublicList } from '@/features/library/hooks/usePublicLists';
import { useSavedListToggle } from '@/features/library/hooks/useSavedLists';
import { useListItemsView } from '@/features/library/hooks/useListItemsView';
import { publicListCountLabel, withWatchedCount } from '@/features/library/utils/listCount';
import { watchedPercent } from '@/features/library/utils/listProgress';
import { firstName } from '@/features/library/utils/listMembers';
import { withElision } from '@/shared/i18n/withElision';
import { listPageLabels } from '@/features/library/utils/listPageLabels';

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
  if (!list) return { back };
  return {
    back,
    progress: isSignedIn ? watchedPercent(watched, list.items.length) : null,
    source: <CreatorSource creator={list.creator} />,
    primary: ({ isMobile }) => (
      <SaveListAction isSignedIn={isSignedIn} compact={isMobile} toggle={savedToggle} />
    ),
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
  const watchedShown = isSignedIn ? watchedCount : 0;

  return (
    <ListMoviesPage
      title={name}
      subtitle={list ? withWatchedCount(publicListCountLabel(list, t), watchedShown, t) : null}
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
      toolbarOptions={{ sorts }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched: isSignedIn ? isWatched : undefined,
        showListBadge: true,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: savedToggle.error ?? watchlistToggle.error,
      }}
    >
      {copyOpen && list ? (
        <PublicListCopyDialog list={list} onClose={() => setCopyOpen(false)} />
      ) : null}
    </ListMoviesPage>
  );
}
