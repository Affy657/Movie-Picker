import { useRef, type ChangeEvent, type DragEvent } from 'react';
import { Check, ImagePlus, ImageUp, Trash2 } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { AVATAR_PHOTO_ACCEPT, AVATAR_PHOTO_MAX_BYTES } from '@/features/auth/utils/avatarPhotoFile';
import pickerStyles from './AvatarPickerModal.module.css';
import styles from './AvatarPhotoPanel.module.css';

const BYTES_PER_MEGABYTE = 1024 * 1024;

type Props = {
  photoAvatarId: string | null;
  selected: boolean;
  error: string | null;
  onChooseFile: (file: File) => void;
  onSelectPhoto: (photoAvatarId: string) => void;
  onDeleteRequest: () => void;
};

export default function AvatarPhotoPanel({
  photoAvatarId,
  selected,
  error,
  onChooseFile,
  onSelectPhoto,
  onDeleteRequest,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onChooseFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onChooseFile(file);
  }

  const openPicker = () => inputRef.current?.click();

  return (
    <div className={styles.panel}>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_PHOTO_ACCEPT}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="avatar-photo-input"
        onChange={handleInput}
      />

      {photoAvatarId ? (
        <div className={styles.photo}>
          <ChoiceGroup
            value={selected ? photoAvatarId : null}
            onChange={() => undefined}
            onSelect={onSelectPhoto}
            ariaLabel={t('auth.account.avatarCategoryPhoto')}
          >
            <ChoiceCard
              value={photoAvatarId}
              layout="tile"
              ariaLabel={t('auth.account.avatarPhotoUseAriaLabel')}
            >
              <Avatar avatarId={photoAvatarId} size="xl" />
              {selected && <Check size={ICON_SIZE.md} className={pickerStyles.check} aria-hidden />}
            </ChoiceCard>
          </ChoiceGroup>
          <div className={styles.side}>
            <p className={pickerStyles.hint}>
              {selected
                ? t('auth.account.avatarPhotoVisibility')
                : t('auth.account.avatarPhotoSelectHint')}
            </p>
            <div className={styles.actions}>
              <Button size="sm" onClick={openPicker}>
                <ImageUp size={ICON_SIZE.md} aria-hidden />
                {t('auth.account.avatarPhotoReplace')}
              </Button>
              <Button size="sm" variant="ghost" tone="danger" onClick={onDeleteRequest}>
                <Trash2 size={ICON_SIZE.md} aria-hidden />
                {t('auth.account.avatarPhotoDelete')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={styles.dropzone}
          data-testid="avatar-photo-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className={styles.dropzoneIcon} aria-hidden="true">
            <ImagePlus size={ICON_SIZE['3xl']} />
          </span>
          <p className={styles.dropzoneTitle}>{t('auth.account.avatarPhotoAddTitle')}</p>
          <p className={pickerStyles.hint}>
            <span className={styles.dropHint}>{t('auth.account.avatarPhotoDropHint')} </span>
            {t('auth.account.avatarPhotoFormatsHint', {
              max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE,
            })}
          </p>
          <Button size="sm" variant="primary" onClick={openPicker}>
            {t('auth.account.avatarPhotoChoose')}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className={pickerStyles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
