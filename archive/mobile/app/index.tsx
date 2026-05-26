import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

type Feature = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  titleKey: 'f1Title' | 'f2Title' | 'f3Title' | 'f4Title';
  textKey: 'f1Text' | 'f2Text' | 'f3Text' | 'f4Text';
};

const FEATURES: Feature[] = [
  { icon: 'link', titleKey: 'f1Title', textKey: 'f1Text' },
  { icon: 'film', titleKey: 'f2Title', textKey: 'f2Text' },
  { icon: 'thumbs-up', titleKey: 'f3Title', textKey: 'f3Text' },
  { icon: 'disc', titleKey: 'f4Title', textKey: 'f4Text' },
];

export default function Landing() {
  const router = useRouter();
  const { user, isHydrating } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();

  if (isHydrating) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
            <Ionicons name="sparkles" size={12} color={palette.badgeMeText} />
            <Text
              style={{
                color: palette.badgeMeText,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1.44,
              }}
            >
              {t('mobile.landing.kicker')}
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
            {t('mobile.landing.titleLead')}{' '}
            <Text style={{ color: palette.primary }}>{t('mobile.landing.titleAccent')}</Text>
          </Text>

          <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 25 }}>
            {t('mobile.landing.tagline')}
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

        <View style={{ gap: 8 }}>
          <Text
            style={{ color: palette.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}
          >
            {t('mobile.landing.featuresKicker')}
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
            {t('mobile.landing.featuresTitle')}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, marginBottom: 4 }}>
            {t('mobile.landing.featuresSubtitle')}
          </Text>

          <View style={{ gap: 12, marginTop: 8 }}>
            {FEATURES.map((f) => (
              <View
                key={f.titleKey}
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
                  <Ionicons name={f.icon} size={20} color={palette.badgeMeText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                    {t(`mobile.landing.${f.titleKey}`)}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>
                    {t(`mobile.landing.${f.textKey}`)}
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
