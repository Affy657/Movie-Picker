import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import {
  DEV_QUICK_LOGIN_EMAIL,
  DEV_QUICK_LOGIN_PASSWORD,
} from '@/features/auth/devQuickLoginCredentials';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticating } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const performLogin = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await login(values);
      router.replace('/my-events');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? (err.message ?? t('auth.login.fallbackError'))
          : t('auth.login.fallbackError');
      setSubmitError(message);
    }
  };

  const onDevQuick = () => {
    setValue('email', DEV_QUICK_LOGIN_EMAIL);
    setValue('password', DEV_QUICK_LOGIN_PASSWORD);
    void performLogin({ email: DEV_QUICK_LOGIN_EMAIL, password: DEV_QUICK_LOGIN_PASSWORD });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard title={t('auth.login.title')} description={t('auth.login.description')}>
          {submitError ? (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: palette.error,
                backgroundColor: palette.bg,
              }}
              accessibilityRole="alert"
            >
              <Text style={{ color: palette.error, fontSize: 14, fontWeight: '500' }}>
                {submitError}
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={t('auth.login.emailLabel')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.email ? `${t('auth.login.emailLabel')} invalide` : undefined}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={t('auth.login.passwordLabel')}
                secureTextEntry
                autoComplete="password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.password ? `${t('auth.login.passwordLabel')} requis` : undefined}
              />
            )}
          />

          <Button
            label={isAuthenticating ? t('auth.login.submitting') : t('auth.login.submit')}
            loading={isAuthenticating}
            onPress={handleSubmit(performLogin)}
          />

          {__DEV__ ? (
            <View
              style={{
                marginTop: 4,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: palette.borderSubtle,
                gap: 8,
              }}
            >
              <Button
                label={t('auth.login.devQuickButton')}
                variant="ghost"
                onPress={onDevQuick}
                disabled={isAuthenticating}
                accessibilityLabel={t('auth.login.devQuickAriaLabel')}
              />
              <Text style={{ color: palette.meta, fontSize: 12, textAlign: 'center' }}>
                {t('auth.login.devQuickHint')}
              </Text>
            </View>
          ) : null}

          <View style={{ gap: 6, marginTop: 8 }}>
            <Text
              onPress={() => router.push('/forgot-password')}
              style={{ color: palette.primary, fontWeight: '500', fontSize: 14 }}
            >
              {t('auth.login.forgotPasswordLink')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: palette.textMuted, fontSize: 14 }}>
                {t('auth.login.registerPrompt')}
              </Text>
              <Text
                onPress={() => router.push('/register')}
                style={{ color: palette.primary, fontWeight: '600', fontSize: 14 }}
              >
                {t('auth.login.registerLink')}
              </Text>
            </View>
          </View>
        </AuthCard>
      </ScrollView>
    </SafeAreaView>
  );
}
