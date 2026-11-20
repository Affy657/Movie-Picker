import { useId, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserPlus, Users } from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import CountBadge from '@/shared/components/CountBadge';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useLocale, useTranslation } from '@/shared/i18n';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { FriendGroupSummary, MyGroups } from '@/features/events/api/myGroupsApi';
import EventDateBlock from '@/features/events/components/EventDateBlock';
import { useMyGroups } from '@/features/events/hooks/useMyGroups';
import type { MyEventSummary } from '@/features/events/types';
import { firstName } from '@/features/library/utils/listMembers';
import type { FriendGroupInvitation } from '@/features/groups/api/groupsApi';
import GroupFormDialog from '@/features/groups/components/GroupFormDialog';
import GroupMosaic from '@/features/groups/components/GroupMosaic';
import NightStatusLine from '@/features/groups/components/NightStatusLine';
import { useAnswerGroupInvitation } from '@/features/groups/hooks/useGroups';
import { membersCountLabel } from '@/features/groups/utils/groupLabels';
import styles from './MyGroupsPage.module.css';

function GroupsSection({
  title,
  count,
  children,
}: Readonly<{ title: string; count: number; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title} <CountBadge value={count} tone="neutral" />
      </h2>
      {children}
    </section>
  );
}

function InvitationCard({ invitation }: Readonly<{ invitation: FriendGroupInvitation }>) {
  const { t } = useTranslation();
  const answer = useAnswerGroupInvitation();
  const [error, setError] = useState<string | null>(null);
  const answering = answer.isPending ? answer.variables?.accept : undefined;

  const respond = (accept: boolean) => {
    setError(null);
    answer.mutate(
      { groupId: invitation.groupId, accept },
      { onError: (err) => setError(getErrorMessage(err, t('groups.list.invitationError'))) }
    );
  };

  return (
    <Card padding="md" radius="lg" className={styles.invitation}>
      <div className={styles.invitationMain}>
        <GroupMosaic people={invitation.memberPreview} />
        <div className={styles.invitationText}>
          <span className={styles.invitationName}>{invitation.name}</span>
          <span className={styles.meta}>
            {t('groups.list.invitedBy', {
              name: firstName(invitation.invitedByDisplayName),
              members: membersCountLabel(invitation.memberCount, t),
            })}
          </span>
        </div>
        <div className={styles.invitationActions}>
          <Button
            variant="ghost"
            size="sm"
            disabled={answer.isPending}
            loading={answering === false}
            aria-label={t('groups.list.declineAria', { name: invitation.name })}
            onClick={() => respond(false)}
          >
            {t('groups.list.decline')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={answer.isPending}
            loading={answering === true}
            aria-label={t('groups.list.acceptAria', { name: invitation.name })}
            onClick={() => respond(true)}
          >
            {t('groups.list.accept')}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function NextNightBlock({ night }: Readonly<{ night: MyEventSummary | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  if (!night) return <span className={styles.noNight}>{t('groups.list.noNight')}</span>;
  return (
    <span className={styles.nextNight}>
      <EventDateBlock date={night.date} className={styles.nextDate} />
      <span className={styles.nextText}>
        <span className="visually-hidden">
          {t('groups.list.nextNight')},{' '}
          {formatEventDateLong(night.date, night.time, locale, t('events.detail.dateTimeJoiner'))}
        </span>
        <span className={styles.nextTitle}>{night.title}</span>
        <NightStatusLine night={night} />
      </span>
    </span>
  );
}

function GroupCard({
  group,
  nextNight,
}: Readonly<{ group: FriendGroupSummary; nextNight: MyEventSummary | undefined }>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isOwner = group.role === 'owner';
  const members = membersCountLabel(group.memberCount, t);
  return (
    <Card
      as={Link}
      to={ROUTES.group(group.id)}
      interactive
      elevation="sm"
      radius="lg"
      padding="none"
      className={styles.groupCard}
    >
      <GroupMosaic people={group.memberPreview} size={isMobile ? 'md' : 'lg'} />
      <span className={styles.groupBody}>
        <span className={styles.groupName}>{group.name}</span>
        <span className={styles.meta}>
          {isOwner ? (
            <>
              <span>{members}</span>
              <Chip size="sm">{t('groups.list.createdByYou')}</Chip>
            </>
          ) : (
            <span>
              {members}, {t('groups.list.createdBy', { name: firstName(group.ownerDisplayName) })}
            </span>
          )}
        </span>
        <NextNightBlock night={nextNight} />
      </span>
    </Card>
  );
}

function GroupsLoading() {
  const { t } = useTranslation();
  return (
    <SkeletonScreen label={t('groups.list.loading')} className={styles.grid}>
      <Skeleton variant="block" className={styles.cardSkeleton} />
      <Skeleton variant="block" className={styles.cardSkeleton} />
    </SkeletonScreen>
  );
}

function GroupsContent({ data, onCreate }: Readonly<{ data: MyGroups; onCreate: () => void }>) {
  const { t } = useTranslation();
  const nextNightOf = (groupId: string) =>
    data.nextNights.find((night) => night.groupId === groupId);
  return (
    <>
      {data.invitations.length > 0 ? (
        <GroupsSection title={t('groups.list.invitations')} count={data.invitations.length}>
          <div className={styles.invitations}>
            {data.invitations.map((invitation) => (
              <InvitationCard key={invitation.groupId} invitation={invitation} />
            ))}
          </div>
        </GroupsSection>
      ) : null}
      <GroupsSection title={t('groups.list.yourGroups')} count={data.groups.length}>
        <div className={styles.grid}>
          {data.groups.map((group) => (
            <GroupCard key={group.id} group={group} nextNight={nextNightOf(group.id)} />
          ))}
          <button type="button" className={styles.createTile} onClick={onCreate}>
            <UserPlus size={ICON_SIZE.xl} aria-hidden />
            {t('groups.list.createGroup')}
          </button>
        </div>
      </GroupsSection>
    </>
  );
}

export default function MyGroupsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  useNoindexPage(pageTitle(t('groups.title')), ROUTES.groups);
  const groups = useMyGroups(!!user);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = () => setCreateOpen(true);
  const empty =
    groups.isSuccess && groups.data.groups.length === 0 && groups.data.invitations.length === 0;

  let body: ReactNode;
  if (groups.isPending) {
    body = <GroupsLoading />;
  } else if (groups.isError) {
    body = (
      <InlineError
        message={t('groups.list.loadError')}
        retryLabel={t('groups.list.retry')}
        onRetry={() => void groups.refetch()}
      />
    );
  } else if (empty) {
    body = (
      <EmptyState
        icon={<Users size={ICON_SIZE['3xl']} />}
        titleTag="h2"
        title={t('groups.list.emptyTitle')}
        message={t('groups.list.emptyMessage')}
        actions={
          <Button variant="primary" onClick={openCreate}>
            {t('groups.list.createGroup')}
          </Button>
        }
      />
    );
  } else {
    body = <GroupsContent data={groups.data} onCreate={openCreate} />;
  }

  return (
    <PageLayout className={styles.layout}>
      <header className={styles.pageHeader}>
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>{t('groups.title')}</h1>
          {empty ? null : <p className={styles.description}>{t('groups.list.description')}</p>}
        </div>
        {empty ? null : (
          <Button variant="primary" size={isMobile ? 'sm' : 'md'} onClick={openCreate}>
            <UserPlus size={ICON_SIZE.md} aria-hidden />
            {t('groups.list.newGroup')}
          </Button>
        )}
      </header>

      {body}

      {createOpen ? (
        <GroupFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={(group) => {
            setCreateOpen(false);
            void navigate(ROUTES.group(group.id), { state: { openMembers: true } });
          }}
        />
      ) : null}
    </PageLayout>
  );
}
