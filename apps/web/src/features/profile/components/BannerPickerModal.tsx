import { useId, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ApiError } from '@/shared/api/apiError';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/shared/components/Modal';
import { TabPanel, Tabs } from '@/shared/components/Tabs';
import AvatarPhotoCropper from '@/features/auth/components/AvatarPhotoCropper';
import { apiReasonMessage, usePhotoUpload } from '@/features/auth/hooks/usePhotoUpload';
import {
  AVATAR_PHOTO_MAX_BYTES,
  type AvatarPhotoFileError,
} from '@/features/auth/utils/avatarPhotoFile';
import type { Rect } from '@/features/auth/utils/avatarPhotoCrop';
import type { ProfileBannerChoice } from '@/features/auth/api/authApi';
import type { ProfileBanner } from '@/features/profile/api/profileApi';
import { loadBannerPhoto, renderBannerPhoto } from '@/features/profile/utils/bannerPhotoFile';
import BannerFilmsPanel from '@/features/profile/components/BannerFilmsPanel';
import BannerPhotoPanel from '@/features/profile/components/BannerPhotoPanel';
import pickerStyles from '@/features/auth/components/AvatarPickerModal.module.css';
import styles from './BannerPickerModal.module.css';

type Source = 'films' | 'image';

const TOO_MANY_REQUESTS = 429;
const BYTES_PER_MEGABYTE = 1024 * 1024;

const FILE_ERROR_KEYS = {
  tooLarge: 'profile.banner.photoTooLarge',
  unsupported: 'profile.banner.photoUnsupported',
  tooSmall: 'profile.banner.photoTooSmall',
} as const satisfies Record<AvatarPhotoFileError, string>;

type Props = {
  open: boolean;
  banner: ProfileBanner | null;
  photoUrl: string | null;
  onChoose: (choice: ProfileBannerChoice) => Promise<void>;
  onRemove: () => Promise<void>;
  onUploadPhoto: (photo: Blob) => Promise<void>;
  onDeletePhoto: () => Promise<void>;
  onClose: () => void;
};

export default function BannerPickerModal({
  open,
  banner,
  photoUrl,
  onChoose,
  onRemove,
  onUploadPhoto,
  onDeletePhoto,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const reactId = useId();
  const titleId = `banner-modal-title-${reactId}`;
  const tabsId = `banner-source-${reactId}`;

  const [source, setSource] = useState<Source>(banner?.source === 'photo' ? 'image' : 'films');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const photo = usePhotoUpload({
    open,
    load: loadBannerPhoto,
    fileErrorMessage: (reason) =>
      t(FILE_ERROR_KEYS[reason], { max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE }),
    onDeletePhoto,
    deleteFailedMessage: t('profile.banner.deleteFailed'),
  });

  function failureMessage(error: unknown): string {
    if (ApiError.is(error) && error.code === TOO_MANY_REQUESTS) {
      return t('profile.banner.photoRateLimited');
    }
    return apiReasonMessage(error) ?? t('profile.banner.saveFailed');
  }

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setSaveError(null);
    try {
      await action();
      photo.closeCrop();
      onClose();
    } catch (error) {
      setSaveError(failureMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function closeCrop() {
    photo.closeCrop();
    setSaveError(null);
  }

  function handleConfirmCrop(rect: Rect) {
    const cropped = photo.cropPhoto;
    if (!cropped) return;
    void run(async () => onUploadPhoto(await renderBannerPhoto(cropped.image, rect)));
  }

  function handleClose() {
    photo.closeCrop();
    onClose();
  }

  const photoIsBanner = banner?.source === 'photo';

  return (
    <Modal
      open={open}
      onClose={photo.cropPhoto ? closeCrop : handleClose}
      size="md"
      column
      title={photo.cropPhoto ? t('profile.banner.cropTitle') : t('profile.banner.pickerTitle')}
      titleId={titleId}
    >
      <ModalBody>
        {photo.cropPhoto ? (
          <AvatarPhotoCropper
            photo={photo.cropPhoto}
            shape="landscape"
            saving={saving}
            error={saveError}
            hint={t('profile.banner.cropHint')}
            areaLabel={t('profile.banner.cropAreaLabel')}
            confirmLabel={t('profile.banner.cropConfirm')}
            onCancel={closeCrop}
            onConfirm={handleConfirmCrop}
          />
        ) : (
          <>
            <Tabs
              idBase={tabsId}
              variant="pill"
              className={pickerStyles.tabs}
              ariaLabel={t('profile.banner.sourceLabel')}
              active={source}
              onChange={setSource}
              tabs={[
                { key: 'films', label: t('profile.banner.tabFilms') },
                { key: 'image', label: t('profile.banner.tabImage') },
              ]}
            />

            <TabPanel idBase={tabsId} tabKey="films" active={source === 'films'}>
              <BannerFilmsPanel
                banner={banner}
                disabled={saving}
                onChoose={(tmdbId, imagePath) =>
                  void run(() => onChoose({ source: 'film', tmdbId, imagePath }))
                }
              />
            </TabPanel>

            <TabPanel idBase={tabsId} tabKey="image" active={source === 'image'}>
              <BannerPhotoPanel
                photoUrl={photoUrl}
                selected={photoIsBanner}
                error={photo.panelError}
                onChooseFile={(file) => {
                  setSaveError(null);
                  void photo.handleFile(file);
                }}
                onSelectPhoto={() => void run(() => onChoose({ source: 'photo' }))}
                onDeleteRequest={photo.askToDelete}
              />
            </TabPanel>

            {saveError && (
              <p role="alert" className={`${pickerStyles.error} ${styles.saveError}`}>
                {saveError}
              </p>
            )}
          </>
        )}

        <ConfirmDialog
          open={photo.confirmingDelete}
          title={t('profile.banner.deleteTitle')}
          message={
            photoIsBanner
              ? t('profile.banner.deleteMessageActive')
              : t('profile.banner.deleteMessageInactive')
          }
          confirmLabel={t('profile.banner.deleteConfirm')}
          confirmTone="danger"
          loading={photo.deleting}
          onConfirm={() => void photo.handleDelete()}
          onCancel={photo.cancelDelete}
          testId="banner-photo-delete"
        />
      </ModalBody>
      {banner && !photo.cropPhoto && (
        <ModalFooter className={styles.footer}>
          <Button
            size="sm"
            variant="ghost"
            tone="danger"
            disabled={saving}
            onClick={() => void run(onRemove)}
          >
            {t('profile.banner.remove')}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
