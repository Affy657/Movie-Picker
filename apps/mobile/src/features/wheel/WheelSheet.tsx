import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ApiError } from '@/api/client';
import { closeEvent, spinWheel } from '@/api/events';
import { listMovies, type MovieWithScore } from '@/api/movies';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  slug: string;
  onClose: () => void;
  hasUser: boolean;
};

export function WheelSheet({ slug, onClose }: Props) {
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<MovieWithScore | null>(null);
  const rotation = useSharedValue(0);

  const moviesQuery = useQuery({
    queryKey: ['movies', slug, 'wheel'],
    queryFn: () => listMovies(slug),
  });

  const spinMutation = useMutation({
    mutationFn: () => spinWheel(slug),
    onSuccess: (res) => {
      const movies = moviesQuery.data ?? [];
      const winnerId = res.winner?._id ?? null;
      const target = winnerId ? (movies.find((m) => m._id === winnerId) ?? null) : null;
      const index = target ? movies.indexOf(target) : 0;
      const sliceAngle = movies.length > 0 ? 360 / movies.length : 0;
      const fullSpins = 5;
      const finalAngle = 360 * fullSpins + (360 - index * sliceAngle - sliceAngle / 2);
      rotation.value = withTiming(finalAngle, { duration: 3200, easing: Easing.out(Easing.cubic) });
      setTimeout(() => setWinner(target), 3200);
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Tirage impossible.'),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeEvent(slug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event', slug] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Clôture impossible.'),
  });

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const movies = moviesQuery.data ?? [];

  return (
    <BottomSheet visible onClose={onClose} title="La roue">
      {movies.length === 0 ? (
        <Text style={{ color: palette.textMuted }}>Aucun film à tirer pour le moment.</Text>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                {
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 2,
                  borderColor: palette.primary,
                  backgroundColor: palette.wheelBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                wheelStyle,
              ]}
            >
              <Text style={{ color: palette.wheelLabel, fontWeight: '700' }}>
                🎯 {movies.length} films
              </Text>
            </Animated.View>
            <Text style={{ position: 'absolute', top: -4, fontSize: 22 }}>▼</Text>
          </View>

          {winner ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: palette.success, fontSize: 14, fontWeight: '700' }}>
                🏆 Gagnant
              </Text>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>
                {winner.title}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Button
                label={spinMutation.isPending ? 'Tirage…' : 'Lancer 🎯'}
                onPress={() => {
                  setError(null);
                  setWinner(null);
                  rotation.value = 0;
                  spinMutation.mutate();
                }}
                loading={spinMutation.isPending}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={closeMutation.isPending ? 'Clôture…' : 'Clôturer'}
                variant="danger"
                onPress={() => closeMutation.mutate()}
                loading={closeMutation.isPending}
              />
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
