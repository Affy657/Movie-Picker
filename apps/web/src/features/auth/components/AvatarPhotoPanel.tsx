import { Check } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { AVATAR_PHOTO_MAX_BYTES } from '@/features/auth/utils/avatarPhotoFile';
import PhotoUploadPanel from '@/features/auth/components/PhotoUploadPanel';
import pickerStyles from './AvatarPickerModal.module.css';

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

  return (
    <PhotoUploadPanel
      hasPhoto={photoAvatarId !== null}
      layout="side"
      hint={
        <p className={pickerStyles.hint}>
          {selected
            ? t('auth.account.avatarPhotoVisibility')
            : t('auth.account.avatarPhotoSelectHint')}
        </p>
      }
      labels={{
        addTitle: t('auth.account.avatarPhotoAddTitle'),
        dropHint: t('auth.account.avatarPhotoDropHint'),
        formatsHint: t('auth.account.avatarPhotoFormatsHint', {
          max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE,
        }),
        choose: t('auth.account.avatarPhotoChoose'),
        replace: t('auth.account.avatarPhotoReplace'),
        delete: t('auth.account.avatarPhotoDelete'),
      }}
      error={error}
      testIdPrefix="avatar-photo"
      onChooseFile={onChooseFile}
      onDeleteRequest={onDeleteRequest}
    >
      {photoAvatarId && (
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
      )}
    </PhotoUploadPanel>
  );
}
