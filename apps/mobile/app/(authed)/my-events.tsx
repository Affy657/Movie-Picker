import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

export default function MyEventsPlaceholder() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('nav.myEvents')}
        </Text>
        <Text style={{ color: palette.textMuted }}>
          Connecté en tant que {user?.displayName ?? user?.emailMasked ?? '?'}.
        </Text>
        <Text style={{ color: palette.meta, fontSize: 13 }}>
          La liste de tes soirées arrive en phase 5.
        </Text>
      </View>

      <Button label="Se déconnecter" variant="secondary" onPress={() => logout()} />
    </Screen>
  );
}
