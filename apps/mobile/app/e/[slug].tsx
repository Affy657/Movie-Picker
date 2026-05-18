import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { getEvent } from '@/api/events';
import { listMovies } from '@/api/movies';
import { useAuth } from '@/features/auth/AuthContext';
import { MovieCard } from '@/features/movies/MovieCard';
import { useTheme } from '@/features/theme/ThemeContext';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { compareDayLocal, parseLocalDate } from '@/lib/dates';
import {
  clearGuestParticipant,
  getGuestParticipant,
  type GuestParticipant,
} from '@/lib/guest-storage';
import { toastSuccess } from '@/lib/toast';
import { EventThemeBanner } from '@/features/events/EventThemeBanner';
import { JoinSheet } from '@/features/events/JoinSheet';
import { ProposeMovieSheet } from '@/features/movies/ProposeMovieSheet';
import { ShareSheet } from '@/features/events/ShareSheet';
import { MovieDetailSheet } from '@/features/movies/MovieDetailSheet';
import type { MovieWithScore } from '@/api/movies';
import { useMovieActions } from '@/features/movies/useMovieActions';
import { EventConfigSheet } from '@/features/events/EventConfigSheet';
import { useEventActions } from '@/features/events/useEventActions';
import { WheelSheet } from '@/features/wheel/WheelSheet';

function inferLifecycle(date?: string | null, isFinished?: boolean): string {
  if (isFinished) return 'finished';
  const d = parseLocalDate(date);
  if (!d) return 'upcoming';
  const cmp = compareDayLocal(d, new Date());
  if (cmp === 0) return 'live';
  return cmp < 0 ? 'finished' : 'upcoming';
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
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
  const eventActions = useEventActions(slug ?? '');

  if (!slug) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
        <Text style={{ color: palette.error, padding: 20 }}>
          {t('mobile.eventDetail.slugMissing')}
        </Text>
      </SafeAreaView>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, padding: 20, gap: 12 }}>
        <Text style={{ color: palette.error }}>{t('mobile.eventDetail.loadError')}</Text>
        <Button
          label={t('common.retry')}
          variant="secondary"
          onPress={() => eventQuery.refetch()}
          fullWidth={false}
        />
      </SafeAreaView>
    );
  }

  const event = eventQuery.data;
  const lifecycleKey = inferLifecycle(event.date, event.isFinished ?? false);
  const isHost = event.isHost ?? false;
  const canAct = !!myParticipantId && !event.isFinished;
  const canPropose = canAct;
  const canVote = canAct && !!myParticipantId;
  const isMember = !!event.myParticipant?._id || !!guest;
  const eventLocalDate = parseLocalDate(event.date);
  const dateLabel = eventLocalDate
    ? eventLocalDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      {actions.error || eventActions.error ? (
        <View
          style={{
            backgroundColor: palette.error,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
          accessibilityRole="alert"
        >
          <Text style={{ color: '#ffffff', flex: 1 }}>{actions.error ?? eventActions.error}</Text>
          <Text
            onPress={() => {
              actions.clearError();
              eventActions.clearError();
            }}
            style={{ color: '#ffffff', fontWeight: '700' }}
            accessibilityLabel={t('common.close')}
          >
            ✕
          </Text>
        </View>
      ) : null}
      <FlatList
        data={moviesQuery.data ?? []}
        keyExtractor={(m) => m._id ?? String(m.tmdbId ?? Math.random())}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingTop: 12, paddingBottom: 12 }}>
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(authed)/my-events')
              }
              accessibilityRole="link"
              hitSlop={6}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: pressed ? palette.borderSubtle : 'transparent',
              })}
            >
              <Ionicons name="arrow-back" size={16} color={palette.textMuted} />
              <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '500' }}>
                {t('mobile.back')}
              </Text>
            </Pressable>

            <EventThemeBanner theme={event.config?.theme} />

            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: palette.text,
                  fontSize: 24,
                  fontWeight: '800',
                  letterSpacing: -0.6,
                  lineHeight: 28,
                }}
              >
                {event.title ?? 'Sans titre'}
              </Text>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
              >
                <Text style={{ color: palette.textMuted, fontSize: 15 }}>
                  {dateLabel}
                  {event.time ? ` à ${event.time}` : ''}
                </Text>
                {lifecycleKey === 'finished' ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: palette.badgeFinishedBg,
                      borderColor: palette.badgeFinishedText,
                      borderWidth: 1,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={11} color={palette.badgeFinishedText} />
                    <Text
                      style={{
                        color: palette.badgeFinishedText,
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 1,
                      }}
                    >
                      {t('mobile.eventDetail.finishedBadge')}
                    </Text>
                  </View>
                ) : lifecycleKey === 'live' ? (
                  <View
                    style={{
                      backgroundColor: palette.badgeLiveBg,
                      borderColor: palette.badgeLiveText,
                      borderWidth: 1,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        color: palette.badgeLiveText,
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 1,
                      }}
                    >
                      {t('mobile.eventDetail.liveBadge')}
                    </Text>
                  </View>
                ) : null}
              </View>
              {myPseudo ? (
                <Text style={{ color: palette.meta, fontSize: 13 }}>
                  {t('mobile.eventDetail.participatingAs')}{' '}
                  <Text style={{ color: palette.text, fontWeight: '500' }}>{myPseudo}</Text>.
                </Text>
              ) : null}
            </View>

            {event.winnerMovie ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: palette.badgeLiveBg,
                  borderWidth: 1,
                  borderColor: palette.badgeLiveText,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: palette.badgeLiveText,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="trophy" size={18} color={palette.badgeLiveBg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: palette.badgeLiveText,
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.2,
                    }}
                  >
                    {t('mobile.eventDetail.winnerKicker')}
                  </Text>
                  <Text
                    style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {event.winnerMovie.title ?? ''}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              {!isMember ? (
                <Button
                  label={t('mobile.eventDetail.actions.join')}
                  icon="person-add"
                  onPress={() => setShowJoin(true)}
                />
              ) : canPropose ? (
                <Button
                  label={t('mobile.eventDetail.actions.propose')}
                  icon="add-circle"
                  onPress={() => setShowPropose(true)}
                />
              ) : null}

              {isHost && !event.isFinished ? (
                <Button
                  label={t('mobile.eventDetail.actions.wheel')}
                  icon="disc"
                  variant={isMember ? 'secondary' : 'primary'}
                  onPress={() => setShowWheel(true)}
                />
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('mobile.eventDetail.actions.share')}
                    icon="share-social"
                    variant="secondary"
                    onPress={() => setShowShare(true)}
                  />
                </View>
                {isHost ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('mobile.eventDetail.actions.config')}
                      icon="settings"
                      variant="secondary"
                      onPress={() => setShowConfig(true)}
                    />
                  </View>
                ) : null}
              </View>

              {guest && !user && !event.isFinished ? (
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      t('mobile.eventDetail.leaveGuestTitle'),
                      t('mobile.eventDetail.leaveGuestMessage'),
                      [
                        { text: t('mobile.cancel'), style: 'cancel' },
                        {
                          text: t('mobile.eventDetail.leaveGuestCta'),
                          style: 'destructive',
                          onPress: () => {
                            setGuest(null);
                            toastSuccess(t('mobile.eventDetail.leaveGuestToast'));
                            void clearGuestParticipant(slug);
                          },
                        },
                      ]
                    )
                  }
                  accessibilityRole="button"
                  style={{ alignSelf: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ color: palette.meta, fontSize: 12, textDecorationLine: 'underline' }}>
                    {t('mobile.eventDetail.leaveGuestLink')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.borderSubtle,
                borderWidth: 1,
                borderRadius: 12,
                padding: 16,
                gap: 10,
              }}
            >
              <Text
                style={{
                  color: palette.meta,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                }}
              >
                {t('mobile.eventDetail.participantsHeading')} (
                {event.participantCount ?? event.participants?.length ?? 0})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(event.participants ?? []).map((p) => {
                  const canKick = isHost && !p.isCreator && !!p._id;
                  return (
                    <Pressable
                      key={p._id ?? p.pseudo ?? Math.random()}
                      disabled={!canKick || eventActions.isKicking}
                      onLongPress={
                        canKick
                          ? () =>
                              Alert.alert(
                                t('mobile.eventDetail.kickTitle'),
                                t('mobile.eventDetail.kickMessage', {
                                  pseudo: p.pseudo ?? '?',
                                }),
                                [
                                  { text: t('mobile.cancel'), style: 'cancel' },
                                  {
                                    text: t('mobile.confirmRemove'),
                                    style: 'destructive',
                                    onPress: () => eventActions.kickParticipant(p._id!),
                                  },
                                ]
                              )
                          : undefined
                      }
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: p.isCreator ? palette.badgeHostBg : palette.borderSubtle,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        opacity: pressed && canKick ? 0.7 : 1,
                      })}
                    >
                      {p.isCreator ? (
                        <Ionicons name="ribbon" size={11} color={palette.badgeHostText} />
                      ) : null}
                      <Text
                        style={{
                          color: p.isCreator ? palette.badgeHostText : palette.text,
                          fontSize: 12,
                          fontWeight: p.isCreator ? '600' : '500',
                        }}
                      >
                        {p.pseudo ?? '?'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {isHost ? (
                <Text style={{ color: palette.meta, fontSize: 11 }}>
                  {t('mobile.eventDetail.hostHint')}
                </Text>
              ) : null}
            </View>

            <Text
              style={{
                color: palette.meta,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.2,
              }}
            >
              {t('mobile.eventDetail.moviesHeading')} (
              {event.movieCount ?? moviesQuery.data?.length ?? 0})
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
            <ActivityIndicator color={palette.primary} style={{ marginTop: 20 }} />
          ) : (
            <View
              style={{
                padding: 20,
                backgroundColor: palette.surface,
                borderColor: palette.borderSubtle,
                borderWidth: 1,
                borderRadius: 12,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: palette.textMuted, textAlign: 'center' }}>
                {t('mobile.eventDetail.noMovies')}
              </Text>
              {canPropose ? (
                <Text style={{ color: palette.meta, fontSize: 13 }}>
                  {t('mobile.eventDetail.proposeHint')}
                </Text>
              ) : null}
            </View>
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
      {showShare ? (
        <ShareSheet slug={slug} title={event.title ?? ''} onClose={() => setShowShare(false)} />
      ) : null}
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
