import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/features/auth/AuthContext';
import { LocaleProvider } from '@/features/i18n/LocaleContext';
import { QueryProvider } from '@/features/providers/QueryProvider';
import { ThemeProvider, useTheme } from '@/features/theme/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationShell() {
  const { resolvedTheme } = useTheme();
  return (
    <NavThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <NavigationShell />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
