import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { getEvent } from '@/api/events';
import { listMovies } from '@/api/movies';
import { useAuth } from '@/features/auth/AuthContext';
import { MovieCard } from '@/features/movies/MovieCard';
import { useTheme } from '@/features/theme/ThemeContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { getGuestParticipant, type GuestParticipant } from '@/lib/guest-storage';
import { JoinSheet } from '@/features/events/JoinSheet';
import { ProposeMovieSheet } from '@/features/movies/ProposeMovieSheet';
import { ShareSheet } from '@/features/events/ShareSheet';
import { MovieDetailSheet } from '@/features/movies/MovieDetailSheet';
import type { MovieWithScore } from '@/api/movies';
import { useMovieActions } from '@/features/movies/useMovieActions';
import { EventConfigSheet } from '@/features/events/EventConfigSheet';
import { WheelSheet } from '@/features/wheel/WheelSheet';

const LIFECYCLE: Record<string, { tone: 'upcoming' | 'live' | 'finished'; label: string }> = {
  upcoming: { tone: 'upcoming', label: 'À venir' },
  live: { tone: 'live', label: '● En cours' },
  finished: { tone: 'finished', label: 'Terminée' },
};

function inferLifecycle(date?: string | null, isFinished?: boolean): string {
  if (isFinished) return 'finished';
  if (!date) return 'upcoming';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'live';
  return d.getTime() < today.getTime() ? 'finished' : 'upcoming';
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t, locale } = useTranslation();
  const [guest, setGuest] = useState<GuestParticipant | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [detailMovie, setDetailMovie] = useState<MovieWithScore | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getGuestParticipant(slug).then((p) => {
      if (!cancelled) setGuest(p);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const eventQuery = useQuery({
    queryKey: ['event', slug],
    queryFn: () => getEvent(slug!),
    enabled: !!slug,
  });

  const myParticipantId = eventQuery.data?.myParticipant?._id ?? guest?.participantId ?? undefined;
  const myPseudo = eventQuery.data?.myParticipant?.pseudo ?? guest?.pseudo ?? null;

  const moviesQuery = useQuery({
    queryKey: ['movies', slug, myParticipantId ?? null],
    queryFn: () => listMovies(slug!, myParticipantId),
    enabled: !!slug,
  });

  const actions = useMovieActions(slug ?? '', myParticipantId ?? null);

  if (!slug) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
        <Text style={{ color: palette.error, padding: 20 }}>Slug manquant.</Text>
      </SafeAreaView>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, padding: 20, gap: 12 }}>
        <Text style={{ color: palette.error }}>Impossible de charger cette soirée.</Text>
        <Button label={t('common.retry')} variant="secondary" onPress={() => eventQuery.refetch()} fullWidth={false} />
      </SafeAreaView>
    );
  }

  const event = eventQuery.data;
  const lifecycleKey = inferLifecycle(event.date, event.isFinished ?? false);
  const lifecycle = LIFECYCLE[lifecycleKey] ?? LIFECYCLE.upcoming;
  const badgeBg =
    lifecycle.tone === 'live'
      ? palette.badgeLiveBg
      : lifecycle.tone === 'finished'
        ? palette.badgeFinishedBg
        : palette.badgeUpcomingBg;
  const badgeText =
    lifecycle.tone === 'live'
      ? palette.badgeLiveText
      : lifecycle.tone === 'finished'
        ? palette.badgeFinishedText
        : palette.badgeUpcomingText;

  const isHost = event.isHost ?? false;
  const canAct = !!myParticipantId && !event.isFinished;
  const canPropose = canAct;
  const canVote = canAct && !!myParticipantId;
  const isMember = !!event.myParticipant?._id || !!guest;
  const dateLabel = event.date
    ? new Date(event.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <FlatList
        data={moviesQuery.data ?? []}
        keyExtractor={(m) => m._id ?? String(m.tmdbId ?? Math.random())}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {event.config?.theme ? <Text style={{ fontSize: 28 }}>{event.config.theme}</Text> : null}
                <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700', flexShrink: 1 }}>
                  {event.title ?? 'Sans titre'}
                </Text>
                <View
                  style={{
                    backgroundColor: badgeBg,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: badgeText, fontSize: 12, fontWeight: '600' }}>{lifecycle.label}</Text>
                </View>
              </View>
              <Text style={{ color: palette.textMuted }}>
                {dateLabel}
                {event.time ? ` · ${event.time}` : ''}
              </Text>
              {myPseudo ? (
                <Text style={{ color: palette.meta, fontSize: 13 }}>
                  Tu participes en tant que {myPseudo}.
                </Text>
              ) : null}
            </View>

            {event.winnerMovie ? (
              <View
                style={{
                  backgroundColor: palette.badgeLiveBg,
                  padding: 12,
                  borderRadius: 12,
                  gap: 4,
                }}
              >
                <Text style={{ color: palette.badgeLiveText, fontSize: 12, fontWeight: '600' }}>🏆 Gagnant</Text>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
                  {event.winnerMovie.title ?? ''}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.sectionHeading, fontSize: 14, fontWeight: '600' }}>
                Participants ({event.participantCount ?? event.participants?.length ?? 0})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(event.participants ?? []).map((p) => (
                  <View
                    key={p._id ?? p.pseudo ?? Math.random()}
                    style={{
                      backgroundColor: p.isCreator ? palette.badgeHostBg : palette.borderSubtle,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        color: p.isCreator ? palette.badgeHostText : palette.text,
                        fontSize: 12,
                        fontWeight: p.isCreator ? '600' : '500',
                      }}
                    >
                      {p.isCreator ? '👑 ' : ''}
                      {p.pseudo ?? '?'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {!isMember ? (
                <Button
                  label="Rejoindre"
                  onPress={() => setShowJoin(true)}
                  fullWidth={false}
                />
              ) : null}
              {canPropose ? (
                <Button
                  label="Proposer un film"
                  onPress={() => setShowPropose(true)}
                  variant="secondary"
                  fullWidth={false}
                />
              ) : null}
              <Button
                label="Partager"
                variant="secondary"
                onPress={() => setShowShare(true)}
                fullWidth={false}
              />
              {isHost ? (
                <Button label="⚙ Config" variant="ghost" onPress={() => setShowConfig(true)} fullWidth={false} />
              ) : null}
              {isHost && !event.isFinished ? (
                <Button label="🎯 Lancer la roue" onPress={() => setShowWheel(true)} fullWidth={false} />
              ) : null}
            </View>

            <Text style={{ color: palette.sectionHeading, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
              Films ({event.movieCount ?? moviesQuery.data?.length ?? 0})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MovieCard
            movie={item}
            onPress={() => setDetailMovie(item)}
            canRemove={isHost || (myParticipantId === item.participantId && !event.isFinished)}
            disabled={actions.isPending || event.isFinished}
            onVoteUp={
              canVote && !event.isFinished
                ? () => actions.vote(item._id ?? '', item.myVote === 1 ? null : 1)
                : undefined
            }
            onVoteDown={
              canVote && !event.isFinished
                ? () => actions.vote(item._id ?? '', item.myVote === -1 ? null : -1)
                : undefined
            }
            onToggleSeen={
              myParticipantId && !event.isFinished
                ? () => actions.toggleSeen(item._id ?? '', (item.seenCount ?? 0) > 0)
                : undefined
            }
            onRemove={
              isHost || myParticipantId === item.participantId
                ? () => actions.remove(item._id ?? '')
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          moviesQuery.isLoading ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 20 }}>
              Aucun film proposé pour le moment.
            </Text>
          )
        }
      />

      {showJoin ? (
        <JoinSheet
          slug={slug}
          onClose={() => setShowJoin(false)}
          onJoined={(participant) => {
            setGuest(participant);
            setShowJoin(false);
          }}
        />
      ) : null}
      {showPropose && myParticipantId ? (
        <ProposeMovieSheet
          slug={slug}
          participantId={myParticipantId}
          onClose={() => setShowPropose(false)}
        />
      ) : null}
      {showShare ? <ShareSheet slug={slug} title={event.title ?? ''} onClose={() => setShowShare(false)} /> : null}
      {showConfig && isHost ? (
        <EventConfigSheet eventIdOrSlug={slug} onClose={() => setShowConfig(false)} />
      ) : null}
      {showWheel && isHost ? (
        <WheelSheet slug={slug} onClose={() => setShowWheel(false)} hasUser={!!user} />
      ) : null}
      {detailMovie ? (
        <MovieDetailSheet movie={detailMovie} onClose={() => setDetailMovie(null)} />
      ) : null}
    </SafeAreaView>
  );
}
