import { Trash2 } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import type { LifeEvent } from '@/lib/hooks/useLifeEventsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

interface LifeEventCardProps {
  event: LifeEvent
  onDelete?: (id: string) => void
}

export function LifeEventCard({ event, onDelete }: LifeEventCardProps) {
  const { t } = useI18n()
  const ios = useIosPalette()

  return (
    <View
      style={{
        backgroundColor: ios.card,
        borderRadius: 0,
        padding: 16,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: ios.separator,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: ios.text, flex: 1 }}>
              {event.title}
            </Text>
            {onDelete && (
              <Pressable onPress={() => onDelete(event.id)} hitSlop={8} style={{ padding: 4 }}>
                <Trash2 size={14} color={ios.dim} />
              </Pressable>
            )}
          </View>
          <Text style={{ fontSize: 12, color: ios.secondary, marginBottom: 6 }}>
            {event.eventDate}
            {event.liunianGanZhi ? ` · ${event.liunianGanZhi}` : ''}
          </Text>
          {event.description ? (
            <Text style={{ fontSize: 13, color: ios.secondary, lineHeight: 18 }}>
              {event.description}
            </Text>
          ) : null}
          {event.aiInterpretation ? (
            <View
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 0.5,
                borderTopColor: ios.separator,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: ios.accent,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('life_event_ai_interpretation')}
              </Text>
              <Text style={{ fontSize: 13, color: ios.text, lineHeight: 20 }}>
                {event.aiInterpretation}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
