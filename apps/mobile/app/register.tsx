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
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard title={t('auth.register.title')} description={t('auth.register.description')}>
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
                label={t('auth.register.emailLabel')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.email ? `${t('auth.register.emailLabel')} invalide` : undefined}
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
                error={errors.displayName ? `${t('auth.register.pseudoLabel')} requis` : undefined}
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
                hint={t('auth.register.passwordRulesHint')}
                error={errors.password ? t('auth.register.passwordRulesError') : undefined}
              />
            )}
          />

          <Button
            label={isAuthenticating ? t('auth.register.submitting') : t('auth.register.submit')}
            loading={isAuthenticating}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={{ color: palette.textMuted, fontSize: 14 }}>
              {t('auth.register.loginPrompt')}
            </Text>
            <Text
              onPress={() => router.push('/login')}
              style={{ color: palette.primary, fontWeight: '600', fontSize: 14 }}
            >
              {t('auth.register.loginLink')}
            </Text>
          </View>
        </AuthCard>
      </ScrollView>
    </SafeAreaView>
  );
}
