import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton } from '@/shared/components/Skeleton';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  JoinLinkFull,
  JoinLinkPending,
  JoinLinkSignIn,
} from '@/features/library/components/JoinLinkParts';
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
      <JoinLinkFull
        title={t('groups.join.fullTitle')}
        message={t('groups.join.fullMessage', { name: firstName(preview.ownerDisplayName) })}
        classNames={{ full: styles.full, fullTitle: styles.fullTitle, message: styles.message }}
      />
    );
  }

  if (!user) {
    return (
      <JoinLinkSignIn
        message={t('groups.join.signedOut')}
        returnTo={returnTo}
        classNames={{ message: styles.message, actions: styles.actions }}
      />
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

  if (preview.isError || !preview.data) {
    return (
      <JoinLinkPending
        error={preview.isError ? preview.error : null}
        onRetry={() => void preview.refetch()}
        labels={{
          title: t('groups.join.title'),
          invalidTitle: t('groups.join.invalidTitle'),
          invalidMessage: t('groups.join.invalidMessage'),
          backHome: t('groups.join.backHome'),
          loadError: t('groups.join.loadError'),
          retry: t('groups.join.retry'),
          loading: t('groups.join.loading'),
        }}
        classNames={{ layout: styles.layout }}
      >
        <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="block" className={styles.groupSkeleton} />
        </Card>
      </JoinLinkPending>
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
