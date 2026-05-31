import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Link2 } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { APP_DOCUMENT_TITLE, pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useLocale, useTranslation } from '@/shared/i18n';
import { fetchPublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfilePage.module.css';

const COPY_FEEDBACK_MS = 2000;

function formatMemberSince(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle ?? ''),
    enabled: !!handle,
    retry: false,
  });

  const profile = profileQuery.data;

  useDocumentTitle(profile ? pageTitle(`@${profile.handle}`) : APP_DOCUMENT_TITLE);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopyLink = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
  }, []);

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className="page--centered">
        <p className="placeholder" aria-busy="true">
          {t('common.loading')}
        </p>
      </PageLayout>
    );
  }

  const isNotFound =
    !handle ||
    (profileQuery.isError && ApiError.is(profileQuery.error) && profileQuery.error.code === 404);

  if (isNotFound) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {t('profile.notFound')}
        </p>
        <Link to={ROUTES.home} className="btn">
          {t('profile.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {ApiError.is(profileQuery.error) ? profileQuery.error.message : t('profile.loadError')}
        </p>
      </PageLayout>
    );
  }

  const memberSince = formatMemberSince(profile.memberSince, locale);

  return (
    <PageLayout className={styles.layout}>
      <section className={styles.card} aria-labelledby="profile-heading">
        <Avatar avatarId={profile.avatarId} size="lg" className={styles.avatar} />
        <h1 id="profile-heading" className={styles.displayName}>
          {profile.displayName}
        </h1>
        <p className={styles.handle}>@{profile.handle}</p>

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        {memberSince && (
          <p className={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</p>
        )}

        <button type="button" className="btn btn-sm" onClick={handleCopyLink}>
          <Link2 size={14} aria-hidden />
          {copied ? t('profile.linkCopied') : t('profile.copyLink')}
        </button>
      </section>
    </PageLayout>
  );
}
