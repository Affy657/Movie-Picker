import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import {
  deleteEvent,
  getConfig,
  patchConfig,
  type EventConfigResponse,
  type PatchEventConfigRequest,
} from '@/api/events';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { useRouter } from 'expo-router';

type Props = {
  eventIdOrSlug: string;
  onClose: () => void;
};

type WheelMode = 'strictRandom' | 'weightedByVotes';
const WHEEL_MODE_VALUES: WheelMode[] = ['strictRandom', 'weightedByVotes'];

const MAX_PARTICIPANTS = 50;
const MAX_PROPOSALS = 20;

function parsePositiveInt(raw: string, max: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return Math.min(n, max);
}

export function EventConfigSheet({ eventIdOrSlug, onClose }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const wheelModeLabel = (value: WheelMode): string =>
    value === 'strictRandom'
      ? t('mobile.config.wheelModeStrict')
      : t('mobile.config.wheelModeWeighted');

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
      setError(err instanceof ApiError ? err.message : t('mobile.config.saveError'));
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
      setError(err instanceof ApiError ? err.message : t('mobile.config.deleteError'));
    },
  });

  const onSave = () => {
    setError(null);
    if (!data) {
      patchMutation.mutate(form);
      return;
    }
    const diff: PatchEventConfigRequest = {};
    if ((form.theme ?? '') !== (data.theme ?? '')) diff.theme = form.theme;
    if ((form.endDate ?? '') !== (data.endDate ?? '')) diff.endDate = form.endDate;
    if ((form.maxProposalsPerParticipant ?? null) !== (data.maxProposalsPerParticipant ?? null))
      diff.maxProposalsPerParticipant = form.maxProposalsPerParticipant;
    if ((form.maxParticipants ?? null) !== (data.maxParticipants ?? null))
      diff.maxParticipants = form.maxParticipants;
    if (form.wheelMode !== data.wheelMode) diff.wheelMode = form.wheelMode;
    if (!!form.richSharePreview !== !!data.richSharePreview)
      diff.richSharePreview = form.richSharePreview;
    if (Object.keys(diff).length === 0) {
      onClose();
      return;
    }
    patchMutation.mutate(diff);
  };

  const onDelete = () => {
    Alert.alert(
      t('mobile.config.deleteEventConfirmTitle'),
      t('mobile.config.deleteEventConfirmMessage'),
      [
        { text: t('mobile.cancel'), style: 'cancel' },
        {
          text: t('mobile.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <BottomSheet visible onClose={onClose} title={t('mobile.config.title')}>
        <Text style={{ color: palette.textMuted }}>{t('mobile.config.loading')}</Text>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible onClose={onClose} title={t('mobile.config.title')}>
      <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 14 }}>
        <TextField
          label={t('mobile.config.themeLabel')}
          value={form.theme ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, theme: v }))}
          placeholder={t('mobile.config.themePlaceholder')}
        />

        <TextField
          label={t('mobile.config.endDateLabel')}
          value={form.endDate ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
          autoCapitalize="none"
        />

        <TextField
          label={t('mobile.config.maxProposalsLabel')}
          value={
            form.maxProposalsPerParticipant != null ? String(form.maxProposalsPerParticipant) : ''
          }
          keyboardType="numeric"
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              maxProposalsPerParticipant: parsePositiveInt(v, MAX_PROPOSALS),
            }))
          }
        />

        <TextField
          label={t('mobile.config.maxParticipantsLabel')}
          value={form.maxParticipants != null ? String(form.maxParticipants) : ''}
          keyboardType="numeric"
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              maxParticipants: parsePositiveInt(v, MAX_PARTICIPANTS),
            }))
          }
        />

        <View style={{ gap: 6 }}>
          <Text style={{ color: palette.text, fontWeight: '500' }}>
            {t('mobile.config.wheelModeLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {WHEEL_MODE_VALUES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setForm((f) => ({ ...f, wheelMode: value }))}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: form.wheelMode === value ? palette.primary : palette.border,
                  backgroundColor: form.wheelMode === value ? palette.badgeMeBg : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: form.wheelMode === value ? palette.badgeMeText : palette.text,
                    fontWeight: '500',
                    fontSize: 13,
                  }}
                >
                  {wheelModeLabel(value)}
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
          <Text style={{ color: palette.text, flex: 1 }}>{t('mobile.config.richShareLabel')}</Text>
        </View>

        {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

        <Button
          label={patchMutation.isPending ? t('mobile.saving') : t('mobile.save')}
          loading={patchMutation.isPending}
          onPress={onSave}
        />
        <Button
          label={
            deleteMutation.isPending ? t('mobile.config.deleting') : t('mobile.config.deleteEvent')
          }
          variant="danger"
          onPress={onDelete}
          loading={deleteMutation.isPending}
        />
        <Text style={{ color: palette.meta, fontSize: 12, marginTop: 8 }}>
          {t('mobile.config.kickHelp')}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}
