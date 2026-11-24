import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, SearchX, UserPlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button, { buttonClass } from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import PersonRow from '@/shared/components/PersonRow';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';
import {
  getEligibleFollows,
  sendEventInvitation,
  type EligibleFollowItem,
} from '@/features/events/api/eventsApi';
import styles from './EventInviteFriends.module.css';

type Props = {
  slug: string;
  focusSearch?: boolean;
  onNavigate?: () => void;
};

function matchesQuery(item: EligibleFollowItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.displayName.toLowerCase().includes(q) || item.handle.toLowerCase().includes(q);
}

export default function EventInviteFriends({
  slug,
  focusSearch = false,
  onNavigate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const headingId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.event.eligibleFollows(slug) });
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
  const hasFollows = follows.length > 0;

  useEffect(() => {
    if (!focusSearch || !hasFollows) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusSearch, hasFollows]);

  const actionOf = (item: EligibleFollowItem) => {
    if (item.isAlreadyParticipant) {
      return <span className={styles.state}>{t('events.invite.alreadyParticipant')}</span>;
    }
    if (item.isAlreadyInvited || invitedIds.has(item.userId)) {
      return (
        <span className={styles.invited}>
          <Check size={ICON_SIZE.md} aria-hidden />
          <span className={styles.invitedLabel}>{t('events.invite.invited')}</span>
        </span>
      );
    }
    return (
      <Button
        type="button"
        variant="soft"
        size="sm"
        onClick={() => handleInvite(item)}
        loading={inviteMutation.isPending && inviteMutation.variables === item.userId}
        aria-label={t('events.invite.inviteAriaLabel', { name: item.displayName })}
      >
        {t('events.invite.inviteAction')}
      </Button>
    );
  };

  return (
    <section className={styles.root} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.title}>
        {t('events.invite.sectionTitle')}
      </h3>

      {followsQuery.isPending && <p className={styles.status}>{t('common.loading')}</p>}

      {followsQuery.isError && <p className={styles.status}>{t('events.invite.loadError')}</p>}

      {!followsQuery.isPending && !followsQuery.isError && !hasFollows && (
        <EmptyState
          className={styles.empty}
          compact
          icon={<UserPlus aria-hidden size={ICON_SIZE['2xl']} />}
          message={t('events.invite.emptyLine1')}
          actions={
            user ? (
              <Link
                to={ownProfileDestination(user).path}
                onClick={onNavigate}
                className={buttonClass({ variant: 'soft', size: 'sm' })}
              >
                {t('events.invite.emptyLink')}
              </Link>
            ) : undefined
          }
        />
      )}

      {hasFollows && (
        <>
          <SearchField
            ref={searchRef}
            value={query}
            onChange={setQuery}
            placeholder={t('events.invite.searchPlaceholder')}
            ariaLabel={t('events.invite.searchPlaceholder')}
            className={styles.search}
          />

          {itemError && (
            <p className="error" role="alert">
              {itemError}
            </p>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              className={styles.empty}
              compact
              icon={<SearchX aria-hidden size={ICON_SIZE['2xl']} />}
              message={t('events.invite.searchNoResults', { query })}
            />
          ) : (
            <ul className={styles.list}>
              {filtered.map((item) => (
                <PersonRow
                  key={item.userId}
                  avatar={<Avatar avatarId={item.avatarId} pseudo={item.displayName} size="md" />}
                  name={item.displayName}
                  detail={`@${item.handle}`}
                  action={actionOf(item)}
                  muted={item.isAlreadyParticipant}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
