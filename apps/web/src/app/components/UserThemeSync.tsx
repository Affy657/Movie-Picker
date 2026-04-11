import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';

/** Applique `uiTheme` du profil après login / chargement initial (serveur prioritaire). */
export default function UserThemeSync() {
  const { user, isLoading } = useAuth();
  const { applyRemotePreference } = useTheme();

  useEffect(() => {
    if (isLoading) return;
    if (user) applyRemotePreference(user.uiTheme);
  }, [isLoading, user?.userId, user?.uiTheme, applyRemotePreference]);

  return null;
}
