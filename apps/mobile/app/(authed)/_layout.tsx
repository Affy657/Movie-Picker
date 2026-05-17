import { Ionicons } from '@expo/vector-icons';
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
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.borderSubtle,
          height: 64,
          paddingTop: 8,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="my-events"
        options={{
          title: t('nav.myEvents'),
          tabBarAccessibilityLabel: t('nav.myEvents'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.account'),
          tabBarAccessibilityLabel: t('nav.account'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="new" options={{ href: null }} />
    </Tabs>
  );
}
