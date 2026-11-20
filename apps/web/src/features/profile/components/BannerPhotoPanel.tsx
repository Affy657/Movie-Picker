import clsx from 'clsx';
import { Check } from 'lucide-react';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { AVATAR_PHOTO_MAX_BYTES } from '@/features/auth/utils/avatarPhotoFile';
import PhotoUploadPanel from '@/features/auth/components/PhotoUploadPanel';
import pickerStyles from '@/features/auth/components/AvatarPickerModal.module.css';
import styles from './BannerPickerModal.module.css';

const BYTES_PER_MEGABYTE = 1024 * 1024;
const PHOTO_CHOICE = 'photo';

type Props = {
  photoUrl: string | null;
  selected: boolean;
  error: string | null;
  onChooseFile: (file: File) => void;
  onSelectPhoto: () => void;
  onDeleteRequest: () => void;
};

export default function BannerPhotoPanel({
  photoUrl,
  selected,
  error,
  onChooseFile,
  onSelectPhoto,
  onDeleteRequest,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <PhotoUploadPanel
      hasPhoto={photoUrl !== null}
      layout="stack"
      hint={<p className={pickerStyles.hint}>{t('profile.banner.photoIntro')}</p>}
      labels={{
        addTitle: t('profile.banner.photoAddTitle'),
        dropHint: t('profile.banner.photoDropHint'),
        formatsHint: t('profile.banner.photoFormatsHint', {
          max: AVATAR_PHOTO_MAX_BYTES / BYTES_PER_MEGABYTE,
        }),
        choose: t('profile.banner.photoChoose'),
        replace: t('profile.banner.photoReplace'),
        delete: t('profile.banner.photoDelete'),
      }}
      error={error}
      testIdPrefix="banner-photo"
      onChooseFile={onChooseFile}
      onDeleteRequest={onDeleteRequest}
    >
      {photoUrl && (
        <ChoiceGroup
          value={selected ? PHOTO_CHOICE : null}
          onChange={() => undefined}
          onSelect={onSelectPhoto}
          ariaLabel={t('profile.banner.tabImage')}
          className={styles.photoGroup}
        >
          <ChoiceCard
            value={PHOTO_CHOICE}
            layout="tile"
            className={styles.tile}
            ariaLabel={t('profile.banner.photoUseAriaLabel')}
          >
            <img src={posterImageSrc(photoUrl)} alt="" decoding="async" className={styles.thumb} />
            {selected && (
              <Check
                size={ICON_SIZE.md}
                className={clsx(pickerStyles.check, styles.tileCheck)}
                aria-hidden
              />
            )}
          </ChoiceCard>
        </ChoiceGroup>
      )}
    </PhotoUploadPanel>
  );
}
