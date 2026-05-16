import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { useTranslation } from '@/features/i18n/LocaleContext';

export default function AuthedLayout() {
  const { user, isHydrating } = useAuth();
  const { palette } = useTheme();
  const { t } = useTranslation();

  if (isHydrating) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.meta,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.borderSubtle,
        },
      }}
    >
      <Tabs.Screen name="my-events" options={{ title: t('nav.myEvents') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.account') }} />
      <Tabs.Screen name="new" options={{ href: null }} />
    </Tabs>
  );
}
