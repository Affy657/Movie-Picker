import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthContext';
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await login(values);
      router.replace('/my-events');
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.message ?? t('auth.login.fallbackError')) : t('auth.login.fallbackError');
      setSubmitError(message);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('auth.login.title')}
        </Text>
        <Text style={{ color: palette.textMuted }}>{t('auth.login.description')}</Text>
      </View>

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
            error={errors.email ? t('auth.login.emailLabel') + ' invalide' : undefined}
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
            error={errors.password ? t('auth.login.passwordLabel') + ' requis' : undefined}
          />
        )}
      />

      {submitError ? (
        <Text style={{ color: palette.error, fontSize: 14 }}>{submitError}</Text>
      ) : null}

      <Button
        label={isAuthenticating ? t('auth.login.submitting') : t('auth.login.submit')}
        loading={isAuthenticating}
        onPress={handleSubmit(onSubmit)}
      />

      <View style={{ gap: 8, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: palette.textMuted }}>{t('auth.login.registerPrompt')}</Text>
          <Text
            onPress={() => router.push('/register')}
            style={{ color: palette.primary, fontWeight: '600' }}
          >
            {t('auth.login.registerLink')}
          </Text>
        </View>
        <Text
          onPress={() => router.push('/forgot-password')}
          style={{ color: palette.primary, fontWeight: '500' }}
        >
          {t('auth.login.forgotPasswordLink')}
        </Text>
      </View>
    </Screen>
  );
}
