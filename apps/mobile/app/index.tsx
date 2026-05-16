import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

export default function Landing() {
  const router = useRouter();
  const { user, isHydrating } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();

  if (isHydrating) {
    return (
      <Screen scrollable={false} padded={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      </Screen>
    );
  }

  if (user) {
    return <Redirect href="/my-events" />;
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.text, fontSize: 32, fontWeight: '700' }}>
            {t('common.appName')}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 16 }}>
            Trouvez ensemble le film de votre prochaine soirée. La roue tranche pour vous.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Button label={t('home.ctaLogin')} onPress={() => router.push('/login')} />
          <Button
            label={t('home.ctaRegister')}
            variant="secondary"
            onPress={() => router.push('/register')}
          />
        </View>
      </View>
    </Screen>
  );
}
