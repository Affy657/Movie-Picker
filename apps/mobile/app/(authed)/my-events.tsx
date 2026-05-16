import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { getMyEvents } from '@/api/events';
import { EventCard } from '@/features/events/EventCard';
import { useTranslation } from '@/features/i18n/LocaleContext';
import { useTheme } from '@/features/theme/ThemeContext';

export default function MyEventsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

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

  const events = data?.events ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>
          {t('nav.myEvents')}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
          <Text style={{ color: palette.error, textAlign: 'center' }}>
            Impossible de charger tes soirées.
          </Text>
          <Button label={t('common.retry')} variant="secondary" onPress={() => refetch()} fullWidth={false} />
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 }}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
            Aucune soirée pour le moment.
          </Text>
          <Text style={{ color: palette.textMuted, textAlign: 'center' }}>
            Lance-toi : crée ta première soirée et invite tes amis.
          </Text>
          <Button label="Créer ma première soirée" onPress={() => router.push('/(authed)/new')} fullWidth={false} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id ?? item.slug ?? String(Math.random())}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => {
                if (item.slug) router.push({ pathname: '/e/[slug]', params: { slug: item.slug } });
              }}
            />
          )}
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
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: palette.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: palette.primaryContrast, fontSize: 28, fontWeight: '600', lineHeight: 30 }}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
