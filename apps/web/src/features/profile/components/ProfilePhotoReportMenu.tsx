import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag, MoreHorizontal } from 'lucide-react';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import IconButton from '@/shared/components/IconButton';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation, type Translate } from '@/shared/i18n';
import { isAvatarPhotoId } from '@/shared/utils/avatar';
import {
  reportProfilePhoto,
  type ProfilePhotoKind,
  type PublicProfile,
} from '@/features/profile/api/profileApi';
import styles from './ProfilePhotoReportMenu.module.css';

function reportablePhotos(profile: PublicProfile): ProfilePhotoKind[] {
  const photos: ProfilePhotoKind[] = [];
  if (isAvatarPhotoId(profile.avatarId)) photos.push('avatar');
  if (profile.banner?.source === 'photo') photos.push('banner');
  return photos;
}

function itemLabel(photo: ProfilePhotoKind, t: Translate): string {
  return photo === 'avatar' ? t('profile.report.avatar') : t('profile.report.banner');
}

function dialogTitle(photo: ProfilePhotoKind, t: Translate): string {
  return photo === 'banner' ? t('profile.report.bannerTitle') : t('profile.report.avatarTitle');
}

export default function ProfilePhotoReportMenu({ profile }: Readonly<{ profile: PublicProfile }>) {
  const { t } = useTranslation();
  const menu = useMenuState({ align: 'right' });
  const [reporting, setReporting] = useState<ProfilePhotoKind | null>(null);
  const report = useMutation({
    mutationFn: (photo: ProfilePhotoKind) => reportProfilePhoto(profile.handle, photo),
  });

  const photos = reportablePhotos(profile);
  if (photos.length === 0) return null;

  const label = t('profile.report.moreActions');
  const sent = report.isSuccess;
  const close = () => {
    setReporting(null);
    report.reset();
  };
  const message = report.isError
    ? getErrorMessage(report.error, t('profile.report.failed'))
    : t('profile.report.message', { name: profile.displayName });

  return (
    <div ref={menu.containerRef} className={styles.menu}>
      <IconButton {...menu.triggerProps} size="md" ariaLabel={label} showTitle={false}>
        <MoreHorizontal size={ICON_SIZE.md} aria-hidden />
      </IconButton>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label}>
          {photos.map((photo) => (
            <MenuItem
              key={photo}
              icon={<Flag size={ICON_SIZE.sm} aria-hidden />}
              aria-haspopup="dialog"
              onClick={() => {
                menu.close();
                setReporting(photo);
              }}
            >
              {itemLabel(photo, t)}
            </MenuItem>
          ))}
        </MenuPanel>
      ) : null}
      {reporting ? (
        <ConfirmDialog
          open
          title={sent ? t('profile.report.sentTitle') : dialogTitle(reporting, t)}
          message={sent ? t('profile.report.sentMessage') : message}
          confirmLabel={sent ? t('common.close') : t('profile.report.confirm')}
          confirmTone="default"
          hideCancel={sent}
          loading={report.isPending}
          onConfirm={() => (sent ? close() : report.mutate(reporting))}
          onCancel={close}
          testId="profile-photo-report"
        />
      ) : null}
    </div>
  );
}
