import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocale, useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { ACCENT_COLORS, type AccentColor, type UiThemePreference } from '@/theme/colors';
import { changePassword } from '@/api/auth';
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
  const { palette, preference, setUiPreference, accent, setAccent, applyRemotePreference, applyRemoteAccent } =
    useTheme();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

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
    setPwSuccess(false);
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwError(t('auth.register.passwordRulesError'));
      return;
    }
    setPwSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // changePassword côté API invalide la session : le contexte va déco
      await changePasswordCtx({ currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Mise à jour impossible.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>Mon compte</Text>

        <Section title="Profil" palette={palette}>
          <TextField label="Pseudo affiché" value={displayName} onChangeText={setDisplayName} />
          <Text style={{ color: palette.meta, fontSize: 12 }}>{user?.emailMasked ?? ''}</Text>
          {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
          <Button
            label={savingName ? 'Sauvegarde…' : 'Enregistrer le pseudo'}
            onPress={saveName}
            loading={savingName}
            disabled={displayName.trim().length < 1 || displayName.trim() === user?.displayName}
          />
        </Section>

        <Section title="Apparence" palette={palette}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>Thème</Text>
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

          <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 8 }}>Couleur d&apos;accent</Text>
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

        <Section title="Langue" palette={palette}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LOCALES.map((l) => (
              <Pressable
                key={l.value}
                onPress={() => setLocale(l.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: locale === l.value ? palette.primary : palette.border,
                  backgroundColor: locale === l.value ? palette.badgeMeBg : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: locale === l.value ? palette.badgeMeText : palette.text,
                    fontWeight: '500',
                  }}
                >
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Sécurité" palette={palette}>
          <TextField
            label="Mot de passe actuel"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <TextField
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Text style={{ color: palette.meta, fontSize: 12 }}>
            {t('auth.register.passwordRulesHint')}
          </Text>
          {pwError ? <Text style={{ color: palette.error }}>{pwError}</Text> : null}
          {pwSuccess ? (
            <Text style={{ color: palette.success }}>Mot de passe mis à jour. Reconnecte-toi.</Text>
          ) : null}
          <Button
            label={pwSubmitting ? 'Mise à jour…' : 'Changer le mot de passe'}
            variant="secondary"
            onPress={submitPassword}
            loading={pwSubmitting}
            disabled={currentPassword === '' || newPassword === ''}
          />
        </Section>

        <Section title="Compte" palette={palette}>
          <Button label="Se déconnecter" variant="secondary" onPress={confirmLogout} />
          <Text style={{ color: palette.meta, fontSize: 12 }}>
            Suppression de compte : à venir (pas d&apos;endpoint dédié côté API actuelle).
          </Text>
        </Section>

        <Pressable onPress={() => refresh()}>
          <Text style={{ color: palette.meta, fontSize: 12, textAlign: 'center' }}>
            Rafraîchir le profil
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: ReturnType<typeof useTheme>['palette'];
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        gap: 10,
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <Text style={{ color: palette.sectionHeading, fontSize: 14, fontWeight: '700' }}>{title}</Text>
      {children}
    </View>
  );
}
