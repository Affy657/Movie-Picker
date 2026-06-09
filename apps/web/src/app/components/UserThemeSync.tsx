import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';

export default function UserThemeSync() {
  const { user, isLoading } = useAuth();
  const { applyRemotePreference, applyRemoteAccent } = useTheme();

  const userId = user?.userId ?? null;
  const uiTheme = user?.uiTheme ?? null;
  const accentColor = user?.accentColor ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (userId !== null && uiTheme !== null && accentColor !== null) {
      applyRemotePreference(uiTheme);
      applyRemoteAccent(accentColor);
    }
  }, [isLoading, userId, uiTheme, accentColor, applyRemotePreference, applyRemoteAccent]);

  return null;
}
