import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

export function OfflineBanner() {
  const { palette } = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return unsub;
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
        Hors ligne — certaines actions peuvent échouer.
      </Text>
    </View>
  );
}
