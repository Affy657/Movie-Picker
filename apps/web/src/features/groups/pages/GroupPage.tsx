import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { CalendarPlus, Plus, Users } from 'lucide-react';
import BackLink from '@/shared/components/BackLink';
import Button, { buttonClass } from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import CountBadge from '@/shared/components/CountBadge';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage, isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOpenCreateEvent } from '@/features/events/components/create-event/createEventDialogContext';
import { firstName } from '@/features/library/utils/listMembers';
import type { FriendGroupDetail } from '@/features/groups/api/groupsApi';
import GroupFilms from '@/features/groups/components/GroupFilms';
import GroupFormDialog from '@/features/groups/components/GroupFormDialog';
import { GroupMembersAside, GroupMembersStrip } from '@/features/groups/components/GroupMembers';
import GroupMembersDialog from '@/features/groups/components/GroupMembersDialog';
import GroupMosaic from '@/features/groups/components/GroupMosaic';
import GroupNextNight from '@/features/groups/components/GroupNextNight';
import GroupSettingsMenu, {
  type GroupDialog,
} from '@/features/groups/components/GroupSettingsMenu';
import GroupUpcomingNights from '@/features/groups/components/GroupUpcomingNights';
import { useDeleteGroup, useGroup, useLeaveGroup } from '@/features/groups/hooks/useGroups';
import styles from './GroupPage.module.css';

const ARRIVAL_FLAG = 'openMembers';

function useOpenMembersOnArrival(): boolean {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname, search, hash, state } = location;
  const [arrival] = useState(
    () => typeof state === 'object' && state !== null && ARRIVAL_FLAG in state
  );

  useEffect(() => {
    if (typeof state !== 'object' || state === null || !(ARRIVAL_FLAG in state)) return;
    const kept = Object.entries(state).filter(([key]) => key !== ARRIVAL_FLAG);
    void navigate(
      { pathname, search, hash },
      { replace: true, state: kept.length > 0 ? Object.fromEntries(kept) : null }
    );
  }, [pathname, search, hash, state, navigate]);

  return arrival;
}

function GroupSection({
  title,
  count,
  children,
}: Readonly<{ title: string; count?: number; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
        {count === undefined ? null : (
          <>
            {' '}
            <CountBadge value={count} tone="neutral" />
          </>
        )}
      </h2>
      {children}
    </section>
  );
}

function GroupNotFound() {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <ErrorState
        icon={<Users size={ICON_SIZE['4xl']} />}
        title={t('groups.page.notFoundTitle')}
        message={t('groups.page.notFoundMessage')}
        actions={
          <Link to={ROUTES.groups} className={buttonClass({ variant: 'primary' })}>
            {t('groups.page.back')}
          </Link>
        }
      />
    </PageLayout>
  );
}

function GroupLoading() {
  const { t } = useTranslation();
  return (
    <PageLayout className={styles.layout}>
      <h1 className="visually-hidden">{t('groups.title')}</h1>
      <SkeletonScreen label={t('groups.page.loading')} className={styles.skeleton}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="block" className={styles.heroSkeleton} />
      </SkeletonScreen>
    </PageLayout>
  );
}

function GroupDialogs({
  group,
  dialog,
  onClose,
  onError,
}: Readonly<{
  group: FriendGroupDetail;
  dialog: GroupDialog | null;
  onClose: () => void;
  onError: (message: string) => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  const settle = async (action: Promise<void>, fallback: string) => {
    try {
      await action;
      onClose();
      void navigate(ROUTES.groups, { replace: true });
    } catch (error) {
      onClose();
      onError(getErrorMessage(error, fallback));
    }
  };

  return (
    <>
      {dialog === 'rename' ? (
        <GroupFormDialog group={group} onClose={onClose} onSaved={onClose} />
      ) : null}
      {dialog === 'members' ? <GroupMembersDialog group={group} onClose={onClose} /> : null}
      {group.role === 'owner' ? (
        <ConfirmDialog
          open={dialog === 'delete'}
          title={t('groups.delete.title', { name: group.name })}
          message={t('groups.delete.message')}
          confirmLabel={t('groups.delete.confirm')}
          cancelLabel={t('groups.delete.cancel')}
          loading={deleteGroup.isPending}
          onConfirm={() => void settle(deleteGroup.mutateAsync(group.id), t('groups.delete.error'))}
          onCancel={onClose}
          testId="delete-group-dialog"
        />
      ) : (
        <ConfirmDialog
          open={dialog === 'leave'}
          title={t('groups.leave.title', { name: group.name })}
          message={t('groups.leave.message', { owner: firstName(group.ownerDisplayName) })}
          confirmLabel={t('groups.leave.confirm')}
          cancelLabel={t('groups.leave.cancel')}
          loading={leaveGroup.isPending}
          onConfirm={() => void settle(leaveGroup.mutateAsync(group.id), t('groups.leave.error'))}
          onCancel={onClose}
          testId="leave-group-dialog"
        />
      )}
    </>
  );
}

function GroupBody({
  group,
  onNewNight,
  onLeave,
}: Readonly<{ group: FriendGroupDetail; onNewNight: () => void; onLeave?: () => void }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [next, ...later] = group.upcomingNights;
  const films = group.pastNights.filter((night) => night.winnerMovies.length > 0);
  const coming = new Set(group.nextNightParticipantIds);
  const comingMembers = group.members.filter((member) => coming.has(member.userId)).length;

  return (
    <div className={styles.columns}>
      <div className={styles.main}>
        <GroupSection title={t('groups.page.nextNight')}>
          {next ? (
            <GroupNextNight night={next} coming={comingMembers} total={group.members.length} />
          ) : (
            <EmptyState
              compact
              icon={<CalendarPlus size={ICON_SIZE['2xl']} />}
              message={t('groups.page.noNight')}
              actions={
                <Button variant="primary" onClick={onNewNight}>
                  <Plus size={ICON_SIZE.md} aria-hidden />
                  {t('groups.page.newNight')}
                </Button>
              }
            />
          )}
        </GroupSection>
        {later.length > 0 ? (
          <GroupSection title={t('groups.page.then')} count={later.length}>
            <GroupUpcomingNights nights={later} />
          </GroupSection>
        ) : null}
        {isMobile ? <GroupMembersStrip group={group} viewerId={user?.userId} /> : null}
        {films.length > 0 ? (
          <GroupSection title={t('groups.page.films')} count={films.length}>
            <GroupFilms nights={films} />
          </GroupSection>
        ) : null}
      </div>
      {isMobile ? null : (
        <GroupMembersAside group={group} viewerId={user?.userId} onLeave={onLeave} />
      )}
    </div>
  );
}

export default function GroupPage() {
  const { t } = useTranslation();
  const { groupId = '' } = useParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const openCreateEvent = useOpenCreateEvent();
  const openMembersOnArrival = useOpenMembersOnArrival();
  const [dialog, setDialog] = useState<GroupDialog | null>(openMembersOnArrival ? 'members' : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useGroup(groupId, { enabled: !!user });
  const group = query.data;
  useNoindexPage(pageTitle(group?.name ?? t('groups.title')), ROUTES.group(groupId));

  if (query.isError && isNotFoundError(query.error)) return <GroupNotFound />;

  if (query.isError) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('groups.title')}</h1>
        <InlineError
          message={t('groups.page.loadError')}
          retryLabel={t('groups.page.retry')}
          onRetry={() => void query.refetch()}
        />
      </PageLayout>
    );
  }

  if (!group) return <GroupLoading />;

  const isOwner = group.role === 'owner';
  const newNight = () => openCreateEvent({ groupId: group.id });

  return (
    <PageLayout className={styles.layout}>
      <BackLink to={ROUTES.groups}>{t('groups.page.back')}</BackLink>
      <header className={styles.header}>
        <div className={styles.identity}>
          <GroupMosaic people={group.memberPreview} size={isMobile ? 'md' : 'lg'} />
          <div className={styles.titles}>
            <p className={styles.overline}>{t('groups.page.overline')}</p>
            <h1 className={styles.title}>{group.name}</h1>
          </div>
        </div>
        <div className={styles.actions}>
          <GroupSettingsMenu isOwner={isOwner} onOpen={setDialog} />
          <Button variant="primary" size={isMobile ? 'sm' : 'md'} onClick={newNight}>
            <Plus size={ICON_SIZE.md} aria-hidden />
            {t('groups.page.newNight')}
          </Button>
        </div>
      </header>

      {actionError ? (
        <p className="error" role="alert">
          {actionError}
        </p>
      ) : null}

      <GroupBody
        group={group}
        onNewNight={newNight}
        onLeave={isOwner ? undefined : () => setDialog('leave')}
      />

      <GroupDialogs
        group={group}
        dialog={dialog}
        onClose={() => setDialog(null)}
        onError={setActionError}
      />
    </PageLayout>
  );
}
