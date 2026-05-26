import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { joinEvent } from '@/api/events';
import { ApiError } from '@/api/client';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { setGuestParticipant, type GuestParticipant } from '@/lib/guest-storage';

type Props = {
  slug: string;
  onClose: () => void;
  onJoined: (participant: GuestParticipant) => void;
};

export function JoinSheet({ slug, onClose, onJoined }: Props) {
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [pseudo, setPseudo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = pseudo.trim();
    if (trimmed.length < 1) {
      setError(t('mobile.join.pseudoRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await joinEvent(slug, { pseudo: trimmed });
      const participantId = result.participant?._id ?? '';
      const finalPseudo = result.participant?.pseudo ?? trimmed;
      if (!participantId) {
        setError(t('mobile.join.invalidResponse'));
        return;
      }
      const guest: GuestParticipant = { participantId, pseudo: finalPseudo };
      await setGuestParticipant(slug, guest);
      await queryClient.invalidateQueries({ queryKey: ['event', slug] });
      await queryClient.invalidateQueries({ queryKey: ['movies', slug] });
      onJoined(guest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('mobile.join.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible onClose={onClose} title={t('mobile.join.title')}>
      <Text style={{ color: palette.textMuted }}>{t('mobile.join.description')}</Text>
      <TextField
        label={t('mobile.join.pseudoLabel')}
        autoCapitalize="words"
        value={pseudo}
        onChangeText={setPseudo}
        placeholder={t('mobile.join.pseudoPlaceholder')}
      />
      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
      <View style={{ gap: 8 }}>
        <Button
          label={submitting ? t('mobile.join.submitting') : t('mobile.join.submit')}
          loading={submitting}
          onPress={onSubmit}
        />
        <Button label={t('mobile.cancel')} variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
