import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Dropdown } from '@/components/Dropdown';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocale, useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { ACCENT_COLORS, type AccentColor, type UiThemePreference } from '@/theme/colors';
import type { LocaleCode } from '@/i18n/locales';

const ACCENT_SWATCHES: Record<AccentColor, string> = {
  default: '#2563eb',
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#7c3aed',
  pink: '#db2777',
  orange: '#ea580c',
};

const THEMES: { value: UiThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

const LOCALES: { value: LocaleCode; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { user, logout, patchProfile, changePassword: changePasswordCtx, refresh } = useAuth();
  const {
    palette,
    preference,
    setUiPreference,
    accent,
    setAccent,
    applyRemotePreference,
    applyRemoteAccent,
  } = useTheme();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const saveName = async () => {
    if (displayName.trim() === user?.displayName) return;
    setSavingName(true);
    setError(null);
    try {
      await patchProfile({ displayName: displayName.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sauvegarde impossible.');
    } finally {
      setSavingName(false);
    }
  };

  const applyTheme = async (next: UiThemePreference) => {
    setUiPreference(next);
    try {
      const profile = await patchProfile({ uiTheme: next });
      if (profile.uiTheme && profile.uiTheme !== next) {
        applyRemotePreference(profile.uiTheme as UiThemePreference);
      }
    } catch {
      /* le set local reste appliqué, on retentera plus tard */
    }
  };

  const applyAccent = async (next: AccentColor) => {
    setAccent(next);
    try {
      const profile = await patchProfile({ accentColor: next });
      if (profile.accentColor && profile.accentColor !== next) {
        applyRemoteAccent(profile.accentColor as AccentColor);
      }
    } catch {
      /* idem */
    }
  };

  const submitPassword = async () => {
    setPwError(null);
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwError(t('auth.register.passwordRulesError'));
      return;
    }
    setPwSubmitting(true);
    try {
      await changePasswordCtx({ currentPassword, newPassword });
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Mise à jour impossible.');
      setPwSubmitting(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(t('mobile.settings.logoutConfirm'), undefined, [
      { text: t('mobile.cancel'), style: 'cancel' },
      { text: t('mobile.settings.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: palette.text,
              fontSize: 24,
              fontWeight: '800',
              letterSpacing: -0.6,
              lineHeight: 28.8,
            }}
          >
            {t('mobile.settings.title')}
          </Text>
          {user?.emailMasked ? (
            <Text style={{ color: palette.textMuted, fontSize: 14 }}>{user.emailMasked}</Text>
          ) : null}
        </View>

        <Section title={t('mobile.settings.sectionProfile')} icon="person-outline" palette={palette}>
          <TextField
            label={t('mobile.settings.pseudoLabel')}
            value={displayName}
            onChangeText={setDisplayName}
          />
          {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
          <Button
            label={savingName ? t('mobile.saving') : t('mobile.settings.pseudoSave')}
            onPress={saveName}
            loading={savingName}
            disabled={displayName.trim().length < 1 || displayName.trim() === user?.displayName}
          />
        </Section>

        <Section
          title={t('mobile.settings.sectionAppearance')}
          icon="color-palette-outline"
          palette={palette}
        >
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            {t('mobile.settings.themeLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {THEMES.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => applyTheme(m.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: preference === m.value ? palette.primary : palette.border,
                  backgroundColor: preference === m.value ? palette.badgeMeBg : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: preference === m.value ? palette.badgeMeText : palette.text,
                    fontWeight: '500',
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 8 }}>
            {t('mobile.settings.accentLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {ACCENT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => applyAccent(c)}
                accessibilityLabel={`accent ${c}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: ACCENT_SWATCHES[c],
                  borderWidth: 3,
                  borderColor: accent === c ? palette.text : 'transparent',
                }}
              />
            ))}
          </View>
        </Section>

        <Section
          title={t('mobile.settings.sectionLanguage')}
          icon="language-outline"
          palette={palette}
        >
          <Dropdown
            value={locale}
            options={LOCALES}
            onChange={setLocale}
            accessibilityLabel="Choisir la langue"
          />
        </Section>

        <Section
          title={t('mobile.settings.sectionSecurity')}
          icon="key-outline"
          palette={palette}
        >
          <TextField
            label={t('mobile.settings.currentPasswordLabel')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <TextField
            label={t('mobile.settings.newPasswordLabel')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Text style={{ color: palette.meta, fontSize: 12 }}>
            {t('auth.register.passwordRulesHint')}
          </Text>
          {pwError ? <Text style={{ color: palette.error }}>{pwError}</Text> : null}
          <Button
            label={
              pwSubmitting
                ? t('mobile.settings.changePasswordSubmitting')
                : t('mobile.settings.changePasswordSubmit')
            }
            variant="secondary"
            onPress={submitPassword}
            loading={pwSubmitting}
            disabled={currentPassword === '' || newPassword === ''}
          />
        </Section>

        <Section
          title={t('mobile.settings.sectionAccount')}
          icon="log-out-outline"
          palette={palette}
        >
          <Button
            label={t('mobile.settings.logout')}
            variant="secondary"
            onPress={confirmLogout}
          />
          <Text style={{ color: palette.meta, fontSize: 12 }}>
            {t('mobile.settings.deleteAccountHint')}
          </Text>
        </Section>

        <Pressable onPress={() => refresh()}>
          <Text style={{ color: palette.meta, fontSize: 12, textAlign: 'center' }}>
            {t('mobile.settings.refresh')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  palette,
  children,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  palette: ReturnType<typeof useTheme>['palette'];
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        gap: 12,
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {icon ? <Ionicons name={icon} size={18} color={palette.primary} /> : null}
        <Text
          style={{
            color: palette.sectionHeading,
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
