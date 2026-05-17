import { useRouter } from 'expo-router';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  showBack?: boolean;
  style?: ViewStyle;
};

/**
 * Equivalent mobile de `AuthPageShell` web :
 * - bouton "← Accueil" en haut
 * - carte surface + border subtle + radius-lg (18) + shadow-md
 * - barre d'accent 3px en haut (gradient primary → accent-warm)
 * - titre 800, -0.025em letter-spacing
 */
export function AuthCard({ title, description, children, showBack = true, style }: Props) {
  const { palette } = useTheme();
  const router = useRouter();

  return (
    <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 }}>
      {showBack ? (
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          accessibilityRole="link"
          hitSlop={6}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: pressed ? palette.borderSubtle : 'transparent',
          })}
        >
          <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '500' }}>
            ← Accueil
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          {
            position: 'relative',
            backgroundColor: palette.surface,
            borderColor: palette.borderSubtle,
            borderWidth: 1,
            borderRadius: 18,
            padding: 24,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <AccentBar primary={palette.primary} warm={palette.accentWarm} />
        <Text
          style={{
            color: palette.text,
            fontSize: 24,
            fontWeight: '800',
            letterSpacing: -0.6,
            lineHeight: 28.8,
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text style={{ color: palette.textMuted, fontSize: 15, lineHeight: 22 }}>
            {description}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** Barre d'accent 3px en haut de la carte (gradient primary → accent warm). */
function AccentBar({ primary, warm }: { primary: string; warm: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 24,
        right: 24,
        height: 3,
        borderBottomLeftRadius: 999,
        borderBottomRightRadius: 999,
        overflow: 'hidden',
      }}
    >
      <Svg width="100%" height={3}>
        <Defs>
          <SvgLinearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={primary} />
            <Stop offset="1" stopColor={warm} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="3" fill="url(#accent)" />
      </Svg>
    </View>
  );
}

