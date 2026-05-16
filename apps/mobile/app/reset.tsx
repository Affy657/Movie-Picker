import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { confirmPasswordReset } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

const schema = z
  .object({
    password: z
      .string()
      .min(8)
      .regex(/[A-Za-z]/)
      .regex(/\d/),
    confirm: z.string().min(1),
    manualToken: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'mismatch',
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { t } = useTranslation();
  const { palette } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '', manualToken: '' },
  });

  const onSubmit = async ({ password, manualToken }: FormValues) => {
    const token = (params.token ?? manualToken ?? '').trim();
    if (!token) {
      setError(t('auth.resetPassword.missingTokenError'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.message ?? t('auth.resetPassword.fallbackError')) : t('auth.resetPassword.fallbackError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <View style={{ gap: 12 }}>
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
            {t('auth.resetPassword.successTitle')}
          </Text>
          <Text style={{ color: palette.textMuted }}>{t('auth.resetPassword.successMessage')}</Text>
        </View>
        <Button label={t('auth.resetPassword.goToLogin')} onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  const showManualTokenField = !params.token;
  const passwordsDiffer =
    errors.confirm?.message === 'mismatch' || (watch('confirm') !== '' && watch('confirm') !== watch('password'));

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('auth.resetPassword.title')}
        </Text>
        <Text style={{ color: palette.textMuted }}>{t('auth.resetPassword.description')}</Text>
      </View>

      {showManualTokenField ? (
        <Controller
          control={control}
          name="manualToken"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Token de réinitialisation"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value ?? ''}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.resetPassword.newPasswordLabel')}
            secureTextEntry
            autoComplete="new-password"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.password ? t('auth.resetPassword.newPasswordHint') : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="confirm"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.resetPassword.confirmPasswordLabel')}
            secureTextEntry
            autoComplete="new-password"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={passwordsDiffer ? t('auth.resetPassword.passwordsMustMatch') : undefined}
          />
        )}
      />

      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

      <Button
        label={submitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
        loading={submitting}
        onPress={handleSubmit(onSubmit)}
      />
    </Screen>
  );
}
