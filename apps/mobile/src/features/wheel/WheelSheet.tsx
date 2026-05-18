import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
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
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  slug: string;
  onClose: () => void;
  hasUser: boolean;
};

const SPIN_DURATION_MS = 3200;
const FULL_SPINS = 5;

export function WheelSheet({ slug, onClose }: Props) {
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<MovieWithScore | null>(null);
  const rotation = useSharedValue(0);
  const winnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moviesQuery = useQuery({
    queryKey: ['movies', slug, null],
    queryFn: () => listMovies(slug),
  });

  useEffect(() => {
    return () => {
      if (winnerTimeoutRef.current != null) {
        clearTimeout(winnerTimeoutRef.current);
        winnerTimeoutRef.current = null;
      }
    };
  }, []);

  const spinMutation = useMutation({
    mutationFn: () => spinWheel(slug),
    onSuccess: (res) => {
      const movies = moviesQuery.data ?? [];
      const winnerId = res.winner?._id ?? null;
      const target = winnerId ? (movies.find((m) => m._id === winnerId) ?? null) : null;
      if (!target) {
        setError(t('mobile.wheel.winnerNotFound'));
        return;
      }
      const index = movies.indexOf(target);
      if (index < 0) {
        setError(t('mobile.wheel.winnerNotFound'));
        return;
      }
      const sliceAngle = movies.length > 0 ? 360 / movies.length : 0;
      const finalAngle = 360 * FULL_SPINS + (360 - index * sliceAngle - sliceAngle / 2);
      rotation.value = withTiming(finalAngle, {
        duration: SPIN_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      if (winnerTimeoutRef.current != null) clearTimeout(winnerTimeoutRef.current);
      winnerTimeoutRef.current = setTimeout(() => {
        winnerTimeoutRef.current = null;
        setWinner(target);
      }, SPIN_DURATION_MS);
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('mobile.wheel.spinError')),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeEvent(slug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event', slug] });
      await queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : t('mobile.wheel.closeError')),
  });

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const movies = moviesQuery.data ?? [];

  return (
    <BottomSheet visible onClose={onClose} title={t('mobile.wheel.title')}>
      {movies.length === 0 ? (
        <Text style={{ color: palette.textMuted }}>{t('mobile.wheel.emptyMovies')}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="disc" size={16} color={palette.wheelLabel} />
                <Text style={{ color: palette.wheelLabel, fontWeight: '700' }}>
                  {t('mobile.wheel.moviesCount', { count: movies.length })}
                </Text>
              </View>
            </Animated.View>
            <Text style={{ position: 'absolute', top: -4, fontSize: 22 }}>▼</Text>
          </View>

          {winner ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={14} color={palette.success} />
                <Text style={{ color: palette.success, fontSize: 14, fontWeight: '700' }}>
                  {t('mobile.wheel.winnerKicker')}
                </Text>
              </View>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>
                {winner.title}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Button
                label={spinMutation.isPending ? t('mobile.wheel.spinning') : t('mobile.wheel.spin')}
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
                label={
                  closeMutation.isPending ? t('mobile.wheel.closing') : t('mobile.wheel.close')
                }
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
