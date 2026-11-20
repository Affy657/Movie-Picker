import { useRef, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { ImagePlus, ImageUp, Trash2 } from 'lucide-react';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { AVATAR_PHOTO_ACCEPT } from '@/features/auth/utils/avatarPhotoFile';
import pickerStyles from './AvatarPickerModal.module.css';
import styles from './AvatarPhotoPanel.module.css';

export type PhotoUploadLabels = {
  addTitle: string;
  dropHint: string;
  formatsHint: string;
  choose: string;
  replace: string;
  delete: string;
};

type Props = {
  hasPhoto: boolean;
  layout: 'side' | 'stack';
  hint: ReactNode;
  labels: PhotoUploadLabels;
  error: string | null;
  testIdPrefix: string;
  onChooseFile: (file: File) => void;
  onDeleteRequest: () => void;
  children: ReactNode;
};

export default function PhotoUploadPanel({
  hasPhoto,
  layout,
  hint,
  labels,
  error,
  testIdPrefix,
  onChooseFile,
  onDeleteRequest,
  children,
}: Readonly<Props>) {
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
        data-testid={`${testIdPrefix}-input`}
        onChange={handleInput}
      />

      {hasPhoto ? (
        <div className={layout === 'side' ? styles.photo : styles.stack}>
          {layout === 'stack' && hint}
          {children}
          <div className={styles.side}>
            {layout === 'side' && hint}
            <div className={styles.actions}>
              <Button size="sm" onClick={openPicker}>
                <ImageUp size={ICON_SIZE.md} aria-hidden />
                {labels.replace}
              </Button>
              <Button size="sm" variant="ghost" tone="danger" onClick={onDeleteRequest}>
                <Trash2 size={ICON_SIZE.md} aria-hidden />
                {labels.delete}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={styles.dropzone}
          data-testid={`${testIdPrefix}-dropzone`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className={styles.dropzoneIcon} aria-hidden="true">
            <ImagePlus size={ICON_SIZE['3xl']} />
          </span>
          <p className={styles.dropzoneTitle}>{labels.addTitle}</p>
          <p className={pickerStyles.hint}>
            <span className={styles.dropHint}>{labels.dropHint} </span>
            {labels.formatsHint}
          </p>
          <Button size="sm" variant="primary" onClick={openPicker}>
            {labels.choose}
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
