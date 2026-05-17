import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ApiError } from '@/api/client';
import { addMovie, searchTmdb, type AddMovieRequest, type MovieSearchItem } from '@/api/movies';
import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/features/theme/ThemeContext';
import { posterUrl } from '@/lib/tmdb';

type Props = {
  slug: string;
  participantId: string;
  onClose: () => void;
};

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function ProposeMovieSheet({ slug, participantId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 300);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ['tmdb-search', debounced],
    queryFn: ({ signal }) => searchTmdb(debounced, { signal }),
    enabled: debounced.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: (body: AddMovieRequest) => addMovie(slug, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movies', slug] });
      await queryClient.invalidateQueries({ queryKey: ['event', slug] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Ajout impossible.');
    },
  });

  const items: MovieSearchItem[] = searchQuery.data?.items ?? [];

  const onPick = (item: MovieSearchItem) => {
    setError(null);
    if (!item.id) return;
    addMutation.mutate({
      tmdbId: item.id,
      title: item.title ?? 'Sans titre',
      year: String(item.year ?? ''),
      posterPath: item.posterPath ?? null,
      participantId,
    } as AddMovieRequest);
  };

  return (
    <BottomSheet visible onClose={onClose} title="Proposer un film">
      <TextField
        label="Recherche TMDB"
        value={query}
        onChangeText={setQuery}
        placeholder="Titre du film…"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
      {debounced.length < 2 ? (
        <Text style={{ color: palette.meta }}>Tape au moins 2 caractères.</Text>
      ) : searchQuery.isLoading ? (
        <ActivityIndicator color={palette.primary} />
      ) : items.length === 0 ? (
        <Text style={{ color: palette.textMuted }}>Aucun résultat.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => (it.id != null ? String(it.id) : `tmdb-${idx}`)}
          style={{ maxHeight: 360 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const url = posterUrl(item.posterPath, 'w185');
            return (
              <Pressable
                onPress={() => onPick(item)}
                disabled={addMutation.isPending}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: 12,
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: pressed ? palette.borderSubtle : 'transparent',
                  opacity: addMutation.isPending ? 0.5 : 1,
                })}
              >
                <View
                  style={{
                    width: 46,
                    height: 70,
                    borderRadius: 6,
                    backgroundColor: palette.posterPlaceholder,
                    overflow: 'hidden',
                  }}
                >
                  {url ? (
                    <Image
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }} numberOfLines={2}>
                    {item.title ?? '—'}
                  </Text>
                  <Text style={{ color: palette.meta, fontSize: 12 }}>
                    {item.year ?? ''}
                    {typeof item.voteAverage === 'number'
                      ? ` · ★ ${item.voteAverage.toFixed(1)}`
                      : ''}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </BottomSheet>
  );
}
