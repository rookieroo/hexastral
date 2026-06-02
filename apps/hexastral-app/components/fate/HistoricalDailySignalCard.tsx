/**
 * Read-only Daily Signal body — same layout as `DailySignalCard` content region.
 */

import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { SignalToday } from '@/lib/hooks/useSignalQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

const ENERGY_ORDER = ['volatile', 'guarded', 'steady', 'productive', 'rising'] as const

interface Props {
  signal: SignalToday
  isPro: boolean
  /** History detail — label above headline */
  dateLabel?: string
}

export function HistoricalDailySignalCard({ signal, isPro, dateLabel }: Props) {
  const { t } = useI18n()
  const ios = useIosPalette()
  const [showWhy, setShowWhy] = useState(false)

  const energyIdx = ENERGY_ORDER.indexOf(signal.content.energy.level)

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
      }}
    >
      {dateLabel ? (
        <Text
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 4,
            fontSize: 12,
            color: ios.secondary,
            letterSpacing: 0.5,
          }}
        >
          {dateLabel}
        </Text>
      ) : null}

      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 }}>
        <Text
          style={{
            color: ios.text,
            fontSize: 22,
            fontWeight: '500',
            lineHeight: 32,
            letterSpacing: 0.5,
          }}
        >
          {signal.content.headline}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('signal_energy_label')} ·{' '}
          {t(`signal_energy_${signal.content.energy.level}` as Parameters<typeof t>[0])}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {ENERGY_ORDER.map((lvl, i) => (
            <View
              key={lvl}
              style={{
                flex: 1,
                height: 4,
                backgroundColor: i === energyIdx ? ios.tint : ios.separator,
                opacity: i === energyIdx ? 1 : 0.4,
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 8,
          borderTopWidth: 0.5,
          borderTopColor: ios.separator,
        }}
      >
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('signal_today_lens_label')}
        </Text>
        <Text style={{ color: ios.text, fontSize: 15, lineHeight: 22 }}>
          {signal.content.todayLens}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('signal_watch_for_label')}
        </Text>
        <Text style={{ color: ios.text, fontSize: 14, lineHeight: 20 }}>
          {signal.content.watchFor}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          borderTopWidth: 0.5,
          borderTopColor: ios.separator,
        }}
      >
        {(
          [
            ['signal_lucky_hour', signal.content.lucky.hour],
            ['signal_lucky_direction', signal.content.lucky.direction],
            ['signal_lucky_color', signal.content.lucky.color],
            ['signal_lucky_advice', signal.content.lucky.advice],
          ] as const
        ).map(([labelKey, value], i) => (
          <View
            key={labelKey}
            style={{
              width: '50%',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRightWidth: i % 2 === 0 ? 0.5 : 0,
              borderBottomWidth: i < 2 ? 0.5 : 0,
              borderRightColor: ios.separator,
              borderBottomColor: ios.separator,
            }}
          >
            <Text
              style={{
                color: ios.secondary,
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t(labelKey)}
            </Text>
            <Text style={{ color: ios.text, fontSize: 14, fontWeight: '500' }}>{value}</Text>
          </View>
        ))}
      </View>

      {isPro ? (
        <>
          <Pressable
            onPress={() => setShowWhy((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: 0.5,
              borderTopColor: ios.separator,
              gap: 8,
            }}
          >
            {showWhy ? (
              <ChevronDown size={16} color={ios.text} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={16} color={ios.text} strokeWidth={1.5} />
            )}
            <Text
              style={{
                color: ios.text,
                fontSize: 13,
                fontWeight: '500',
                flex: 1,
              }}
            >
              {t('signal_why_label')}
            </Text>
          </Pressable>

          {showWhy ? (
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 18,
                paddingTop: 4,
              }}
            >
              <Text
                style={{
                  color: ios.secondary,
                  fontSize: 13,
                  lineHeight: 20,
                  fontStyle: 'italic',
                }}
              >
                {signal.content.reasoningChain}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  )
}
