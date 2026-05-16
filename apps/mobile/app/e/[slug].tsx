import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/features/theme/ThemeContext';

export default function EventDetailPlaceholder() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { palette } = useTheme();
  return (
    <Screen>
      <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>Événement</Text>
      <Text style={{ color: palette.textMuted }}>slug : {slug}</Text>
      <Text style={{ color: palette.meta, fontSize: 13 }}>
        Le détail complet de la soirée arrive en phase 6.
      </Text>
    </Screen>
  );
}
