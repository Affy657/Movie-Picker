import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { requestPasswordReset } from '@/api/auth';
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

  if (submitted) {
    return (
      <Screen>
        <View style={{ gap: 12 }}>
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
            {t('auth.forgotPassword.successTitle')}
          </Text>
          <Text style={{ color: palette.textMuted }}>{t('auth.forgotPassword.successMessage')}</Text>
        </View>
        <Button
          label={t('auth.forgotPassword.backToLogin')}
          variant="secondary"
          onPress={() => router.replace('/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('auth.forgotPassword.title')}
        </Text>
        <Text style={{ color: palette.textMuted }}>{t('auth.forgotPassword.description')}</Text>
      </View>

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
            error={errors.email ? t('auth.forgotPassword.emailLabel') + ' invalide' : undefined}
          />
        )}
      />

      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

      <Button
        label={submitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
        loading={submitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Text
        onPress={() => router.replace('/login')}
        style={{ color: palette.primary, fontWeight: '500', marginTop: 8 }}
      >
        {t('auth.forgotPassword.backToLogin')}
      </Text>
    </Screen>
  );
}
