import { useId, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { BOTTTS_IDS, EMOJI_IDS, avatarUrl, isAvatarPhotoId } from '@/shared/utils/avatar';
import { ApiError } from '@/shared/api/apiError';
import Modal from '@/shared/components/Modal';
import IconButton from '@/shared/components/IconButton';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { TabPanel, Tabs } from '@/shared/components/Tabs';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import AvatarPhotoPanel from '@/features/auth/components/AvatarPhotoPanel';
import AvatarPhotoCropper from '@/features/auth/components/AvatarPhotoCropper';
import {
  AVATAR_PHOTO_MAX_BYTES,
  AVATAR_PHOTO_MIN_SIDE,
  AvatarPhotoFileRejection,
  checkAvatarPhotoFile,
  loadAvatarPhoto,
  renderAvatarPhoto,
  type AvatarPhotoFileError,
  type LoadedAvatarPhoto,
} from '@/features/auth/utils/avatarPhotoFile';
import type { SourceRect } from '@/features/auth/utils/avatarPhotoCrop';
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

function reasonOf(error: unknown): string | null {
  return ApiError.is(error) && error.reason ? error.message : null;
}

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
  const [cropPhoto, setCropPhoto] = useState<LoadedAvatarPhoto | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRequest = useRef(0);

  const photoIsActive = photoAvatarId !== null && currentAvatarId === photoAvatarId;
  const generatedIds = category === 'emoji' ? EMOJI_IDS : BOTTTS_IDS;

  function closeCrop() {
    if (cropPhoto) URL.revokeObjectURL(cropPhoto.url);
    setCropPhoto(null);
    setUploadError(null);
  }

  function fileErrorMessage(reason: AvatarPhotoFileError): string {
    return t(FILE_ERROR_KEYS[reason], {
      max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE,
      min: AVATAR_PHOTO_MIN_SIDE,
    });
  }

  async function handleFile(file: File) {
    const request = ++fileRequest.current;
    const fileError = checkAvatarPhotoFile(file);
    if (fileError) {
      setPanelError(fileErrorMessage(fileError));
      return;
    }
    setPanelError(null);
    try {
      const photo = await loadAvatarPhoto(file);
      if (request === fileRequest.current) setCropPhoto(photo);
      else URL.revokeObjectURL(photo.url);
    } catch (error) {
      if (request !== fileRequest.current) return;
      const reason = error instanceof AvatarPhotoFileRejection ? error.reason : 'unsupported';
      setPanelError(fileErrorMessage(reason));
    }
  }

  async function handleSelect(id: string) {
    setSelectError(null);
    try {
      await onSelect(id);
      onClose();
    } catch (error) {
      setSelectError(reasonOf(error) ?? t('auth.account.avatarSaveFailed'));
    }
  }

  async function handleConfirm(rect: SourceRect) {
    if (!cropPhoto) return;
    setSaving(true);
    setUploadError(null);
    try {
      await onUploadPhoto(await renderAvatarPhoto(cropPhoto.image, rect));
      closeCrop();
      onClose();
    } catch (error) {
      setUploadError(
        ApiError.is(error) && error.code === TOO_MANY_REQUESTS
          ? t('auth.account.avatarPhotoRateLimited')
          : (reasonOf(error) ?? t('auth.account.avatarPhotoUploadFailed'))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDeletePhoto();
      setPanelError(null);
    } catch {
      setPanelError(t('auth.account.avatarPhotoDeleteFailed'));
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
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
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} size="sm" padded ariaLabelledBy={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {cropPhoto ? t('auth.account.avatarPhotoCropTitle') : t('auth.account.avatarLabel')}
        </h2>
        <IconButton ariaLabel={t('common.close')} onClick={cropPhoto ? closeCrop : handleClose}>
          <X size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
      </div>

      {cropPhoto ? (
        <AvatarPhotoCropper
          photo={cropPhoto}
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
              error={panelError}
              onChooseFile={(file) => void handleFile(file)}
              onSelectPhoto={(id) => void handleSelect(id)}
              onDeleteRequest={() => setConfirmingDelete(true)}
            />
          </TabPanel>

          <TabPanel idBase={tabsId} tabKey={category} active={category !== 'photo'}>
            <ChoiceGroup
              value={currentAvatarId}
              onChange={(id) => void handleSelect(id)}
              ariaLabel={t('auth.account.avatarLabel')}
              className={styles.grid}
            >
              {generatedIds.map((id) => {
                const selected = id === currentAvatarId;
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
                    {selected && <Check size={ICON_SIZE.md} className={styles.check} aria-hidden />}
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
        open={confirmingDelete}
        title={t('auth.account.avatarPhotoDeleteTitle')}
        message={deleteMessage()}
        confirmLabel={t('auth.account.avatarPhotoDeleteConfirm')}
        confirmTone="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmingDelete(false)}
        testId="avatar-photo-delete"
      />
    </Modal>
  );
}
