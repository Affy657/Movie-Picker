import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { ProfilePatch } from '@/features/auth/api/authApi';
import type { UserProfile } from '@/features/auth/types';

function withPatchedFieldsRestored(
  current: UserProfile | null | undefined,
  snapshot: UserProfile | null | undefined,
  patch: ProfilePatch
): UserProfile | null | undefined {
  if (!current || !snapshot) return current;
  const restored = Object.fromEntries(
    Object.keys(patch).map((field) => [field, snapshot[field as keyof UserProfile]])
  );
  return { ...current, ...restored };
}

export function useOptimisticProfilePatch(errorKey: TranslationKey) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const apply = (patch: ProfilePatch, onSaved?: () => Promise<void>) => {
    const snapshot = queryClient.getQueryData<UserProfile | null>(queryKeys.auth.me);
    setError(null);
    queryClient.setQueryData<UserProfile | null>(queryKeys.auth.me, (current) =>
      current ? { ...current, ...patch } : current
    );
    patchProfile(patch)
      .then(onSaved)
      .catch(() => {
        queryClient.setQueryData<UserProfile | null>(queryKeys.auth.me, (current) =>
          withPatchedFieldsRestored(current, snapshot, patch)
        );
        setError(t(errorKey));
      });
  };

  return { error, apply };
}
