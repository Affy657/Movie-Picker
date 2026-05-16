import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import type { MyEventSummary } from '@/api/events';
import { useTranslation } from '@/features/i18n/LocaleContext';

type Props = {
  event: MyEventSummary;
  onPress?: () => void;
};

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const LIFECYCLE_TONE: Record<string, 'upcoming' | 'live' | 'finished'> = {
  upcoming: 'upcoming',
  live: 'live',
  finished: 'finished',
};

export function EventCard({ event, onPress }: Props) {
  const { palette } = useTheme();
  const { locale } = useTranslation();
  const tone = LIFECYCLE_TONE[event.lifecycle ?? ''] ?? 'upcoming';

  const badgeBg =
    tone === 'live' ? palette.badgeLiveBg : tone === 'finished' ? palette.badgeFinishedBg : palette.badgeUpcomingBg;
  const badgeText =
    tone === 'live'
      ? palette.badgeLiveText
      : tone === 'finished'
        ? palette.badgeFinishedText
        : palette.badgeUpcomingText;
  const badgeLabel = tone === 'live' ? '● En cours' : tone === 'finished' ? 'Terminée' : 'À venir';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {event.theme ? (
              <Text style={{ fontSize: 18 }} accessibilityLabel="Thème">
                {event.theme}
              </Text>
            ) : null}
            <Text
              style={{ color: palette.text, fontSize: 18, fontWeight: '600', flexShrink: 1 }}
              numberOfLines={1}
            >
              {event.title ?? 'Sans titre'}
            </Text>
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            {formatDate(event.date, locale)}
            {event.time ? ` · ${event.time}` : ''}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badgeBg,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: badgeText, fontSize: 12, fontWeight: '600' }}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Text style={{ color: palette.meta, fontSize: 13 }}>
          🎬 {event.movieCount ?? 0}
        </Text>
        <Text style={{ color: palette.meta, fontSize: 13 }}>
          👤 {event.participantCount ?? 0}
          {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
        </Text>
        {event.isCreator ? (
          <Text style={{ color: palette.badgeHostText, fontSize: 12, fontWeight: '600' }}>HÔTE</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
