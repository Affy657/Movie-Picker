import { Text } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';

export default function SettingsPlaceholder() {
  const { user, logout } = useAuth();
  const { palette } = useTheme();

  return (
    <Screen>
      <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>Mon compte</Text>
      <Text style={{ color: palette.textMuted }}>
        {user?.displayName ?? user?.emailMasked ?? 'Connecté'}
      </Text>
      <Text style={{ color: palette.meta, fontSize: 13 }}>
        Préférences et profil complets — phase 14.
      </Text>
      <Button label="Se déconnecter" variant="secondary" onPress={() => logout()} />
    </Screen>
  );
}
