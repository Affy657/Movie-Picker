import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getMovieDetails } from '@/api/movies';
import { BottomSheet } from '@/components/BottomSheet';
import { useTheme } from '@/features/theme/ThemeContext';
import { logoUrl, posterUrl } from '@/lib/tmdb';
import type { MovieWithScore } from '@/api/movies';

type Props = {
  movie: MovieWithScore;
  onClose: () => void;
};

export function MovieDetailSheet({ movie, onClose }: Props) {
  const { palette } = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['movie-details', movie.tmdbId],
    queryFn: ({ signal }) => getMovieDetails(movie.tmdbId ?? 0, { signal }),
    enabled: !!movie.tmdbId,
  });

  const poster = posterUrl(movie.posterPath, 'w185');
  const tmdbWatchUrl = movie.tmdbWatchPageUrl;

  return (
    <BottomSheet visible onClose={onClose} title={movie.title ?? 'Détails'}>
      <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {poster ? (
            <Image source={{ uri: poster }} style={{ width: 80, height: 120, borderRadius: 8 }} contentFit="cover" />
          ) : (
            <View
              style={{
                width: 80,
                height: 120,
                borderRadius: 8,
                backgroundColor: palette.posterPlaceholder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: palette.placeholder, fontSize: 24 }}>🎬</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            {data?.tagline ? (
              <Text style={{ color: palette.textMuted, fontStyle: 'italic' }}>{data.tagline}</Text>
            ) : null}
            {typeof movie.voteAverage === 'number' ? (
              <Text style={{ color: palette.meta }}>★ {movie.voteAverage.toFixed(1)}</Text>
            ) : null}
            {(data?.runtimeMinutes ?? movie.runtimeMinutes) ? (
              <Text style={{ color: palette.meta }}>{data?.runtimeMinutes ?? movie.runtimeMinutes} min</Text>
            ) : null}
            {data?.director ? (
              <Text style={{ color: palette.meta, fontSize: 12 }}>Réal. {data.director}</Text>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={palette.primary} />
        ) : isError ? (
          <Text style={{ color: palette.error }}>Impossible de charger les détails complémentaires.</Text>
        ) : data?.overview ? (
          <Text style={{ color: palette.text, lineHeight: 20 }}>{data.overview}</Text>
        ) : null}

        {data?.genres && data.genres.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {data.genres.map((g) => (
              <View
                key={g}
                style={{
                  backgroundColor: palette.borderSubtle,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 12 }}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data?.cast && data.cast.length > 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            Avec {data.cast.slice(0, 5).join(', ')}
          </Text>
        ) : null}

        {movie.watchProviders && movie.watchProviders.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={{ color: palette.sectionHeading, fontWeight: '600' }}>Disponible sur</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {movie.watchProviders.map((wp) => {
                const url = logoUrl(wp.logoPath, 'w45');
                return (
                  <Pressable
                    key={wp.name ?? Math.random()}
                    onPress={() => {
                      if (tmdbWatchUrl) Linking.openURL(tmdbWatchUrl);
                    }}
                    style={{ alignItems: 'center', gap: 2 }}
                  >
                    {url ? (
                      <Image source={{ uri: url }} style={{ width: 36, height: 36, borderRadius: 8 }} contentFit="cover" />
                    ) : null}
                    <Text style={{ color: palette.meta, fontSize: 10 }} numberOfLines={1}>
                      {wp.name ?? ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {tmdbWatchUrl ? (
          <Pressable onPress={() => Linking.openURL(tmdbWatchUrl)}>
            <Text style={{ color: palette.primary, fontWeight: '500' }}>Voir sur TMDB →</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
