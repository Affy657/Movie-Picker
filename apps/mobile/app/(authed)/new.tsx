import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { createEvent, patchConfig } from '@/api/events';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/features/theme/ThemeContext';

const schema = z.object({
  title: z.string().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date' }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'time' }),
  themeEmoji: z.string().optional(),
  themeText: z.string().optional(),
  maxParticipants: z.string().optional(),
  maxProposals: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NewEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: todayLocalISO(),
      time: '20:00',
      themeEmoji: '',
      themeText: '',
      maxParticipants: '',
      maxProposals: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createEvent({
        title: values.title,
        date: values.date,
        time: values.time,
      });

      const themeTrimmed = [values.themeEmoji ?? '', (values.themeText ?? '').trim()]
        .filter(Boolean)
        .join(' ');
      const maxPart =
        values.maxParticipants && values.maxParticipants.trim() !== ''
          ? Number(values.maxParticipants)
          : 0;
      const maxProp =
        values.maxProposals && values.maxProposals.trim() !== '' ? Number(values.maxProposals) : 0;

      const needsConfigPatch = themeTrimmed !== '' || maxPart > 0 || maxProp > 0;

      if (needsConfigPatch && created.slug) {
        try {
          await patchConfig(created.slug, {
            theme: themeTrimmed || undefined,
            maxProposalsPerParticipant: maxProp || undefined,
            maxParticipants: maxPart || undefined,
            wheelMode: 'strictRandom',
            richSharePreview: true,
          });
        } catch {
          // Soirée créée mais config refusée : on continue, l'hôte peut réessayer dans la page détail.
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      if (created.slug) {
        router.replace({ pathname: '/e/[slug]', params: { slug: created.slug } });
      } else {
        router.replace('/(authed)/my-events');
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.message ?? 'Création impossible.') : 'Création impossible.'
      );
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
        <AuthCard
          title="Créer une soirée"
          description="Donne-lui un titre, une date et une heure. Tu pourras ajuster les paramètres plus tard si besoin."
        >
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
              <Text style={{ color: palette.error, fontSize: 14, fontWeight: '500' }}>{error}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Titre"
                placeholder="Ex : Soirée film du vendredi"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.title ? 'Titre requis (2 à 200 caractères).' : undefined}
              />
            )}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Date"
                    placeholder="2026-06-15"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.date ? 'AAAA-MM-JJ' : undefined}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="time"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Heure"
                    placeholder="20:00"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.time ? 'HH:MM' : undefined}
                  />
                )}
              />
            </View>
          </View>

          <Pressable
            onPress={() => setAdvancedOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: advancedOpen }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: palette.borderSubtle,
              marginTop: 4,
            }}
          >
            <Ionicons name="options-outline" size={18} color={palette.textMuted} />
            <Text style={{ color: palette.textMuted, fontSize: 14, fontWeight: '600', flex: 1 }}>
              Options avancées (optionnel)
            </Text>
            <Ionicons
              name={advancedOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={palette.textMuted}
            />
          </Pressable>

          {advancedOpen ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="themeEmoji"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Emoji"
                        placeholder="🎬"
                        autoCapitalize="none"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Controller
                    control={control}
                    name="themeText"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Thème / ambiance"
                        placeholder="Comédies cultes"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                      />
                    )}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="maxParticipants"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Participants max"
                        placeholder="Illimité"
                        keyboardType="numeric"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="maxProposals"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Films par personne"
                        placeholder="Illimité"
                        keyboardType="numeric"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <Button
            label={submitting ? 'Création…' : 'Créer la soirée'}
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
            style={{ marginTop: 8 }}
          />
          <Button label="Annuler" variant="secondary" onPress={() => router.back()} />
        </AuthCard>
      </ScrollView>
    </SafeAreaView>
  );
}
