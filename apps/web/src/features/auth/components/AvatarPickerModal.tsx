import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { BOTTTS_IDS, EMOJI_IDS, avatarUrl, isAvatarPhotoId } from '@/shared/utils/avatar';
import { ApiError } from '@/shared/api/apiError';
import Modal, { ModalBody } from '@/shared/components/Modal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { TabPanel, Tabs } from '@/shared/components/Tabs';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import AvatarPhotoPanel from '@/features/auth/components/AvatarPhotoPanel';
import AvatarPhotoCropper from '@/features/auth/components/AvatarPhotoCropper';
import { apiReasonMessage, usePhotoUpload } from '@/features/auth/hooks/usePhotoUpload';
import {
  AVATAR_PHOTO_MAX_BYTES,
  AVATAR_PHOTO_MIN_SIDE,
  loadAvatarPhoto,
  renderAvatarPhoto,
  type AvatarPhotoFileError,
} from '@/features/auth/utils/avatarPhotoFile';
import type { Rect } from '@/features/auth/utils/avatarPhotoCrop';
import styles from './AvatarPickerModal.module.css';

type Category = 'photo' | 'bottts' | 'emoji';

const AVATAR_OPTION_PX = 48;
const TOO_MANY_REQUESTS = 429;
const BYTES_PER_MEGABYTE = 1024 * 1024;

const FILE_ERROR_KEYS = {
  tooLarge: 'auth.account.avatarPhotoTooLarge',
  unsupported: 'auth.account.avatarPhotoUnsupported',
  tooSmall: 'auth.account.avatarPhotoTooSmall',
} as const satisfies Record<AvatarPhotoFileError, string>;

type Props = {
  open: boolean;
  currentAvatarId: string;
  photoAvatarId: string | null;
  generatedAvatarId: string;
  onSelect: (id: string) => Promise<void>;
  onUploadPhoto: (photo: Blob) => Promise<void>;
  onDeletePhoto: () => Promise<void>;
  onClose: () => void;
};

function initialCategory(currentAvatarId: string): Category {
  if (!currentAvatarId || isAvatarPhotoId(currentAvatarId)) return 'photo';
  return EMOJI_IDS.includes(currentAvatarId as never) ? 'emoji' : 'bottts';
}

export default function AvatarPickerModal({
  open,
  currentAvatarId,
  photoAvatarId,
  generatedAvatarId,
  onSelect,
  onUploadPhoto,
  onDeletePhoto,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const reactId = useId();
  const titleId = `avatar-modal-title-${reactId}`;
  const tabsId = `avatar-category-${reactId}`;

  const [category, setCategory] = useState<Category>(() => initialCategory(currentAvatarId));
  const [browsedAvatarId, setBrowsedAvatarId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function fileErrorMessage(reason: AvatarPhotoFileError): string {
    return t(FILE_ERROR_KEYS[reason], {
      max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE,
      min: AVATAR_PHOTO_MIN_SIDE,
    });
  }

  const photo = usePhotoUpload({
    open,
    load: loadAvatarPhoto,
    fileErrorMessage,
    onDeletePhoto,
    deleteFailedMessage: t('auth.account.avatarPhotoDeleteFailed'),
  });

  const photoIsActive = photoAvatarId !== null && currentAvatarId === photoAvatarId;
  const generatedIds = category === 'emoji' ? EMOJI_IDS : BOTTTS_IDS;
  const selectedAvatarId = browsedAvatarId ?? currentAvatarId;

  function closeCrop() {
    photo.closeCrop();
    setUploadError(null);
  }

  async function handleSelect(id: string) {
    setBrowsedAvatarId(null);
    setSelectError(null);
    try {
      await onSelect(id);
      onClose();
    } catch (error) {
      setSelectError(apiReasonMessage(error) ?? t('auth.account.avatarSaveError'));
    }
  }

  async function handleConfirm(rect: Rect) {
    if (!photo.cropPhoto) return;
    setSaving(true);
    setUploadError(null);
    try {
      await onUploadPhoto(await renderAvatarPhoto(photo.cropPhoto.image, rect));
      closeCrop();
      onClose();
    } catch (error) {
      setUploadError(
        ApiError.is(error) && error.code === TOO_MANY_REQUESTS
          ? t('auth.account.avatarPhotoRateLimited')
          : (apiReasonMessage(error) ?? t('auth.account.avatarPhotoUploadFailed'))
      );
    } finally {
      setSaving(false);
    }
  }

  function deleteMessage(): string {
    if (!photoIsActive) return t('auth.account.avatarPhotoDeleteInactive');
    return generatedAvatarId
      ? t('auth.account.avatarPhotoDeleteBackToAvatar')
      : t('auth.account.avatarPhotoDeleteBackToInitials');
  }

  function handleClose() {
    closeCrop();
    setBrowsedAvatarId(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={photo.cropPhoto ? closeCrop : handleClose}
      size="sm"
      column
      title={
        photo.cropPhoto ? t('auth.account.avatarPhotoCropTitle') : t('auth.account.avatarLabel')
      }
      titleId={titleId}
    >
      <ModalBody>
        {photo.cropPhoto ? (
          <AvatarPhotoCropper
            photo={photo.cropPhoto}
            saving={saving}
            error={uploadError}
            onCancel={closeCrop}
            onConfirm={(rect) => void handleConfirm(rect)}
          />
        ) : (
          <>
            <Tabs
              idBase={tabsId}
              variant="pill"
              className={styles.tabs}
              ariaLabel={t('auth.account.avatarLabel')}
              active={category}
              onChange={setCategory}
              tabs={[
                { key: 'photo', label: t('auth.account.avatarCategoryPhoto') },
                { key: 'bottts', label: t('auth.account.avatarCategoryRobots') },
                { key: 'emoji', label: t('auth.account.avatarCategoryEmoji') },
              ]}
            />

            <TabPanel idBase={tabsId} tabKey="photo" active={category === 'photo'}>
              <AvatarPhotoPanel
                photoAvatarId={photoAvatarId}
                selected={photoIsActive}
                error={photo.panelError}
                onChooseFile={(file) => void photo.handleFile(file)}
                onSelectPhoto={(id) => void handleSelect(id)}
                onDeleteRequest={photo.askToDelete}
              />
            </TabPanel>

            <TabPanel idBase={tabsId} tabKey={category} active={category !== 'photo'}>
              <ChoiceGroup
                value={selectedAvatarId}
                onChange={setBrowsedAvatarId}
                onSelect={(id) => void handleSelect(id)}
                ariaLabel={t('auth.account.avatarLabel')}
                className={styles.grid}
              >
                {generatedIds.map((id) => {
                  const selected = id === selectedAvatarId;
                  return (
                    <ChoiceCard
                      key={id}
                      value={id}
                      layout="tile"
                      ariaLabel={t('auth.account.avatarOptionAriaLabel', { name: id })}
                    >
                      <img
                        src={avatarUrl(id)}
                        alt=""
                        aria-hidden="true"
                        width={AVATAR_OPTION_PX}
                        height={AVATAR_OPTION_PX}
                        loading="lazy"
                        decoding="async"
                        className={styles.img}
                      />
                      {selected && (
                        <Check size={ICON_SIZE.md} className={styles.check} aria-hidden />
                      )}
                    </ChoiceCard>
                  );
                })}
              </ChoiceGroup>
            </TabPanel>

            {selectError && (
              <p role="alert" className={`${styles.error} ${styles.selectError}`}>
                {selectError}
              </p>
            )}
          </>
        )}

        <ConfirmDialog
          open={photo.confirmingDelete}
          title={t('auth.account.avatarPhotoDeleteTitle')}
          message={deleteMessage()}
          confirmLabel={t('auth.account.avatarPhotoDeleteConfirm')}
          confirmTone="danger"
          loading={photo.deleting}
          onConfirm={() => void photo.handleDelete()}
          onCancel={photo.cancelDelete}
          testId="avatar-photo-delete"
        />
      </ModalBody>
    </Modal>
  );
}
