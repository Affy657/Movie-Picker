import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import ShareDialog from '@/shared/components/ShareDialog';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import { qrCardFileName, useQrCardImage } from '@/features/events/story/qrCardImage';

type Props = {
  profile: PublicProfile;
  open: boolean;
  onClose: () => void;
};

export default function ProfileShareDialog({ profile, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const shareUrl = absoluteUrl(ROUTES.profile(profile.handle));
  const handleLine = `@${profile.handle}`;
  const qrImage = useQrCardImage(
    open ? { title: profile.displayName, detail: handleLine, url: shareUrl } : null
  );

  return (
    <ShareDialog
      open={open}
      onClose={onClose}
      title={t('profile.shareTitle')}
      url={shareUrl}
      qrTitle={t('profile.qrTitle')}
      card={{ name: profile.displayName, detail: handleLine }}
      qrImage={qrImage}
      imageFileName={qrCardFileName(profile.handle)}
      identity={{ avatarId: profile.avatarId, name: profile.displayName, detail: handleLine }}
      analyticsSurface="profile"
    />
  );
}
