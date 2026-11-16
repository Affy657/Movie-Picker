import Avatar from '@/shared/components/Avatar';
import BackLink from '@/shared/components/BackLink';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileCollectionHeader.module.css';

export default function ProfileCollectionHeader({
  profile,
  title,
  subtitle,
}: Readonly<{
  profile: Pick<PublicProfile, 'handle' | 'displayName' | 'avatarId'>;
  title: string;
  subtitle: string | null;
}>) {
  const { t } = useTranslation();
  return (
    <>
      <BackLink to={ROUTES.profile(profile.handle)}>{t('profile.movies.backLink')}</BackLink>
      <div className={styles.headerRow}>
        <Avatar avatarId={profile.avatarId} pseudo={profile.displayName} size="lg" />
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
        </div>
      </div>
    </>
  );
}
