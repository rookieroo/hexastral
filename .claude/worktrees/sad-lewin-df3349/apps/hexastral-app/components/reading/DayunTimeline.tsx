import { Text, View } from 'react-native'
import type { LifeEvent } from '@/lib/hooks/useLifeEventsQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { LifeEventCard } from '../social/LifeEventCard'

interface DayunGroup {
  label: string
  ganZhi?: string
  events: LifeEvent[]
}

interface DayunTimelineProps {
  groups: DayunGroup[]
  onDeleteEvent?: (id: string) => void
}

export function DayunTimeline({ groups, onDeleteEvent }: DayunTimelineProps) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const ios = useIosPalette()

  if (groups.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>✦</Text>
        <Text style={{ fontSize: 14, color: ios.secondary }}>{t('life_log_empty')}</Text>
      </View>
    )
  }

  return (
    <View>
      {groups.map((group) => (
        <View key={group.label} style={{ marginBottom: 24 }}>
          {/* Group header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
              gap: 8,
            }}
          >
            <View style={{ flex: 1, height: 0.5, backgroundColor: ios.separator }} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '300',
                color: ios.accent,
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              {group.ganZhi ? `${group.label} · ${group.ganZhi}` : group.label}
            </Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: ios.separator }} />
          </View>

          {/* Events in this group */}
          {group.events.map((event) => (
            <LifeEventCard key={event.id} event={event} onDelete={onDeleteEvent} />
          ))}
        </View>
      ))}
    </View>
  )
}
