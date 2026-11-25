import { Image as ImageIcon } from 'lucide-react';
import FadedBanner from '@/shared/components/FadedBanner';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { ProfileBanner as Banner } from '@/features/profile/api/profileApi';

type Props = {
  banner: Banner;
  isOwner: boolean;
  onEdit: () => void;
  tinted?: boolean;
};

export default function ProfileBanner({
  banner,
  isOwner,
  onEdit,
  tinted = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const film = banner.source === 'film';
  const title = film ? banner.title : null;

  return (
    <FadedBanner
      imageUrl={banner.imageUrl}
      fromTmdb={film}
      tinted={tinted}
      credit={
        title && banner.tmdbId
          ? {
              title,
              to: ROUTES.moviePage({ tmdbId: banner.tmdbId, title }),
              ariaLabel: t('profile.banner.creditAriaLabel', { title }),
            }
          : null
      }
      action={
        isOwner ? (
          <IconButton
            ariaLabel={t('profile.banner.edit')}
            tone="onPoster"
            shape="round"
            expandHitArea
            onClick={onEdit}
          >
            <ImageIcon size={ICON_SIZE.md} aria-hidden />
          </IconButton>
        ) : null
      }
    />
  );
}
