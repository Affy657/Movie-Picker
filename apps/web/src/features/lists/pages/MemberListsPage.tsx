import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Rows3 } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { isNotFoundError } from '@/shared/api/apiError';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import ProfileCollectionHeader from '@/features/profile/components/ProfileCollectionHeader';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';
import { profileCollectionSeo } from '@/features/profile/utils/profileCollectionSeo';
import MovieCollectionCard from '@/features/movies/components/MovieCollectionCard';
import type { PublicListSummary } from '@/features/lists/api/publicListsApi';
import {
  ListCardProgress,
  ListsSkeleton,
  listGridClass,
} from '@/features/lists/components/ListCards';
import ListSummaryToolbar, {
  useListSummaryFilters,
} from '@/features/lists/components/ListSummaryToolbar';
import { usePublicLists } from '@/features/lists/hooks/usePublicLists';
import { publicListCountLabel } from '@/features/lists/utils/listCount';
import { withElision } from '@/features/lists/utils/listMembers';
import {
  matchesListSearch,
  sortListSummaries,
  type ListSortKey,
} from '@/features/lists/utils/listSummaries';
import { posterStackSources } from '@/features/movies/utils/posterStack';
import styles from './MemberListsPage.module.css';

const MEMBER_LIST_SORTS: readonly ListSortKey[] = ['recent', 'name', 'size'];

function memberListsTitle(displayName: string, t: Translate): string {
  return withElision(displayName, 'lists.public.pageTitle', 'lists.public.pageTitleElided', t);
}

function memberListsSeo(profile: PublicProfile | undefined, notFound: boolean, t: Translate) {
  return profileCollectionSeo(
    profile,
    notFound,
    t,
    {
      pageTitle: (name) => memberListsTitle(name, t),
      seoDescription: (member) =>
        t('lists.public.seoDescription', { name: member.displayName, handle: member.handle }),
    },
    ROUTES.profileLists
  );
}

function PublicListCard({ handle, list }: Readonly<{ handle: string; list: PublicListSummary }>) {
  const { t } = useTranslation();
  const watchedCount = list.watchedCount;
  return (
    <MovieCollectionCard
      to={ROUTES.publicList(handle, list.id)}
      name={list.name}
      movieCountLabel={publicListCountLabel(list, t)}
      stackSrcs={posterStackSources(list.posterPaths)}
      extra={
        watchedCount != null && list.itemCount > 0 ? (
          <ListCardProgress watched={watchedCount} total={list.itemCount} viewer />
        ) : undefined
      }
    />
  );
}

function PublicListsCollection({
  handle,
  lists,
}: Readonly<{ handle: string; lists: readonly PublicListSummary[] }>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const filters = useListSummaryFilters();
  const { search, sortBy, sortDir } = filters;
  const visible = useMemo(
    () =>
      sortListSummaries(
        lists.filter((list) => matchesListSearch(list.name, search)),
        sortBy,
        sortDir
      ),
    [lists, search, sortBy, sortDir]
  );

  return (
    <>
      <ListSummaryToolbar
        filters={filters}
        sortKeys={MEMBER_LIST_SORTS}
        visibleCount={visible.length}
        total={lists.length}
        isMobile={isMobile}
      />
      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={<Rows3 aria-hidden size={ICON_SIZE['2xl']} />}
          title={t('lists.public.noMatchTitle')}
          message={t('lists.public.noMatchMessage')}
        />
      ) : (
        <ul className={listGridClass} aria-label={t('lists.public.gridAria')}>
          {visible.map((list) => (
            <PublicListCard key={list.id} handle={handle} list={list} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function MemberListsPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const profileQuery = usePublicProfile(handle);
  const listsQuery = usePublicLists(handle);
  const profile = profileQuery.data;
  const notFound =
    !handle ||
    (profileQuery.isError && isNotFoundError(profileQuery.error)) ||
    (listsQuery.isError && isNotFoundError(listsQuery.error));

  usePageSeo(memberListsSeo(profile, notFound, t));

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className={styles.layout}>
        <ListsSkeleton label={t('profile.loading')} />
      </PageLayout>
    );
  }
  if (notFound) return <ProfileNotFoundState handle={handle} />;
  if (profileQuery.isError || !profile) {
    return <ProfileLoadErrorState error={profileQuery.error} />;
  }

  const lists = listsQuery.data;
  let body;
  if (listsQuery.isPending) {
    body = <ListsSkeleton label={t('lists.public.loading')} />;
  } else if (!lists) {
    body = (
      <InlineError
        message={t('lists.public.loadError')}
        retryLabel={t('lists.public.retry')}
        onRetry={() => void listsQuery.refetch()}
      />
    );
  } else if (lists.length === 0) {
    body = (
      <EmptyState
        icon={<Rows3 aria-hidden size={ICON_SIZE['3xl']} />}
        title={t('lists.public.emptyTitle')}
        message={t('lists.public.emptyMessage')}
      />
    );
  } else {
    body = <PublicListsCollection handle={profile.handle} lists={lists} />;
  }

  return (
    <PageLayout className={styles.layout}>
      <ProfileCollectionHeader
        profile={profile}
        title={memberListsTitle(profile.displayName, t)}
        subtitle={
          lists
            ? pluralizeCount(lists.length, 'lists.public.countOne', 'lists.public.count', t, {
                count: lists.length,
              })
            : null
        }
      />
      {body}
    </PageLayout>
  );
}
