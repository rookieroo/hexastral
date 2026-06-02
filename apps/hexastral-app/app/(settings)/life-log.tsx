import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useCallback } from 'react'
import { Alert, FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LifeEventCard } from '@/components/social/LifeEventCard'
import { useAuth } from '@/lib/auth'
import { useDeleteLifeEventMutation, useLifeEventsQuery } from '@/lib/hooks/useLifeEventsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

export default function LifeLogScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()

  const ios = useIosPalette()

  const eventsQuery = useLifeEventsQuery(userId)
  const deleteMutation = useDeleteLifeEventMutation(userId)

  const handleDelete = useCallback(
    (eventId: string) => {
      Alert.alert(t('life_event_delete_confirm_title'), t('life_event_delete_confirm_msg'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(eventId),
        },
      ])
    },
    [deleteMutation, t]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: ios.separator,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: '600',
            color: ios.text,
            letterSpacing: 1,
          }}
        >
          {t('life_log_title')}
        </Text>
        <Pressable
          onPress={() => router.push('/life-event-create')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 0,
            backgroundColor: ios.tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} color={ios.tintFg} />
        </Pressable>
      </View>

      <FlatList
        data={eventsQuery.data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={eventsQuery.isFetching && !eventsQuery.isLoading}
        onRefresh={() => {
          void eventsQuery.refetch()
        }}
        ListEmptyComponent={
          eventsQuery.isLoading ? null : (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>✦</Text>
              <Text style={{ fontSize: 15, color: ios.secondary }}>{t('life_log_empty')}</Text>
              <Pressable
                onPress={() => router.push('/life-event-create')}
                style={{
                  marginTop: 20,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: ios.tint,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: ios.tintFg }}>
                  {t('life_log_add_first')}
                </Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => <LifeEventCard event={item} onDelete={handleDelete} />}
      />
    </SafeAreaView>
  )
}
