import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { type LifeEventType, useCreateLifeEventMutation } from '@/lib/hooks/useLifeEventsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

const EVENT_TYPES: LifeEventType[] = [
  'career',
  'relationship',
  'health',
  'travel',
  'education',
  'family',
  'other',
]

export default function LifeEventCreateScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()

  const ios = useIosPalette()

  const today = new Date().toISOString().slice(0, 10)
  const [eventDate, setEventDate] = useState(today)
  const [eventType, setEventType] = useState<LifeEventType>('career')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = useCreateLifeEventMutation(userId)

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert(t('life_event_title_required'))
      return
    }
    createMutation.mutate(
      {
        eventDate,
        eventType,
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert(t('common_retry_later')),
      }
    )
  }

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
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 4, marginRight: 8 }}>
          <ArrowLeft size={20} color={ios.tint} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: ios.text }}>
          {t('life_event_new_title')}
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: createMutation.isPending ? ios.dim : ios.tint,
            }}
          >
            {t('save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Date field */}
        <Text
          style={{
            fontSize: 12,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('life_event_date_label')}
        </Text>
        <TextInput
          value={eventDate}
          onChangeText={setEventDate}
          placeholder='YYYY-MM-DD'
          placeholderTextColor={ios.dim}
          style={{
            backgroundColor: ios.card,
            borderRadius: 0,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: ios.text,
            fontSize: 15,
            marginBottom: 16,
          }}
        />

        {/* Event type selector */}
        <Text
          style={{
            fontSize: 12,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('life_event_type_label')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {EVENT_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setEventType(type)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: eventType === type ? ios.tint : ios.separator,
                backgroundColor: eventType === type ? `${ios.tint}18` : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: eventType === type ? ios.tint : ios.secondary,
                  fontWeight: eventType === type ? '600' : '400',
                }}
              >
                {t(`life_event_type_${type}` as const)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Title field */}
        <Text
          style={{
            fontSize: 12,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('life_event_title_label')}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('life_event_title_placeholder')}
          placeholderTextColor={ios.dim}
          style={{
            backgroundColor: ios.card,
            borderRadius: 0,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: ios.text,
            fontSize: 15,
            marginBottom: 16,
          }}
        />

        {/* Description field */}
        <Text
          style={{
            fontSize: 12,
            color: ios.secondary,
            letterSpacing: 2,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('life_event_desc_label')}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('life_event_desc_placeholder')}
          placeholderTextColor={ios.dim}
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: ios.card,
            borderRadius: 0,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: ios.text,
            fontSize: 15,
            minHeight: 100,
            textAlignVertical: 'top',
            marginBottom: 24,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
