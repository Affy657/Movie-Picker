import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAvatarPhoto, putAvatarPhoto } from '@/features/auth/api/authApi';
import { applyUpdatedProfile } from '@/features/auth/utils/profileCache';
import type { UserProfile } from '@/features/auth/types';

export function useAvatarPhotoActions() {
  const queryClient = useQueryClient();
  const onSuccess = (profile: UserProfile) => applyUpdatedProfile(queryClient, profile);

  const upload = useMutation({ mutationFn: putAvatarPhoto, onSuccess });
  const remove = useMutation({ mutationFn: deleteAvatarPhoto, onSuccess });

  return {
    uploadPhoto: async (photo: Blob) => {
      await upload.mutateAsync(photo);
    },
    deletePhoto: async () => {
      await remove.mutateAsync();
    },
  };
}
