import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { createEvent } from '@/api/events';
import { ApiError } from '@/api/client';
import { useTheme } from '@/features/theme/ThemeContext';

const schema = z.object({
  title: z.string().min(2).max(80),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date' }),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: 'time' }),
});

type FormValues = z.infer<typeof schema>;

export default function NewEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', date: '', time: '20:00' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const event = await createEvent(values);
      await queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      if (event.slug) {
        router.replace({ pathname: '/e/[slug]', params: { slug: event.slug } });
      } else {
        router.replace('/(authed)/my-events');
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.message ?? 'Impossible de créer la soirée.') : 'Impossible de créer la soirée.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>Nouvelle soirée</Text>
        <Text style={{ color: palette.textMuted }}>
          Indique un titre, une date et une heure de début. Tu pourras modifier les options ensuite.
        </Text>
      </View>

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Titre"
            placeholder="Soirée pizza Marvel…"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.title ? 'Titre requis (2 à 80 caractères).' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Date (AAAA-MM-JJ)"
            placeholder="2026-06-15"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.date ? 'Format attendu : AAAA-MM-JJ' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="time"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Heure (HH:MM)"
            placeholder="20:00"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.time ? 'Format attendu : HH:MM' : undefined}
          />
        )}
      />

      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

      <Button label={submitting ? 'Création…' : 'Créer la soirée'} loading={submitting} onPress={handleSubmit(onSubmit)} />
      <Button label={'Annuler'} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
