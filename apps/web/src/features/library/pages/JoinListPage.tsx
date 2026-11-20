import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Layers } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import PageLayout from '@/shared/components/PageLayout';
import { Skeleton } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MovieListInvitePreview } from '@/features/library/api/listMembersApi';
import { useInvitePreview, useJoinListByLink } from '@/features/library/hooks/useListMembers';
import {
  JoinLinkFull,
  JoinLinkPending,
  JoinLinkSignIn,
} from '@/features/library/components/JoinLinkParts';
import { listCountLabel } from '@/features/library/utils/listCount';
import { firstName } from '@/features/library/utils/listMembers';
import { posterStackSources } from '@/features/movies/utils/posterStack';
import styles from './JoinListPage.module.css';

function Posters({ paths }: Readonly<{ paths: readonly string[] }>) {
  const sources = posterStackSources(paths);
  return (
    <div className={styles.posters} aria-hidden="true">
      {sources.length === 0 ? (
        <span className={styles.poster}>
          <Layers size={ICON_SIZE.xl} />
        </span>
      ) : (
        sources.map((src, index) => (
          <img key={`${index}-${src}`} src={src} alt="" className={styles.poster} />
        ))
      )}
    </div>
  );
}

function JoinActions({
  token,
  preview,
}: Readonly<{ token: string; preview: MovieListInvitePreview }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const join = useJoinListByLink();
  const [error, setError] = useState<string | null>(null);
  const returnTo = ROUTES.joinList(token);
  const owner = firstName(preview.owner.displayName);

  if (preview.isFull) {
    return (
      <JoinLinkFull
        title={t('lists.join.fullTitle')}
        message={t('lists.join.fullMessage', { name: owner })}
        classNames={{ full: styles.full, fullTitle: styles.fullTitle, message: styles.message }}
      />
    );
  }

  if (!user) {
    return (
      <JoinLinkSignIn
        message={t('lists.join.signedOut')}
        returnTo={returnTo}
        classNames={{ message: styles.message, actions: styles.actions }}
      />
    );
  }

  const submit = () => {
    setError(null);
    join.mutate(token, {
      onSuccess: (list) => navigate(ROUTES.list(list.id), { replace: true }),
      onError: (err) => setError(getErrorMessage(err, t('lists.join.error'))),
    });
  };

  return (
    <>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button variant="primary" loading={join.isPending} onClick={submit}>
          {t('lists.join.submit')}
        </Button>
      </div>
    </>
  );
}

export default function JoinListPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const preview = useInvitePreview(token, user?.userId ?? null, !authLoading && !!token);
  useNoindexPage(pageTitle(preview.data?.name ?? t('lists.join.title')), ROUTES.joinList(token));

  if (preview.isError || !preview.data) {
    return (
      <JoinLinkPending
        error={preview.isError ? preview.error : null}
        onRetry={() => void preview.refetch()}
        labels={{
          title: t('lists.join.title'),
          invalidTitle: t('lists.join.invalidTitle'),
          invalidMessage: t('lists.join.invalidMessage'),
          backHome: t('lists.join.backHome'),
          loadError: t('lists.join.loadError'),
          retry: t('lists.join.retry'),
          loading: t('lists.join.loading'),
        }}
        classNames={{ layout: styles.layout }}
      >
        <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
          <Skeleton variant="poster" className={styles.posterSkeleton} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Card>
      </JoinLinkPending>
    );
  }

  const data = preview.data;
  if (data.role && data.listId) {
    return <Navigate to={ROUTES.list(data.listId)} replace />;
  }

  return (
    <PageLayout className={styles.layout}>
      <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
        <Posters paths={data.posterPaths} />
        <p className={styles.overline}>{t('lists.join.overline')}</p>
        <h1 className={styles.title}>{data.name}</h1>
        <p className={styles.count}>{listCountLabel(data.itemCount, t)}</p>
        <p className={styles.inviter}>
          <Avatar avatarId={data.owner.avatarId} pseudo={data.owner.displayName} size="sm" />
          <span>{t('lists.join.invitedBy', { name: firstName(data.owner.displayName) })}</span>
        </p>
        <JoinActions token={token} preview={data} />
      </Card>
    </PageLayout>
  );
}
