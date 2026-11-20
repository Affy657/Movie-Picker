import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteBannerPhoto,
  deleteProfileBanner,
  putBannerPhoto,
  putProfileBanner,
  type ProfileBannerChoice,
} from '@/features/auth/api/authApi';
import { applyUpdatedProfile } from '@/features/auth/utils/profileCache';
import type { UserProfile } from '@/features/auth/types';

export function useBannerActions() {
  const queryClient = useQueryClient();
  const onSuccess = (profile: UserProfile) => applyUpdatedProfile(queryClient, profile);

  const choose = useMutation({ mutationFn: putProfileBanner, onSuccess });
  const remove = useMutation({ mutationFn: deleteProfileBanner, onSuccess });
  const upload = useMutation({ mutationFn: putBannerPhoto, onSuccess });
  const removePhoto = useMutation({ mutationFn: deleteBannerPhoto, onSuccess });

  return {
    chooseBanner: async (choice: ProfileBannerChoice) => {
      await choose.mutateAsync(choice);
    },
    removeBanner: async () => {
      await remove.mutateAsync();
    },
    uploadBannerPhoto: async (photo: Blob) => {
      await upload.mutateAsync(photo);
    },
    deleteBannerPhoto: async () => {
      await removePhoto.mutateAsync();
    },
  };
}
