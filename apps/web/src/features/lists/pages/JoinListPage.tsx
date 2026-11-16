import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Layers, Link2Off, Users } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
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
import type { MovieListInvitePreview } from '@/features/lists/api/listMembersApi';
import { useInvitePreview, useJoinListByLink } from '@/features/lists/hooks/useListMembers';
import { listCountLabel } from '@/features/lists/utils/listCount';
import { firstName } from '@/features/lists/utils/listMembers';
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
      <div className={styles.full}>
        <h2 className={styles.fullTitle}>
          <Users aria-hidden size={ICON_SIZE.md} />
          {t('lists.join.fullTitle')}
        </h2>
        <p className={styles.message}>{t('lists.join.fullMessage', { name: owner })}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <p className={styles.message}>{t('lists.join.signedOut')}</p>
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

  if (preview.isError && isNotFoundError(preview.error)) {
    return (
      <ErrorState
        icon={<Link2Off size={ICON_SIZE['4xl']} />}
        title={t('lists.join.invalidTitle')}
        message={t('lists.join.invalidMessage')}
        actions={
          <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
            {t('lists.join.backHome')}
          </Link>
        }
      />
    );
  }

  if (preview.isError) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('lists.join.title')}</h1>
        <InlineError
          message={t('lists.join.loadError')}
          retryLabel={t('lists.join.retry')}
          onRetry={() => void preview.refetch()}
        />
      </PageLayout>
    );
  }

  if (!preview.data) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('lists.join.title')}</h1>
        <SkeletonScreen label={t('lists.join.loading')}>
          <Card padding="lg" radius="lg" elevation="md" className={styles.card}>
            <Skeleton variant="poster" className={styles.posterSkeleton} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Card>
        </SkeletonScreen>
      </PageLayout>
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
