import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import {
  deleteEvent,
  getConfig,
  patchConfig,
  removeParticipant,
  type EventConfigResponse,
  type PatchEventConfigRequest,
} from '@/api/events';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/features/theme/ThemeContext';
import { useRouter } from 'expo-router';

type Props = {
  eventIdOrSlug: string;
  onClose: () => void;
};

const WHEEL_MODES: { value: 'strictRandom' | 'weightedByVotes'; label: string }[] = [
  { value: 'strictRandom', label: 'Aléatoire strict' },
  { value: 'weightedByVotes', label: 'Pondéré par les votes' },
];

export function EventConfigSheet({ eventIdOrSlug, onClose }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { palette } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['event-config', eventIdOrSlug],
    queryFn: () => getConfig(eventIdOrSlug),
  });

  const [form, setForm] = useState<PatchEventConfigRequest>({});

  useEffect(() => {
    if (data) {
      setForm({
        theme: data.theme ?? '',
        endDate: data.endDate ?? '',
        maxProposalsPerParticipant: data.maxProposalsPerParticipant ?? null,
        maxParticipants: data.maxParticipants ?? null,
        wheelMode: data.wheelMode ?? 'strictRandom',
        richSharePreview: data.richSharePreview ?? false,
      });
    }
  }, [data]);

  const patchMutation = useMutation({
    mutationFn: (body: PatchEventConfigRequest) => patchConfig(eventIdOrSlug, body),
    onSuccess: (next: EventConfigResponse) => {
      queryClient.setQueryData(['event-config', eventIdOrSlug], next);
      queryClient.invalidateQueries({ queryKey: ['event', eventIdOrSlug] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Sauvegarde impossible.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(eventIdOrSlug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      onClose();
      router.replace('/(authed)/my-events');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Suppression impossible.');
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) => removeParticipant(eventIdOrSlug, participantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventIdOrSlug] }),
  });

  const onSave = () => {
    setError(null);
    patchMutation.mutate(form);
  };

  const onDelete = () => {
    Alert.alert(
      'Supprimer la soirée ?',
      'Cette action est irréversible. Tous les films et votes seront perdus.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <BottomSheet visible onClose={onClose} title="Configuration">
        <Text style={{ color: palette.textMuted }}>Chargement…</Text>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible onClose={onClose} title="Configuration de la soirée">
      <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 14 }}>
        <TextField
          label="Thème (emoji + texte court)"
          value={form.theme ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, theme: v }))}
          placeholder="🍕 Pizza & comédie"
        />

        <TextField
          label="Date de fin (AAAA-MM-JJ HH:MM)"
          value={form.endDate ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
          autoCapitalize="none"
        />

        <TextField
          label="Max propositions par participant"
          value={form.maxProposalsPerParticipant != null ? String(form.maxProposalsPerParticipant) : ''}
          keyboardType="numeric"
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              maxProposalsPerParticipant: v.trim() === '' ? null : Number(v),
            }))
          }
        />

        <TextField
          label="Max participants"
          value={form.maxParticipants != null ? String(form.maxParticipants) : ''}
          keyboardType="numeric"
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              maxParticipants: v.trim() === '' ? null : Number(v),
            }))
          }
        />

        <View style={{ gap: 6 }}>
          <Text style={{ color: palette.text, fontWeight: '500' }}>Mode de roue</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {WHEEL_MODES.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => setForm((f) => ({ ...f, wheelMode: m.value }))}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: form.wheelMode === m.value ? palette.primary : palette.border,
                  backgroundColor: form.wheelMode === m.value ? palette.badgeMeBg : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: form.wheelMode === m.value ? palette.badgeMeText : palette.text,
                    fontWeight: '500',
                    fontSize: 13,
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            value={!!form.richSharePreview}
            onValueChange={(v) => setForm((f) => ({ ...f, richSharePreview: v }))}
          />
          <Text style={{ color: palette.text, flex: 1 }}>Aperçu enrichi pour le partage web</Text>
        </View>

        {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

        <Button
          label={patchMutation.isPending ? 'Sauvegarde…' : 'Enregistrer'}
          loading={patchMutation.isPending}
          onPress={onSave}
        />
        <Button
          label={deleteMutation.isPending ? 'Suppression…' : 'Supprimer la soirée'}
          variant="danger"
          onPress={onDelete}
          loading={deleteMutation.isPending}
        />
        <Text style={{ color: palette.meta, fontSize: 12, marginTop: 8 }}>
          Pour retirer un participant, fais un appui long sur son nom dans la liste — flow à câbler
          dans la phase polish.
        </Text>
        {/* hint pour TypeScript : `removeParticipantMutation` réservé pour câblage UI futur */}
        {removeParticipantMutation.isPending ? <Text>retrait…</Text> : null}
      </ScrollView>
    </BottomSheet>
  );
}
