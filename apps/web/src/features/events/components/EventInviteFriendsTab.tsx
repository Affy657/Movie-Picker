import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchX, UserPlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { ROUTES } from '@/app/routes';
import {
  getEligibleFollows,
  sendEventInvitation,
  type EligibleFollowItem,
} from '@/features/events/api/eventsApi';
import styles from './EventInviteFriendsTab.module.css';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';
import EmptyState from '@/shared/components/EmptyState';
import SearchField from '@/shared/components/SearchField';
import { linkButtonClass } from '@/shared/components/LinkButton';

type Props = {
  slug: string;
  onNavigate?: () => void;
};

function matchesQuery(item: EligibleFollowItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.displayName.toLowerCase().includes(q) || item.handle.toLowerCase().includes(q);
}

export default function EventInviteFriendsTab({ slug, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<string | null>(null);

  const followsQuery = useQuery({
    queryKey: queryKeys.event.eligibleFollows(slug),
    queryFn: () => getEligibleFollows(slug),
    staleTime: 30_000,
  });

  const inviteMutation = useMutation({
    mutationFn: (targetUserId: string) => sendEventInvitation(slug, targetUserId),
    onSuccess: (_data, targetUserId) => {
      setInvitedIds((prev) => new Set(prev).add(targetUserId));
      setItemError(null);
      track('invitation_sent');
      queryClient.invalidateQueries({ queryKey: queryKeys.event.eligibleFollows(slug) });
    },
    onError: (err) => {
      setItemError(getErrorMessage(err, t('events.invite.inviteError')));
    },
  });

  const handleInvite = (item: EligibleFollowItem) => {
    if (inviteMutation.isPending) return;
    setItemError(null);
    inviteMutation.mutate(item.userId);
  };

  const follows = useMemo(() => followsQuery.data?.follows ?? [], [followsQuery.data]);
  const filtered = useMemo(
    () => follows.filter((item) => matchesQuery(item, query)),
    [follows, query]
  );

  return (
    <div className={styles.body}>
      {followsQuery.isPending && <p className={styles.loadingState}>{t('common.loading')}</p>}

      {followsQuery.isError && <p className={styles.errorState}>{t('events.invite.loadError')}</p>}

      {!followsQuery.isPending && !followsQuery.isError && follows.length === 0 && (
        <EmptyState
          compact
          icon={<UserPlus aria-hidden size={ICON_SIZE['2xl']} />}
          message={t('events.invite.emptyLine1')}
          actions={
            user?.handle ? (
              <Link
                to={ROUTES.profile(user.handle)}
                onClick={onNavigate}
                className={linkButtonClass()}
              >
                {t('events.invite.emptyLink')}
              </Link>
            ) : undefined
          }
        />
      )}

      {follows.length > 0 && (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('events.invite.searchPlaceholder')}
            ariaLabel={t('events.invite.searchPlaceholder')}
          />

          {itemError && (
            <p className="error" role="alert">
              {itemError}
            </p>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<SearchX aria-hidden size={ICON_SIZE['2xl']} />}
              message={t('events.invite.searchNoResults', { query })}
            />
          ) : (
            <ul className={styles.list}>
              {filtered.map((item) => {
                const isInvited = item.isAlreadyInvited || invitedIds.has(item.userId);
                const isParticipant = item.isAlreadyParticipant;
                const isBusy = inviteMutation.isPending && inviteMutation.variables === item.userId;

                const inviteAction = isInvited ? (
                  <Chip size="sm" tone="success">
                    {t('events.invite.invitedBadge')}
                  </Chip>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleInvite(item)}
                    loading={isBusy}
                    aria-label={t('events.invite.inviteAriaLabel', { name: item.displayName })}
                  >
                    {t('events.invite.inviteAction')}
                  </Button>
                );

                return (
                  <li
                    key={item.userId}
                    className={`${styles.item} ${isParticipant ? styles.itemDisabled : ''}`}
                  >
                    <Avatar avatarId={item.avatarId} pseudo={item.displayName} size="sm" />
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{item.displayName}</div>
                      <div className={styles.itemHandle}>@{item.handle}</div>
                    </div>

                    {isParticipant ? (
                      <Chip size="sm" tone="muted">
                        {t('events.invite.alreadyParticipant')}
                      </Chip>
                    ) : (
                      inviteAction
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
