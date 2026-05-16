import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import type { MovieWithScore } from '@/api/movies';
import { posterUrl } from '@/lib/tmdb';
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
  const poster = posterUrl(movie.posterPath);
  const isSeen = (movie.seenCount ?? 0) > 0 && movie.seenByPseudos && movie.seenByPseudos.length > 0;
  const myVote = movie.myVote ?? 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={canRemove ? onRemove : undefined}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderColor: palette.borderSubtle,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 70,
          height: 105,
          borderRadius: 8,
          backgroundColor: palette.posterPlaceholder,
          overflow: 'hidden',
        }}
      >
        {poster ? (
          <Image source={{ uri: poster }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: palette.placeholder, fontSize: 24 }}>🎬</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', flexShrink: 1 }} numberOfLines={2}>
            {movie.title ?? '—'}
          </Text>
          {movie.year ? <Text style={{ color: palette.meta }}>({movie.year})</Text> : null}
        </View>

        {movie.proposerPseudo ? (
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Proposé par {movie.proposerPseudo}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {movie.runtimeMinutes ? (
            <Text style={{ color: palette.meta, fontSize: 12 }}>{movie.runtimeMinutes} min</Text>
          ) : null}
          {typeof movie.voteAverage === 'number' ? (
            <Text style={{ color: palette.meta, fontSize: 12 }}>★ {movie.voteAverage.toFixed(1)}</Text>
          ) : null}
          {isSeen ? (
            <View
              style={{
                backgroundColor: palette.badgeFinishedBg,
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: palette.badgeFinishedText, fontSize: 11, fontWeight: '600' }}>
                déjà vu
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <VoteButton
            label="👍"
            count={movie.up ?? 0}
            active={myVote === 1}
            onPress={onVoteUp}
            disabled={disabled || !onVoteUp}
          />
          <VoteButton
            label="👎"
            count={movie.down ?? 0}
            active={myVote === -1}
            onPress={onVoteDown}
            disabled={disabled || !onVoteDown}
          />
          {onToggleSeen ? (
            <Pressable
              onPress={onToggleSeen}
              disabled={disabled}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: palette.text, fontSize: 12, fontWeight: '500' }}>👁 Vu</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function VoteButton({
  label,
  count,
  active,
  onPress,
  disabled,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? palette.badgeLiveBg : palette.surface,
        borderColor: active ? palette.badgeLiveText : palette.border,
        borderWidth: 1,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 14 }}>{label}</Text>
      <Text style={{ color: active ? palette.badgeLiveText : palette.text, fontSize: 12, fontWeight: '600' }}>
        {count}
      </Text>
    </Pressable>
  );
}
