import { useState } from 'react';
import { Link } from 'react-router';
import { Globe, Pencil } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import Avatar from '@/shared/components/Avatar';
import AvatarPickerModal from '@/features/auth/components/AvatarPickerModal';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';
import styles from './AccountIdentityHeader.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export default function AccountIdentityHeader({
  user,
  variant = 'desktop',
}: Readonly<{ user: UserProfile; variant?: 'desktop' | 'mobile' }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const avatarSize = 'lg';
  const linksToPublicProfile = Boolean(user.handle) && user.isProfilePublic;

  return (
    <div className={styles.wrapper} data-variant={variant}>
      <div className={styles.identity}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => setAvatarModalOpen(true)}
          aria-label={t('auth.account.avatarLabel')}
        >
          <Avatar avatarId={user.avatarId} pseudo={user.displayName} size={avatarSize} />
          <span className={styles.avatarEditOverlay} aria-hidden>
            <Pencil size={ICON_SIZE.sm} />
          </span>
        </button>

        <div className={styles.identityText}>
          <p className={styles.identityName}>{user.displayName}</p>
          {user.handle && <p className={styles.identityHandle}>@{user.handle}</p>}
        </div>

        {linksToPublicProfile && variant === 'desktop' && (
          <Link to={ROUTES.profile(user.handle)} className={styles.identityLink}>
            <Globe size={ICON_SIZE.md} aria-hidden />
            <span>{t('profile.settings.viewMyProfile')}</span>
          </Link>
        )}
      </div>

      <AvatarPickerModal
        open={avatarModalOpen}
        currentAvatarId={user.avatarId}
        onSelect={async (id) => {
          setAvatarModalOpen(false);
          await patchProfile({ avatarId: id });
        }}
        onClose={() => setAvatarModalOpen(false)}
      />

      {linksToPublicProfile && variant === 'mobile' && (
        <Link to={ROUTES.profile(user.handle)} className={styles.identityLinkMobile}>
          <Globe size={ICON_SIZE.md} aria-hidden />
          <span>{t('profile.settings.viewMyProfile')}</span>
        </Link>
      )}
    </div>
  );
}
