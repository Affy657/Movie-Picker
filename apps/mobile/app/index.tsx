import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

type Feature = { icon: string; title: string; text: string };

const FEATURES: Feature[] = [
  {
    icon: '🔗',
    title: 'Lancez la soirée',
    text: 'Un lien, un QR code — tout le monde rejoint en deux clics.',
  },
  {
    icon: '🎬',
    title: 'Proposez vos films',
    text: 'Affiches, infos, plateformes : la liste se construit depuis TMDB.',
  },
  {
    icon: '👍',
    title: 'Votez ensemble',
    text: "Pouce en l'air, déjà vu, on garde — les favoris ressortent vite.",
  },
  {
    icon: '🎯',
    title: 'La roue tranche',
    text: "Toujours pas d'accord ? Un coup de roue et le verdict tombe.",
  },
];

export default function Landing() {
  const router = useRouter();
  const { user, isHydrating } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();

  if (isHydrating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/my-events" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 32, paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ gap: 16, paddingTop: 8 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: palette.badgeMeBg,
            }}
          >
            <Text style={{ fontSize: 12 }}>✨</Text>
            <Text
              style={{
                color: palette.badgeMeText,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1.44,
              }}
            >
              MOVIE NIGHT, SIMPLIFIÉE
            </Text>
          </View>

          <Text
            style={{
              color: palette.text,
              fontSize: 36,
              fontWeight: '800',
              letterSpacing: -1.26,
              lineHeight: 38,
            }}
          >
            Choisissez le film de la soirée{' '}
            <Text style={{ color: palette.primary }}>ensemble.</Text>
          </Text>

          <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 25 }}>
            Plus de débats interminables. Créez un événement, invitez vos amis, votez sur les
            propositions — et laissez la roue trancher si besoin.
          </Text>

          <View style={{ gap: 10, marginTop: 4 }}>
            <Button label={t('home.ctaLogin')} onPress={() => router.push('/login')} />
            <Button
              label={t('home.ctaRegister')}
              variant="secondary"
              onPress={() => router.push('/register')}
            />
          </View>
        </View>

        {/* Features */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
            EN 4 ÉTAPES
          </Text>
          <Text
            style={{
              color: palette.text,
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.4,
              lineHeight: 28,
            }}
          >
            De l&apos;invitation au générique
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, marginBottom: 4 }}>
            Une soirée ciné qui démarre vraiment à l&apos;heure. Promis.
          </Text>

          <View style={{ gap: 12, marginTop: 8 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  backgroundColor: palette.surface,
                  borderColor: palette.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: palette.badgeMeBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                    {f.title}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>
                    {f.text}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
