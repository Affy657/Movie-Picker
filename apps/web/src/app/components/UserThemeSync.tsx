import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';

/** Applique `uiTheme` et `accentColor` du profil après login / chargement initial (serveur prioritaire). */
export default function UserThemeSync() {
  const { user, isLoading } = useAuth();
  const { applyRemotePreference, applyRemoteAccent } = useTheme();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      applyRemotePreference(user.uiTheme);
      applyRemoteAccent(user.accentColor);
    }
  }, [
    isLoading,
    user?.userId,
    user?.uiTheme,
    user?.accentColor,
    applyRemotePreference,
    applyRemoteAccent,
  ]);

  return null;
}
