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
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, { message: 'letter' })
    .regex(/\d/, { message: 'digit' }),
  displayName: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isAuthenticating } = useAuth();
  const { t } = useTranslation();
  const { palette } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await register(values);
      router.replace('/my-events');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? (err.message ?? t('auth.register.fallbackError'))
          : t('auth.register.fallbackError');
      setSubmitError(message);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('auth.register.title')}
        </Text>
        <Text style={{ color: palette.textMuted }}>{t('auth.register.description')}</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.register.emailLabel')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.email ? t('auth.register.emailLabel') + ' invalide' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.register.pseudoLabel')}
            autoCapitalize="words"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.displayName ? t('auth.register.pseudoLabel') + ' requis' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.register.passwordLabel')}
            secureTextEntry
            autoComplete="new-password"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.password ? t('auth.register.passwordRulesError') : undefined}
          />
        )}
      />
      <Text style={{ color: palette.meta, fontSize: 13, marginTop: -8 }}>
        {t('auth.register.passwordRulesHint')}
      </Text>

      {submitError ? (
        <Text style={{ color: palette.error, fontSize: 14 }}>{submitError}</Text>
      ) : null}

      <Button
        label={isAuthenticating ? t('auth.register.submitting') : t('auth.register.submit')}
        loading={isAuthenticating}
        onPress={handleSubmit(onSubmit)}
      />

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <Text style={{ color: palette.textMuted }}>{t('auth.register.loginPrompt')}</Text>
        <Text
          onPress={() => router.push('/login')}
          style={{ color: palette.primary, fontWeight: '600' }}
        >
          {t('auth.register.loginLink')}
        </Text>
      </View>
    </Screen>
  );
}
