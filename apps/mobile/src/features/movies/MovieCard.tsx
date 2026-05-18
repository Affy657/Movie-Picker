import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Alert, Pressable, Text, View } from 'react-native';
import type { MovieWithScore } from '@/api/movies';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { formatRuntimeMinutes, formatTmdbVote } from '@/lib/format';
import { posterUrl, logoUrl } from '@/lib/tmdb';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  movie: MovieWithScore;
  onPress?: () => void;
  onVoteUp?: () => void;
  onVoteDown?: () => void;
  onToggleSeen?: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  disabled?: boolean;
};

export function MovieCard({
  movie,
  onPress,
  onVoteUp,
  onVoteDown,
  onToggleSeen,
  onRemove,
  canRemove = false,
  disabled = false,
}: Props) {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const poster = posterUrl(movie.posterPath);
  const myVote = movie.myVote ?? 0;
  const iSeen = (movie.seenCount ?? 0) > 0;
  const providers = (movie.watchProviders ?? []).slice(0, 3);
  const runtimeLabel = formatRuntimeMinutes(movie.runtimeMinutes ?? null);
  const voteLabel = formatTmdbVote(movie.voteAverage ?? null);
  const seenLabel = iSeen
    ? t('movies.seen.labelWithCount', { count: movie.seenCount ?? 0 })
    : t('movies.seen.label');

  const requestRemove =
    canRemove && onRemove
      ? () =>
          Alert.alert(
            t('mobile.confirmRemoveMovieTitle'),
            movie.title
              ? t('mobile.confirmRemoveMovieMessage', { title: movie.title })
              : t('mobile.confirmRemoveMovieMessageFallback'),
            [
              { text: t('mobile.cancel'), style: 'cancel' },
              { text: t('mobile.confirmRemove'), style: 'destructive', onPress: onRemove },
            ]
          )
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={requestRemove}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 12,
        padding: 18,
        flexDirection: 'row',
        gap: 16,
        opacity: pressed ? 0.92 : 1,
        transform: [{ translateY: pressed ? -1 : 0 }],
        shadowColor: '#0f172a',
        shadowOpacity: pressed ? 0.12 : 0.06,
        shadowRadius: pressed ? 10 : 4,
        shadowOffset: { width: 0, height: pressed ? 4 : 2 },
        elevation: pressed ? 3 : 1,
      })}
    >
      <View
        style={{
          width: 92,
          height: 138,
          borderRadius: 6,
          backgroundColor: palette.posterPlaceholder,
          overflow: 'hidden',
        }}
      >
        {poster ? (
          <Image
            source={{ uri: poster }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: palette.placeholder, fontSize: 11 }}>Affiche</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Text
          style={{
            color: palette.text,
            fontSize: 16,
            fontWeight: '600',
            letterSpacing: -0.2,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {movie.title ?? '—'}
        </Text>

        <Text style={{ color: palette.meta, fontSize: 13, lineHeight: 17 }} numberOfLines={1}>
          {[movie.year ? movie.year : null, runtimeLabel, voteLabel].filter(Boolean).join(' · ')}
        </Text>

        {providers.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {providers.map((wp, idx) => {
              const url = logoUrl(wp.logoPath, 'w45');
              const key = wp.providerId ?? wp.name ?? `provider-${idx}`;
              return url ? (
                <Image
                  key={key}
                  source={{ uri: url }}
                  style={{ width: 24, height: 24, borderRadius: 5 }}
                  contentFit="cover"
                  accessibilityLabel={wp.name ?? undefined}
                />
              ) : null;
            })}
          </View>
        ) : null}

        {movie.proposerPseudo ? (
          <Text style={{ color: palette.meta, fontSize: 12, marginTop: 4 }}>
            Proposé par{' '}
            <Text style={{ color: palette.text, fontWeight: '500' }}>{movie.proposerPseudo}</Text>
          </Text>
        ) : null}

        {onVoteUp || onVoteDown || onToggleSeen ? (
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'flex-start',
              marginTop: 8,
              borderWidth: 1,
              borderColor: palette.borderSubtle,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: palette.surface,
            }}
          >
            {onVoteUp ? (
              <ActionBtn
                icon={
                  <Ionicons
                    name="thumbs-up"
                    size={14}
                    color={myVote === 1 ? palette.primary : palette.text}
                  />
                }
                count={movie.up ?? 0}
                active={myVote === 1}
                onPress={onVoteUp}
                disabled={disabled}
                hasDivider={!!(onVoteDown || onToggleSeen)}
              />
            ) : null}
            {onVoteDown ? (
              <ActionBtn
                icon={
                  <Ionicons
                    name="thumbs-down"
                    size={14}
                    color={myVote === -1 ? palette.error : palette.text}
                  />
                }
                count={movie.down ?? 0}
                active={myVote === -1}
                onPress={onVoteDown}
                disabled={disabled}
                hasDivider={!!onToggleSeen}
              />
            ) : null}
            {onToggleSeen ? (
              <ActionBtn
                icon={
                  <Ionicons name="eye" size={14} color={iSeen ? palette.success : palette.text} />
                }
                label={seenLabel}
                active={iSeen}
                onPress={onToggleSeen}
                disabled={disabled}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function ActionBtn({
  icon,
  count,
  label,
  active,
  onPress,
  disabled,
  hasDivider = false,
}: {
  icon: React.ReactNode;
  count?: number;
  label?: string;
  active: boolean;
  onPress?: () => void;
  disabled?: boolean;
  hasDivider?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRightWidth: hasDivider ? 1 : 0,
        borderRightColor: palette.borderSubtle,
        backgroundColor: active
          ? 'rgba(37,99,235,0.12)'
          : pressed
            ? 'rgba(37,99,235,0.06)'
            : 'transparent',
        opacity: disabled ? 0.55 : 1,
      })}
    >
      {icon}
      {typeof count === 'number' ? (
        <Text
          style={{
            color: active ? palette.primary : palette.text,
            fontSize: 13,
            fontWeight: '600',
            minWidth: 12,
            textAlign: 'center',
          }}
        >
          {count}
        </Text>
      ) : null}
      {label ? (
        <Text
          style={{
            color: active ? palette.primary : palette.text,
            fontSize: 12,
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
