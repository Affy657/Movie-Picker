import { useAuth } from '@/features/auth/contexts/AuthContext';
import BannerPickerModal from '@/features/profile/components/BannerPickerModal';
import { useBannerActions } from '@/features/profile/hooks/useBannerActions';

export default function BannerPicker({ onClose }: Readonly<{ onClose: () => void }>) {
  const { user } = useAuth();
  const actions = useBannerActions();
  if (!user) return null;

  return (
    <BannerPickerModal
      open
      banner={user.banner ?? null}
      photoUrl={user.bannerPhotoUrl ?? null}
      onChoose={actions.chooseBanner}
      onRemove={actions.removeBanner}
      onUploadPhoto={actions.uploadBannerPhoto}
      onDeletePhoto={actions.deleteBannerPhoto}
      onClose={onClose}
    />
  );
}
