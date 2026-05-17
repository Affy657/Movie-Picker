import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';
import type { MyEventSummary } from '@/api/events';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { parseLocalDate } from '@/lib/dates';

type Props = {
  event: MyEventSummary;
  onPress?: () => void;
  /** Affiche le pill de lifecycle (caché sur l'onglet "Historique" pour aligner le web). */
  showLifecycleBadge?: boolean;
};

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = parseLocalDate(iso);
  if (!d) return iso ?? '';
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const LIFECYCLE_LABEL: Record<string, string> = {
  upcoming: 'À venir',
  live: '● En cours',
  finished: 'Terminée',
};

/**
 * Aligné `MyEventsPage.module.css` web :
 * - card surface + border-subtle + shadow-sm + padding 1.1/1.25rem (~18/20px)
 * - row top : titre flex:1 + crown badge top-right (host)
 * - theme line (muted, 13px, single line ellipsis)
 * - stats line "1 participant · 3 films proposés"
 * - footer : date · heure (gauche, flex:1) + pill lifecycle (droite)
 */
export function EventCard({ event, onPress, showLifecycleBadge = true }: Props) {
  const { palette } = useTheme();
  const { locale } = useTranslation();
  const lifecycle = (event.lifecycle ?? 'upcoming') as keyof typeof LIFECYCLE_LABEL;
  const isHost = event.isCreator ?? false;
  const participantCount = event.participantCount ?? 0;
  const movieCount = event.movieCount ?? 0;

  const joinedLabel =
    typeof event.maxParticipants === 'number' && event.maxParticipants > 0
      ? `${participantCount} / ${event.maxParticipants} participants`
      : participantCount === 1
        ? '1 participant'
        : `${participantCount} participants`;
  const moviesLabel = movieCount === 1 ? '1 film proposé' : `${movieCount} films proposés`;

  const dateStr = formatDate(event.date, locale);
  const timeStr = event.time ?? '';

  const badgeBg =
    lifecycle === 'live'
      ? palette.badgeLiveBg
      : lifecycle === 'finished'
        ? palette.badgeFinishedBg
        : palette.badgeUpcomingBg;
  const badgeText =
    lifecycle === 'live'
      ? palette.badgeLiveText
      : lifecycle === 'finished'
        ? palette.badgeFinishedText
        : palette.badgeUpcomingText;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        gap: 8,
        opacity: pressed ? 0.92 : 1,
        transform: [{ translateY: pressed ? -1 : 0 }],
        shadowColor: '#0f172a',
        shadowOpacity: pressed ? 0.12 : 0.06,
        shadowRadius: pressed ? 10 : 4,
        shadowOffset: { width: 0, height: pressed ? 4 : 2 },
        elevation: pressed ? 3 : 1,
      })}
    >
      {/* row top : title + crown badge host */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text
          style={{
            color: palette.text,
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 24,
            flex: 1,
            letterSpacing: -0.2,
          }}
          numberOfLines={2}
        >
          {event.title ?? 'Sans titre'}
        </Text>
        {isHost ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: palette.badgeHostBg,
              borderColor: palette.badgeHostText,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Ionicons name="ribbon" size={12} color={palette.badgeHostText} />
            <Text
              style={{
                color: palette.badgeHostText,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1,
              }}
            >
              HÔTE
            </Text>
          </View>
        ) : null}
      </View>

      {/* theme */}
      {event.theme ? (
        <Text
          style={{
            color: palette.textMuted,
            fontSize: 13,
            fontWeight: '500',
          }}
          numberOfLines={1}
        >
          {event.theme}
        </Text>
      ) : null}

      {/* stats */}
      <Text
        style={{
          color: palette.textMuted,
          fontSize: 14,
          fontWeight: '500',
        }}
        numberOfLines={1}
      >
        {joinedLabel} · {moviesLabel}
      </Text>

      {/* footer date + lifecycle pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 2,
        }}
      >
        <Text style={{ color: palette.textMuted, fontSize: 14, fontWeight: '500', flex: 1 }}>
          {dateStr}
          {timeStr ? ` · ${timeStr}` : ''}
        </Text>
        {showLifecycleBadge && lifecycle !== 'upcoming' ? (
          <View
            style={{
              backgroundColor: badgeBg,
              borderColor: badgeText,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: badgeText, fontSize: 12, fontWeight: '600' }}>
              {LIFECYCLE_LABEL[lifecycle] ?? ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
