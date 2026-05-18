import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

const OFFLINE_DEBOUNCE_MS = 500;

export function OfflineBanner() {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setOffline(isOffline);
      }, OFFLINE_DEBOUNCE_MS);
    });
    return () => {
      if (debounceRef.current != null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      unsub();
    };
  }, []);

  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: palette.error,
      }}
    >
      <Ionicons name="cloud-offline" size={14} color="#ffffff" />
      <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
        {t('mobile.offline.banner')}
      </Text>
    </View>
  );
}
