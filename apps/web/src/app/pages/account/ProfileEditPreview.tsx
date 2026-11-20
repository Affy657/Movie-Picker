import { lazy, Suspense, useState } from 'react';
import clsx from 'clsx';
import { ImagePlus, Pencil } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import AvatarPickerModal from '@/features/auth/components/AvatarPickerModal';
import { useAvatarPhotoActions } from '@/features/auth/hooks/useAvatarPhotoActions';
import type { UserProfile } from '@/features/auth/types';
import { useBannerActions } from '@/features/profile/hooks/useBannerActions';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { accentZoneClass, isChosenAccent } from '@/shared/utils/accentColor';
import { isAvatarPhotoId } from '@/shared/utils/avatar';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './ProfileEditPreview.module.css';

const BannerPickerModal = lazy(() => import('@/features/profile/components/BannerPickerModal'));

interface Props {
  user: UserProfile;
  displayName: string;
  bio: string;
  onSaved: () => void;
}

export default function ProfileEditPreview({ user, displayName, bio, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const { uploadPhoto, deletePhoto } = useAvatarPhotoActions();
  const bannerActions = useBannerActions();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const banner = user.banner ?? null;
  const accent = user.accentColor ?? 'default';
  const shownName = displayName.trim() || user.displayName;

  return (
    <section
      aria-label={t('profile.edit.previewLabel')}
      className={clsx(styles.preview, accentZoneClass(accent))}
    >
      <div className={styles.banner}>
        {banner && (
          <img
            src={posterImageSrc(banner.imageUrl)}
            alt=""
            decoding="async"
            data-testid="profile-banner-image"
            className={styles.bannerImage}
          />
        )}
        <div className={clsx(styles.bannerFade, isChosenAccent(accent) && styles.tinted)} />
        <div className={styles.bannerTools}>
          <Button size="sm" onClick={() => setBannerOpen(true)}>
            <ImagePlus size={ICON_SIZE.md} aria-hidden />
            {banner ? t('profile.edit.banner') : t('profile.edit.bannerAdd')}
          </Button>
        </div>
      </div>

      <div className={styles.identity}>
        <div className={styles.avatarWrap}>
          <Avatar
            avatarId={user.avatarId}
            pseudo={shownName}
            size="xl"
            accent={accent}
            priority
            className={clsx(styles.avatar, isChosenAccent(accent) && styles.avatarAccent)}
          />
          <IconButton
            ariaLabel={t('profile.edit.avatar')}
            shape="round"
            expandHitArea
            className={styles.avatarEdit}
            onClick={() => setAvatarOpen(true)}
          >
            <Pencil size={ICON_SIZE.md} aria-hidden />
          </IconButton>
        </div>
        <div className={styles.names}>
          <p className={styles.name}>{shownName}</p>
          <p className={styles.handle}>@{user.handle}</p>
        </div>
      </div>
      {bio.trim() && <p className={styles.bio}>{bio}</p>}

      {bannerOpen && (
        <Suspense fallback={null}>
          <BannerPickerModal
            open
            banner={banner}
            photoUrl={user.bannerPhotoUrl ?? null}
            onChoose={bannerActions.chooseBanner}
            onRemove={bannerActions.removeBanner}
            onUploadPhoto={bannerActions.uploadBannerPhoto}
            onDeletePhoto={bannerActions.deleteBannerPhoto}
            onClose={() => setBannerOpen(false)}
          />
        </Suspense>
      )}
      {avatarOpen && (
        <AvatarPickerModal
          open
          currentAvatarId={user.avatarId}
          photoAvatarId={user.avatarPhotoId ?? null}
          generatedAvatarId={user.generatedAvatarId ?? ''}
          onSelect={async (id) => {
            await patchProfile(isAvatarPhotoId(id) ? { useAvatarPhoto: true } : { avatarId: id });
            onSaved();
          }}
          onUploadPhoto={uploadPhoto}
          onDeletePhoto={deletePhoto}
          onClose={() => setAvatarOpen(false)}
        />
      )}
    </section>
  );
}
