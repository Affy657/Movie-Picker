import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Link2Off, Users } from 'lucide-react';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import ErrorState from '@/shared/components/ErrorState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage, isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { firstName } from '@/features/library/utils/listMembers';
import type { FriendGroupInvitePreview } from '@/features/groups/api/groupsApi';
import GroupMosaic from '@/features/groups/components/GroupMosaic';
import { useGroupInvitePreview, useJoinGroupByLink } from '@/features/groups/hooks/useGroups';
import { membersCountLabel } from '@/features/groups/utils/groupLabels';
import styles from './JoinGroupPage.module.css';

function JoinActions({
  token,
  preview,
}: Readonly<{ token: string; preview: FriendGroupInvitePreview }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const join = useJoinGroupByLink();
  const [error, setError] = useState<string | null>(null);
  const returnTo = ROUTES.groupJoin(token);

  if (preview.isFull) {
    return (
      <div className={styles.full}>
        <h2 className={styles.fullTitle}>
          <Users aria-hidden size={ICON_SIZE.md} />
          {t('groups.join.fullTitle')}
        </h2>
        <p className={styles.message}>
          {t('groups.join.fullMessage', { name: firstName(preview.ownerDisplayName) })}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <p className={styles.message}>{t('groups.join.signedOut')}</p>
        <nav className={styles.actions}>
          <Link
            to={withReturnTo(ROUTES.login, returnTo)}
            className={buttonClass({ variant: 'primary' })}
          >
            {t('home.ctaLogin')}
          </Link>
          <Link to={withReturnTo(ROUTES.register, returnTo)} className={buttonClass()}>
            {t('home.ctaRegister')}
          </Link>
        </nav>
      </>
    );
  }

  const submit = () => {
    setError(null);
    join.mutate(token, {
      onSuccess: ({ group }) => void navigate(ROUTES.group(group.id), { replace: true }),
      onError: (err) => setError(getErrorMessage(err, t('groups.join.error'))),
    });
  };

  return (
    <>
      <p className={styles.message}>{t('groups.join.explanation')}</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" fullWidth loading={join.isPending} onClick={submit}>
        {t('groups.join.submit')}
      </Button>
    </>
  );
}

export default function JoinGroupPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const preview = useGroupInvitePreview(token, user?.userId ?? null, !authLoading && !!token);
  useNoindexPage(pageTitle(preview.data?.name ?? t('groups.join.title')), ROUTES.groupJoin(token));

  if (preview.isError && isNotFoundError(preview.error)) {
    return (
      <ErrorState
        icon={<Link2Off size={ICON_SIZE['4xl']} />}
        title={t('groups.join.invalidTitle')}
        message={t('groups.join.invalidMessage')}
        actions={
          <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
            {t('groups.join.backHome')}
          </Link>
        }
      />
    );
  }

  if (preview.isError) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('groups.join.title')}</h1>
        <InlineError
          message={t('groups.join.loadError')}
          retryLabel={t('groups.join.retry')}
          onRetry={() => void preview.refetch()}
        />
      </PageLayout>
    );
  }

  if (!preview.data) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('groups.join.title')}</h1>
        <SkeletonScreen label={t('groups.join.loading')}>
          <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="block" className={styles.groupSkeleton} />
          </Card>
        </SkeletonScreen>
      </PageLayout>
    );
  }

  const data = preview.data;
  if (data.role && data.groupId) {
    return <Navigate to={ROUTES.group(data.groupId)} replace />;
  }

  return (
    <PageLayout className={styles.layout}>
      <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
        <p className={styles.overline}>{t('groups.join.overline')}</p>
        <h1 className={styles.title}>{t('groups.join.title')}</h1>
        <p className={styles.inviter}>
          {t('groups.join.invitedBy', { name: firstName(data.ownerDisplayName) })}
        </p>
        <div className={styles.group}>
          <GroupMosaic people={data.memberPreview} size="lg" />
          <span className={styles.groupText}>
            <span className={styles.groupName}>{data.name}</span>
            <span className={styles.groupCount}>{membersCountLabel(data.memberCount, t)}</span>
          </span>
        </div>
        <JoinActions token={token} preview={data} />
      </Card>
    </PageLayout>
  );
}
