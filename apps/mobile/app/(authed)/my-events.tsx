import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyEvents, type MyEventSummary } from '@/api/events';
import { Button } from '@/components/Button';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EventCard } from '@/features/events/EventCard';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { parseLocalDate } from '@/lib/dates';

type Tab = 'active' | 'history';

function isFinished(ev: MyEventSummary): boolean {
  return ev.lifecycle === 'finished';
}

function startMs(ev: MyEventSummary): number {
  const d = parseLocalDate(ev.date);
  if (!d) return 0;
  if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
    const [h, m] = ev.time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d.getTime();
}

export default function MyEventsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const showFabLabel = width > 380;
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('active');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: getMyEvents,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const events = useMemo(() => data?.events ?? [], [data]);

  const { hostedActive, joinedActive, history } = useMemo(() => {
    const hosted = events.filter((e) => e.isCreator);
    const joined = events.filter((e) => !e.isCreator && e.isParticipant);
    return {
      hostedActive: hosted.filter((e) => !isFinished(e)).sort((a, b) => startMs(a) - startMs(b)),
      joinedActive: joined.filter((e) => !isFinished(e)).sort((a, b) => startMs(a) - startMs(b)),
      history: [...hosted, ...joined]
        .filter((e) => isFinished(e))
        .sort((a, b) => startMs(b) - startMs(a)),
    };
  }, [events]);

  const activeCount = hostedActive.length + joinedActive.length;
  const historyCount = history.length;
  const total = activeCount + historyCount;

  type Row =
    | { type: 'section'; key: string; label: string }
    | { type: 'event'; key: string; ev: MyEventSummary; showBadge: boolean }
    | { type: 'empty'; key: string; text: string };

  const rows = useMemo<Row[]>(() => {
    if (tab === 'active') {
      const r: Row[] = [];
      if (hostedActive.length > 0) {
        r.push({ type: 'section', key: 'hosted', label: "SOIRÉES QUE J'AI CRÉÉES" });
        hostedActive.forEach((ev) =>
          r.push({ type: 'event', key: `h-${ev.id}`, ev, showBadge: true })
        );
      }
      if (joinedActive.length > 0) {
        r.push({ type: 'section', key: 'joined', label: 'SOIRÉES OÙ JE PARTICIPE' });
        joinedActive.forEach((ev) =>
          r.push({ type: 'event', key: `j-${ev.id}`, ev, showBadge: true })
        );
      }
      if (r.length === 0) {
        r.push({ type: 'empty', key: 'empty-active', text: 'Aucune soirée à venir.' });
      }
      return r;
    }
    const r: Row[] = [];
    if (history.length > 0) {
      r.push({ type: 'section', key: 'history', label: 'HISTORIQUE' });
      history.forEach((ev) => r.push({ type: 'event', key: `hi-${ev.id}`, ev, showBadge: false }));
    } else {
      r.push({ type: 'empty', key: 'empty-history', text: 'Aucune soirée terminée.' });
    }
    return r;
  }, [tab, hostedActive, joinedActive, history]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            backgroundColor: palette.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="play" size={16} color={palette.primaryContrast} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <Text
          style={{
            color: palette.text,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: -0.6,
          }}
        >
          {t('nav.myEvents')}
        </Text>
      </View>

      {!isLoading && total > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'flex-start',
              backgroundColor: palette.bg,
              borderColor: palette.borderSubtle,
              borderWidth: 1,
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
          >
            <TabButton
              label="À venir"
              count={activeCount}
              active={tab === 'active'}
              onPress={() => setTab('active')}
            />
            <TabButton
              label="Historique"
              count={historyCount}
              active={tab === 'history'}
              onPress={() => setTab('history')}
            />
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}
        >
          <Text style={{ color: palette.error, textAlign: 'center' }}>
            Impossible de charger tes soirées.
          </Text>
          <Button
            label={t('common.retry')}
            variant="secondary"
            onPress={() => refetch()}
            fullWidth={false}
          />
        </View>
      ) : total === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 }}
        >
          <Text
            style={{ color: palette.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}
          >
            Aucune soirée pour le moment.
          </Text>
          <Text style={{ color: palette.textMuted, textAlign: 'center', maxWidth: 280 }}>
            Lance-toi : crée ta première soirée et invite tes amis.
          </Text>
          <Button
            label="Créer ma première soirée"
            onPress={() => router.push('/(authed)/new')}
            fullWidth={false}
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <Text
                  style={{
                    color: palette.meta,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.3,
                    marginTop: 10,
                    marginBottom: 8,
                  }}
                >
                  {item.label}
                </Text>
              );
            }
            if (item.type === 'empty') {
              return (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: palette.surface,
                    borderColor: palette.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 12,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: palette.meta }}>{item.text}</Text>
                </View>
              );
            }
            return (
              <View style={{ marginBottom: 10 }}>
                <EventCard
                  event={item.ev}
                  showLifecycleBadge={item.showBadge}
                  onPress={() => {
                    if (item.ev.slug)
                      router.push({ pathname: '/e/[slug]', params: { slug: item.ev.slug } });
                  }}
                />
              </View>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          }
        />
      )}

      <Pressable
        onPress={() => router.push('/(authed)/new')}
        accessibilityLabel="Créer une nouvelle soirée"
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: 84,
          flexDirection: 'row',
          alignItems: 'center',
          gap: showFabLabel ? 6 : 0,
          paddingHorizontal: showFabLabel ? 16 : 16,
          paddingVertical: showFabLabel ? 12 : 14,
          minWidth: showFabLabel ? undefined : 52,
          minHeight: showFabLabel ? undefined : 52,
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: palette.primary,
          shadowColor: '#000',
          shadowOpacity: 0.24,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          transform: [{ translateY: pressed ? -2 : 0 }],
        })}
      >
        <Ionicons name="add" size={showFabLabel ? 20 : 24} color={palette.primaryContrast} />
        {showFabLabel ? (
          <Text style={{ color: palette.primaryContrast, fontWeight: '700', fontSize: 15 }}>
            Créer une soirée
          </Text>
        ) : null}
      </Pressable>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: active ? palette.surface : 'transparent',
        shadowColor: '#000',
        shadowOpacity: active ? 0.06 : 0,
        shadowRadius: active ? 4 : 0,
        shadowOffset: { width: 0, height: 1 },
        elevation: active ? 1 : 0,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          color: active ? palette.text : palette.textMuted,
          fontWeight: '600',
          fontSize: 14,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          minWidth: 22,
          paddingHorizontal: 6,
          height: 22,
          borderRadius: 999,
          backgroundColor: active ? palette.badgeMeBg : palette.borderSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: active ? palette.badgeMeText : palette.meta,
            fontSize: 11,
            fontWeight: '700',
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}
