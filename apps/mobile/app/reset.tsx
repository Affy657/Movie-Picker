import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { confirmPasswordReset } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
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
        err instanceof ApiError
          ? (err.message ?? t('auth.resetPassword.fallbackError'))
          : t('auth.resetPassword.fallbackError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <AuthCard
            title={t('auth.resetPassword.successTitle')}
            description={t('auth.resetPassword.successMessage')}
          >
            <Button
              label={t('auth.resetPassword.goToLogin')}
              onPress={() => router.replace('/login')}
            />
          </AuthCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showManualTokenField = !params.token;
  const passwordsDiffer =
    errors.confirm?.message === 'mismatch' ||
    (watch('confirm') !== '' && watch('confirm') !== watch('password'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard
          title={t('auth.resetPassword.title')}
          description={t('auth.resetPassword.description')}
        >
          {showManualTokenField ? (
            <Controller
              control={control}
              name="manualToken"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Token de réinitialisation"
                  hint="Colle ici le token reçu par e-mail."
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
                hint={t('auth.resetPassword.newPasswordHint')}
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

          {error ? (
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
              <Text style={{ color: palette.error, fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={submitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
          />
        </AuthCard>
      </ScrollView>
    </SafeAreaView>
  );
}
