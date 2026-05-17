import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import type { MovieWithScore } from '@/api/movies';
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

/**
 * Aligné `MovieList.module.css` web :
 * - card grid auto 1fr, gap 16, padding 18 (~0.95rem 1.1rem), shadow-sm
 * - poster 92×138 à gauche, border-radius sm (6)
 * - info : titre 1.05rem 600, metaLine "année · runtime · vote" (12px muted)
 *   séparée par · entre items
 * - watch providers chips compact (3 max)
 * - actions segmented pill (👍 👎 👁) avec border-right, fond primary 10% sur active
 */
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
  const poster = posterUrl(movie.posterPath);
  const myVote = movie.myVote ?? 0;
  const iSeen = (movie.seenCount ?? 0) > 0;
  const providers = (movie.watchProviders ?? []).slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={canRemove ? onRemove : undefined}
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
      {/* Poster col */}
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
          <Image source={{ uri: poster }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: palette.placeholder, fontSize: 11 }}>Affiche</Text>
          </View>
        )}
      </View>

      {/* Info col */}
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        {/* Title */}
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

        {/* metaLine : year · runtime · vote */}
        <Text
          style={{ color: palette.meta, fontSize: 12, lineHeight: 16 }}
          numberOfLines={1}
        >
          {[
            movie.year ? movie.year : null,
            movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : null,
            typeof movie.voteAverage === 'number'
              ? `★ ${movie.voteAverage.toFixed(1)}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {/* Watch providers chips compact */}
        {providers.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {providers.map((wp) => {
              const url = logoUrl(wp.logoPath, 'w45');
              return url ? (
                <Image
                  key={wp.name ?? Math.random()}
                  source={{ uri: url }}
                  style={{ width: 24, height: 24, borderRadius: 5 }}
                  contentFit="cover"
                  accessibilityLabel={wp.name ?? undefined}
                />
              ) : null;
            })}
          </View>
        ) : null}

        {/* Proposer */}
        {movie.proposerPseudo ? (
          <Text style={{ color: palette.meta, fontSize: 12, marginTop: 4 }}>
            Proposé par <Text style={{ color: palette.text, fontWeight: '500' }}>{movie.proposerPseudo}</Text>
          </Text>
        ) : null}

        {/* Actions segmented pill : 👍 👎 👁 */}
        {(onVoteUp || onVoteDown || onToggleSeen) ? (
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
                icon={<Ionicons name="thumbs-up" size={14} color={myVote === 1 ? palette.primary : palette.text} />}
                count={movie.up ?? 0}
                active={myVote === 1}
                onPress={onVoteUp}
                disabled={disabled}
                hasDivider={!!(onVoteDown || onToggleSeen)}
              />
            ) : null}
            {onVoteDown ? (
              <ActionBtn
                icon={<Ionicons name="thumbs-down" size={14} color={myVote === -1 ? palette.error : palette.text} />}
                count={movie.down ?? 0}
                active={myVote === -1}
                onPress={onVoteDown}
                disabled={disabled}
                hasDivider={!!onToggleSeen}
              />
            ) : null}
            {onToggleSeen ? (
              <ActionBtn
                icon={<Ionicons name="eye" size={14} color={iSeen ? palette.success : palette.text} />}
                label={iSeen ? `Vu (${movie.seenCount ?? 0})` : 'Vu'}
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
          ? 'rgba(37,99,235,0.12)' // ~ color-mix(primary 12%)
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
