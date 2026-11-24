import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { TabPanel } from '@/shared/components/Tabs';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getErrorMessage } from '@/shared/api/apiError';
import {
  fetchFollowing,
  fetchFollowers,
  followUser,
  unfollowUser,
  searchUsers,
  type FollowUserItem,
} from '@/features/profile/api/profileApi';
import { invalidateFollowGraph } from '@/features/profile/lib/invalidateFollowGraph';
import FollowListRow from './FollowListRow';
import FollowListTabs, { FOLLOW_LIST_TABS_ID, type FollowListTab } from './FollowListTabs';
import FollowListTabPanel from './FollowListTabPanel';
import FollowSearchBar, { MIN_SEARCH_LENGTH } from './FollowSearchBar';
import FollowSearchResults from './FollowSearchResults';
import styles from './FollowListModal.module.css';

const SEARCH_DEBOUNCE_MS = 300;

type FollowListQuery = UseQueryResult<{ items: FollowUserItem[] }>;

type FollowFocusAnchor = { handle: string; next: readonly string[] };

function followButtonOf(handle: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-follow-handle="${CSS.escape(handle)}"]`);
}

function anchorFor(handle: string): FollowFocusAnchor {
  const order = [...document.querySelectorAll<HTMLElement>('[data-follow-handle]')].map(
    (element) => element.dataset.followHandle ?? ''
  );
  return { handle, next: order.slice(order.indexOf(handle) + 1) };
}

function focusIsLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body;
}

function restoreFollowFocus(anchor: FollowFocusAnchor, fallback: HTMLElement | null) {
  const target =
    followButtonOf(anchor.handle) ??
    anchor.next.map(followButtonOf).find((element) => element !== null) ??
    fallback;
  target?.focus();
}

function membersOfBothLists(
  followers: FollowListQuery,
  following: FollowListQuery,
  locale: string
): FollowUserItem[] {
  const byHandle = new Map<string, FollowUserItem>();
  for (const item of [...(followers.data?.items ?? []), ...(following.data?.items ?? [])]) {
    if (!byHandle.has(item.handle)) byHandle.set(item.handle, item);
  }
  return [...byHandle.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, locale, { sensitivity: 'base' })
  );
}

interface Props {
  handle: string;
  initialTab: FollowListTab;
  followingCount: number;
  followersCount: number;
  onClose: () => void;
}

export default function FollowListModal({
  handle,
  initialTab,
  followingCount,
  followersCount,
  onClose,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FollowListTab>(initialTab);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [followError, setFollowError] = useState<string | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const refocusSearchButton = useRef(false);
  const focusAnchorRef = useRef<FollowFocusAnchor | null>(null);
  const canSearch = Boolean(user);
  const searching = searchOpen && canSearch;
  const term = query.trim();
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);
  const globalSearchEnabled = searching && debouncedTerm.length >= MIN_SEARCH_LENGTH;

  const followersQuery = useQuery({
    queryKey: queryKeys.profile.followers(handle),
    queryFn: () => fetchFollowers(handle),
    enabled: searching || tab === 'followers',
  });

  const followingQuery = useQuery({
    queryKey: queryKeys.profile.following(handle),
    queryFn: () => fetchFollowing(handle),
    enabled: searching || tab === 'following',
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.profile.userSearch(debouncedTerm),
    queryFn: () => searchUsers(debouncedTerm),
    enabled: globalSearchEnabled,
  });

  const mutationHandlers = {
    onSuccess: () => {
      setFollowError(null);
      void invalidateFollowGraph(queryClient);
    },
    onError: (err: unknown) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  };

  const followMutation = useMutation({
    mutationFn: (h: string) => followUser(h),
    ...mutationHandlers,
  });

  const unfollowMutation = useMutation({
    mutationFn: (h: string) => unfollowUser(h),
    ...mutationHandlers,
  });

  useEffect(() => {
    if (searchOpen || !refocusSearchButton.current) return;
    refocusSearchButton.current = false;
    searchButtonRef.current?.focus();
  }, [searchOpen]);

  const pendingHandles = new Set(
    [followMutation, unfollowMutation]
      .filter((mutation) => mutation.isPending)
      .map((mutation) => mutation.variables)
  );
  const togglePending = pendingHandles.size > 0;

  const listsFetching =
    followersQuery.isFetching || followingQuery.isFetching || searchQuery.isFetching;

  useEffect(() => {
    const anchor = focusAnchorRef.current;
    if (!anchor || togglePending || listsFetching) return;
    focusAnchorRef.current = null;
    if (focusIsLost()) restoreFollowFocus(anchor, searchButtonRef.current);
  }, [togglePending, listsFetching]);

  const renderRow = (item: FollowUserItem, highlight: string): ReactNode => (
    <FollowListRow
      key={item.handle}
      item={item}
      isMe={user?.handle === item.handle}
      canFollow={Boolean(user) && user?.handle !== item.handle && item.isFollowedByMe !== null}
      pending={pendingHandles.has(item.handle)}
      highlight={highlight}
      onToggleFollow={(target) => {
        if (pendingHandles.has(target.handle)) return;
        focusAnchorRef.current = anchorFor(target.handle);
        const mutation = target.isFollowedByMe ? unfollowMutation : followMutation;
        mutation.mutate(target.handle);
      }}
      onNavigate={onClose}
    />
  );

  const closeSearch = () => {
    refocusSearchButton.current = true;
    setSearchOpen(false);
    setQuery('');
  };

  const searchButton = canSearch ? (
    <IconButton
      ref={searchButtonRef}
      size="lg"
      ariaLabel={t('profile.follow.search.tabAriaLabel')}
      onClick={() => setSearchOpen(true)}
    >
      <Search size={ICON_SIZE.lg} aria-hidden />
    </IconButton>
  ) : undefined;

  const listQuery = tab === 'followers' ? followersQuery : followingQuery;

  return (
    <ResponsiveDialog
      open
      title={t('profile.follow.listTitle')}
      onClose={onClose}
      size="sm"
      sheetSize="lg"
      fixedHeight="md"
      bodyClassName={styles.body}
      headerActions={searchButton}
      headerReplacement={
        searching ? (
          <FollowSearchBar value={query} onChange={setQuery} onCancel={closeSearch} />
        ) : undefined
      }
      tabs={
        searching ? undefined : (
          <FollowListTabs
            tab={tab}
            followingCount={followingCount}
            followersCount={followersCount}
            onSelect={setTab}
          />
        )
      }
    >
      {followError ? (
        <p className="error" role="alert">
          {followError}
        </p>
      ) : null}
      {searching ? (
        <FollowSearchResults
          term={term}
          debouncedTerm={debouncedTerm}
          members={membersOfBothLists(followersQuery, followingQuery, locale)}
          membersPending={followersQuery.isPending || followingQuery.isPending}
          membersFailed={[followersQuery, followingQuery].some(
            (list) => list.isError && !list.data
          )}
          onRetryMembers={() => {
            for (const failed of [followersQuery, followingQuery]) {
              if (failed.isError) void failed.refetch();
            }
          }}
          ownLists={user?.handle === handle}
          globalQuery={searchQuery}
          globalEnabled={globalSearchEnabled}
          renderRow={renderRow}
        />
      ) : (
        <TabPanel idBase={FOLLOW_LIST_TABS_ID} tabKey={tab} active className={styles.panel}>
          <FollowListTabPanel
            tab={tab}
            listQuery={listQuery}
            listedCount={tab === 'followers' ? followersCount : followingCount}
            renderRow={renderRow}
          />
        </TabPanel>
      )}
    </ResponsiveDialog>
  );
}
