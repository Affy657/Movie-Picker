import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = { theme: string | null | undefined };

/**
 * Équivalent mobile de `EventThemeBanner` web.
 * Bandeau coloré avec icône à gauche + kicker "THÈME" + libellé du thème.
 * Visuellement simplifié : couleur primary 8/15% au lieu d'une teinte calculée
 * depuis le hash du libellé.
 */
export function EventThemeBanner({ theme }: Props) {
  const { palette } = useTheme();
  const label = theme?.trim();
  if (!label) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.primary,
        backgroundColor: palette.badgeMeBg,
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
      accessibilityRole="text"
      accessibilityLabel={`Thème de soirée : ${label}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: palette.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="pricetag" size={18} color={palette.primaryContrast} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: palette.primary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.2,
          }}
        >
          THÈME
        </Text>
        <Text
          style={{
            color: palette.text,
            fontSize: 15,
            fontWeight: '600',
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
