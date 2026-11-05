import { useState } from 'react';
import { Link } from 'react-router';
import { Globe, Pencil } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import Avatar from '@/shared/components/Avatar';
import AvatarPickerModal from '@/features/auth/components/AvatarPickerModal';
import { useAvatarPhotoActions } from '@/features/auth/hooks/useAvatarPhotoActions';
import { isAvatarPhotoId } from '@/shared/utils/avatar';
import { useTranslation } from '@/shared/i18n';
import type { UserProfile } from '@/features/auth/types';
import { ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';
import styles from './AccountIdentityHeader.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export default function AccountIdentityHeader({
  user,
  variant = 'desktop',
}: Readonly<{ user: UserProfile; variant?: 'desktop' | 'mobile' }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const { uploadPhoto, deletePhoto } = useAvatarPhotoActions();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const avatarSize = 'lg';
  const ownProfile = ownProfileDestination(user);

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

        {ownProfile.isPublicProfile && variant === 'desktop' && (
          <Link to={ownProfile.path} className={styles.identityLink}>
            <Globe size={ICON_SIZE.md} aria-hidden />
            <span>{t('profile.settings.viewMyProfile')}</span>
          </Link>
        )}
      </div>

      {avatarModalOpen && (
        <AvatarPickerModal
          open
          currentAvatarId={user.avatarId}
          photoAvatarId={user.avatarPhotoId ?? null}
          generatedAvatarId={user.generatedAvatarId ?? ''}
          onSelect={async (id) => {
            await patchProfile(isAvatarPhotoId(id) ? { useAvatarPhoto: true } : { avatarId: id });
          }}
          onUploadPhoto={uploadPhoto}
          onDeletePhoto={deletePhoto}
          onClose={() => setAvatarModalOpen(false)}
        />
      )}

      {ownProfile.isPublicProfile && variant === 'mobile' && (
        <Link to={ownProfile.path} className={styles.identityLinkMobile}>
          <Globe size={ICON_SIZE.md} aria-hidden />
          <span>{t('profile.settings.viewMyProfile')}</span>
        </Link>
      )}
    </div>
  );
}
