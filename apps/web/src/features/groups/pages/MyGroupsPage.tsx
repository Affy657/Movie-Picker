import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import clsx from 'clsx';
import { Film, UserPlus, Users } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
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
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatEventDateLong, formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { FriendGroupSummary, MyGroups } from '@/features/events/api/myGroupsApi';
import { useMyGroups } from '@/features/events/hooks/useMyGroups';
import type { MyEventSummary } from '@/features/events/types';
import { capitalizeFirst, firstName } from '@/features/library/utils/listMembers';
import type { FriendGroupInvitation, FriendGroupShowcase } from '@/features/groups/api/groupsApi';
import GroupFormDialog from '@/features/groups/components/GroupFormDialog';
import NightStatusLine from '@/features/groups/components/NightStatusLine';
import { useAnswerGroupInvitation } from '@/features/groups/hooks/useGroups';
import {
  membersCountLabel,
  peoplePhrase,
  personName,
  viewerFirst,
} from '@/features/groups/utils/groupLabels';
import styles from './MyGroupsPage.module.css';

const NAMED_MEMBERS = 4;
const STACKED_FACES = 6;

function faces(people: readonly { userId: string; avatarId: string; displayName: string }[]) {
  return people.map((person) => ({
    key: person.userId,
    avatarId: person.avatarId,
    pseudo: person.displayName,
  }));
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
        <AvatarStack people={faces(invitation.memberPreview)} size="sm" />
        <div className={styles.invitationText}>
          <span className={styles.invitationOverline}>{t('groups.list.invitation')}</span>
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

function TileFoot({
  nextNight,
  showcase,
}: Readonly<{ nextNight: MyEventSummary | undefined; showcase: FriendGroupShowcase | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  if (nextNight) {
    return (
      <span className={styles.foot}>
        <span className="visually-hidden">
          {t('groups.list.nextNight')},{' '}
          {formatEventDateLong(
            nextNight.date,
            nextNight.time,
            locale,
            t('events.detail.dateTimeJoiner')
          )}
        </span>
        <span className={styles.when} aria-hidden="true">
          {capitalizeFirst(formatMyEventsListDate(nextNight.date, locale), locale)}
        </span>
        <span className={styles.nextTitle}>{nextNight.title}</span>
        <span className={styles.status}>
          <NightStatusLine night={nextNight} />
        </span>
      </span>
    );
  }
  let line = t('groups.list.noNight');
  if ((showcase?.nightCount ?? 0) === 0)
    line = isMobile ? t('groups.list.noFilm') : t('groups.list.noFilmHint');
  return <span className={styles.foot}>{line}</span>;
}

function GroupTile({
  group,
  nextNight,
  showcase,
}: Readonly<{
  group: FriendGroupSummary;
  nextNight: MyEventSummary | undefined;
  showcase: FriendGroupShowcase | undefined;
}>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const cover = showcase?.cover ?? null;
  const preview = viewerFirst(group.memberPreview, user?.userId);
  const people = peoplePhrase(
    preview.map((person) => personName(person, user?.userId, t)),
    group.memberCount,
    NAMED_MEMBERS,
    locale,
    t
  );
  const nightCount = showcase?.nightCount ?? 0;
  const nights =
    nightCount > 0
      ? pluralizeCount(nightCount, 'groups.ranking.nightsOne', 'groups.ranking.nights', t)
      : null;

  return (
    <Link to={ROUTES.group(group.id)} className={clsx(styles.tile, !cover && styles.plain)}>
      {cover ? (
        <>
          <span className={styles.backdrop} aria-hidden="true">
            <img
              src={posterImageSrc(cover.backdropUrl)}
              alt=""
              loading="lazy"
              decoding="async"
              className={clsx(styles.image, loaded && styles.imageLoaded)}
              onLoad={() => setLoaded(true)}
            />
          </span>
          <span className={styles.credit} aria-hidden="true">
            <Film size={ICON_SIZE.sm} aria-hidden />
            <span className={styles.creditTitle}>{cover.title}</span>
          </span>
        </>
      ) : null}
      <span className={styles.name}>{group.name}</span>
      <span className={styles.people}>
        <AvatarStack
          people={faces(preview)}
          max={STACKED_FACES}
          size="xs"
          className={styles.faces}
        />
        <span>{nights ? `${people}, ${nights}` : people}</span>
      </span>
      <TileFoot nextNight={nextNight} showcase={showcase} />
    </Link>
  );
}

function GroupsLoading() {
  const { t } = useTranslation();
  return (
    <SkeletonScreen label={t('groups.list.loading')} className={styles.grid}>
      <Skeleton variant="block" className={styles.tileSkeleton} />
      <Skeleton variant="block" className={styles.tileSkeleton} />
    </SkeletonScreen>
  );
}

function GroupsContent({ data }: Readonly<{ data: MyGroups }>) {
  const nextNightOf = (groupId: string) =>
    data.nextNights.find((night) => night.groupId === groupId);
  const showcaseOf = (groupId: string) =>
    data.showcases.find((showcase) => showcase.groupId === groupId);
  return (
    <>
      {data.invitations.length > 0 ? (
        <div className={styles.invitations}>
          {data.invitations.map((invitation) => (
            <InvitationCard key={invitation.groupId} invitation={invitation} />
          ))}
        </div>
      ) : null}
      {data.groups.length > 0 ? (
        <ul className={styles.grid}>
          {data.groups.map((group) => (
            <li key={group.id} className={styles.cell}>
              <GroupTile
                group={group}
                nextNight={nextNightOf(group.id)}
                showcase={showcaseOf(group.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}
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
    body = <GroupsContent data={groups.data} />;
  }

  return (
    <PageLayout className={styles.layout}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('groups.title')}</h1>
        {empty ? null : (
          <Button
            variant="primary"
            size={isMobile ? 'sm' : 'md'}
            aria-label={isMobile ? t('groups.list.newGroup') : undefined}
            onClick={openCreate}
          >
            <UserPlus size={ICON_SIZE.md} aria-hidden />
            {isMobile ? t('groups.list.newGroupShort') : t('groups.list.newGroup')}
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
