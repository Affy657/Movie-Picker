import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import clsx from 'clsx';
import { CalendarPlus, Plus, UserPlus, Users } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import FadedBanner from '@/shared/components/FadedBanner';
import BackLink from '@/shared/components/BackLink';
import Button, { buttonClass } from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { TabPanel, Tabs, type TabDef } from '@/shared/components/Tabs';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage, isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useLocale, useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOpenCreateEvent } from '@/features/events/components/create-event/createEventDialogContext';
import { firstName } from '@/features/library/utils/listMembers';
import type { FriendGroupCover, FriendGroupDetail } from '@/features/groups/api/groupsApi';
import GroupFigures from '@/features/groups/components/GroupFigures';
import GroupFilms from '@/features/groups/components/GroupFilms';
import GroupFormDialog from '@/features/groups/components/GroupFormDialog';
import GroupMembersPanel from '@/features/groups/components/GroupMembers';
import GroupMembersDialog from '@/features/groups/components/GroupMembersDialog';
import GroupNextNight from '@/features/groups/components/GroupNextNight';
import GroupRanking from '@/features/groups/components/GroupRanking';
import GroupSection from '@/features/groups/components/GroupSection';
import GroupSettingsMenu, {
  type GroupDialog,
} from '@/features/groups/components/GroupSettingsMenu';
import GroupUpcomingNights, {
  GroupOnHoldNights,
} from '@/features/groups/components/GroupUpcomingNights';
import { useDeleteGroup, useGroup, useLeaveGroup } from '@/features/groups/hooks/useGroups';
import { peoplePhrase, personName, viewerFirst } from '@/features/groups/utils/groupLabels';
import { splitUpcomingNights } from '@/features/groups/utils/groupNights';
import styles from './GroupPage.module.css';

const ARRIVAL_FLAG = 'openMembers';
const NAMED_MEMBERS = 6;
const NAMED_MEMBERS_ON_PHONE = 4;
const STACKED_FACES = 6;

type GroupTab = 'films' | 'ranking' | 'members';

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

function GroupBanner({ cover }: Readonly<{ cover: FriendGroupCover }>) {
  const { t } = useTranslation();
  return (
    <FadedBanner
      imageUrl={cover.backdropUrl}
      fromTmdb
      credit={{
        title: cover.title,
        to: ROUTES.moviePage({
          tmdbId: cover.tmdbId,
          mediaType: cover.mediaType,
          title: cover.title,
        }),
        ariaLabel: t('groups.page.coverCredit', { title: cover.title }),
      }}
    />
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

function GroupPeople({
  group,
  viewerId,
}: Readonly<{ group: FriendGroupDetail; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const members = viewerFirst(group.members, viewerId);
  const names = members.map((member) => personName(member, viewerId, t));
  return (
    <p className={styles.people}>
      <AvatarStack
        people={members.map((member) => ({
          key: member.userId,
          avatarId: member.avatarId,
          pseudo: member.displayName,
        }))}
        max={STACKED_FACES}
        size="sm"
        className={styles.faces}
      />
      <span>
        {peoplePhrase(
          names,
          members.length,
          isMobile ? NAMED_MEMBERS_ON_PHONE : NAMED_MEMBERS,
          locale,
          t
        )}
      </span>
    </p>
  );
}

function GroupHeader({
  group,
  viewerId,
  onNewNight,
  onOpen,
}: Readonly<{
  group: FriendGroupDetail;
  viewerId: string | undefined;
  onNewNight: () => void;
  onOpen: (dialog: GroupDialog) => void;
}>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isOwner = group.role === 'owner';
  const size = isMobile ? 'sm' : 'md';
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <BackLink to={ROUTES.groups}>{t('groups.page.back')}</BackLink>
        <h1 className={styles.title}>{group.name}</h1>
        <GroupPeople group={group} viewerId={viewerId} />
      </div>
      <div className={clsx(styles.actions, isOwner && styles.actionsWithInvite)}>
        {isOwner ? (
          <Button variant="secondary" size={size} onClick={() => onOpen('members')}>
            <UserPlus size={ICON_SIZE.md} aria-hidden />
            {t('groups.page.invite')}
          </Button>
        ) : null}
        <Button variant="primary" size={size} onClick={onNewNight}>
          <Plus size={ICON_SIZE.md} aria-hidden />
          {t('groups.page.groupNight')}
        </Button>
        <GroupSettingsMenu isOwner={isOwner} onOpen={onOpen} />
      </div>
    </header>
  );
}

function GroupUpcoming({
  group,
  viewerId,
  onNewNight,
}: Readonly<{ group: FriendGroupDetail; viewerId: string | undefined; onNewNight: () => void }>) {
  const { t } = useTranslation();
  const { next, later, onHold } = splitUpcomingNights(group.upcomingNights);
  return (
    <GroupSection title={t('groups.page.upcoming')}>
      {next ? (
        <GroupNextNight night={next} group={group} viewerId={viewerId} />
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
      {later.length > 0 ? <GroupUpcomingNights nights={later} /> : null}
      {onHold.length > 0 ? <GroupOnHoldNights nights={onHold} /> : null}
    </GroupSection>
  );
}

function GroupTabs({
  group,
  viewerId,
  onInvite,
  onLeave,
}: Readonly<{
  group: FriendGroupDetail;
  viewerId: string | undefined;
  onInvite?: () => void;
  onLeave?: () => void;
}>) {
  const { t } = useTranslation();
  const idBase = useId();
  const [tab, setTab] = useState<GroupTab>('films');
  const films = group.pastNights.filter((night) => night.winnerMovies.length > 0);
  const tabs: TabDef<GroupTab>[] = [
    { key: 'films', label: t('groups.page.films'), badge: films.length || undefined },
    { key: 'ranking', label: t('groups.page.ranking') },
    { key: 'members', label: t('groups.page.members'), badge: group.members.length },
  ];
  return (
    <section className={styles.tabs} aria-label={t('groups.page.sectionsAria')}>
      <Tabs
        idBase={idBase}
        tabs={tabs}
        active={tab}
        onChange={setTab}
        ariaLabel={t('groups.page.sectionsAria')}
      />
      <TabPanel idBase={idBase} tabKey="films" active={tab === 'films'} className={styles.panel}>
        {films.length > 0 ? (
          <GroupFilms nights={films} />
        ) : (
          <p className={styles.empty}>{t('groups.page.noFilms')}</p>
        )}
      </TabPanel>
      <TabPanel
        idBase={idBase}
        tabKey="ranking"
        active={tab === 'ranking'}
        className={styles.panel}
      >
        <GroupRanking group={group} viewerId={viewerId} />
      </TabPanel>
      <TabPanel
        idBase={idBase}
        tabKey="members"
        active={tab === 'members'}
        className={styles.panel}
      >
        <GroupMembersPanel
          group={group}
          viewerId={viewerId}
          onInvite={onInvite}
          onLeave={onLeave}
        />
      </TabPanel>
    </section>
  );
}

export default function GroupPage() {
  const { t } = useTranslation();
  const { groupId = '' } = useParams();
  const { user } = useAuth();
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
  const { cover } = group;

  return (
    <PageLayout className={clsx(styles.layout, cover && styles.layoutWithBanner)}>
      {cover ? <GroupBanner cover={cover} /> : null}
      <div className={clsx(styles.content, cover && styles.overBanner)}>
        <GroupHeader
          group={group}
          viewerId={user?.userId}
          onNewNight={newNight}
          onOpen={setDialog}
        />
        <GroupFigures stats={group.stats} />

        {actionError ? (
          <p className="error" role="alert">
            {actionError}
          </p>
        ) : null}

        <GroupUpcoming group={group} viewerId={user?.userId} onNewNight={newNight} />
        <GroupTabs
          group={group}
          viewerId={user?.userId}
          onInvite={isOwner ? () => setDialog('members') : undefined}
          onLeave={isOwner ? undefined : () => setDialog('leave')}
        />
      </div>

      <GroupDialogs
        group={group}
        dialog={dialog}
        onClose={() => setDialog(null)}
        onError={setActionError}
      />
    </PageLayout>
  );
}
