import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { requestPasswordReset } from '@/api/auth';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

const schema = z.object({ email: z.string().min(1).email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { palette } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset({ email, locale });
      setSubmitted(true);
    } catch {
      setError(t('auth.forgotPassword.fallbackError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {submitted ? (
          <AuthCard
            title={t('auth.forgotPassword.successTitle')}
            description={t('auth.forgotPassword.successMessage')}
          >
            <Button
              label={t('auth.forgotPassword.backToLogin')}
              variant="secondary"
              onPress={() => router.replace('/login')}
            />
          </AuthCard>
        ) : (
          <AuthCard
            title={t('auth.forgotPassword.title')}
            description={t('auth.forgotPassword.description')}
          >
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label={t('auth.forgotPassword.emailLabel')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={
                    errors.email ? `${t('auth.forgotPassword.emailLabel')} invalide` : undefined
                  }
                />
              )}
            />

            {error ? <Text style={{ color: palette.error, fontSize: 14 }}>{error}</Text> : null}

            <Button
              label={
                submitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')
              }
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
            />

            <Text
              onPress={() => router.replace('/login')}
              style={{ color: palette.primary, fontWeight: '500', marginTop: 4, fontSize: 14 }}
            >
              {t('auth.forgotPassword.backToLogin')}
            </Text>
          </AuthCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
