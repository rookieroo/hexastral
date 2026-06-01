/**
 * DailySignalCard — editorial hero for the Fate tab.
 *
 * Boxless layout (Ink Brutalism):
 * - large headline that lives directly on the page background
 * - inline minimal energy track instead of a labeled bar
 * - prose body for todayLens / watchFor with subtle weight contrast
 * - lucky as a 2x2 inline label-value grid (no cell borders)
 * - hairline separators only, no outer card frame
 */

import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import type { SignalToday } from '@/lib/hooks/useSignalQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

interface Props {
  signal: SignalToday | null | undefined
  isLoading: boolean
  isPro: boolean
  hasChart?: boolean
  isError?: boolean
  onSetupChart?: () => void
  onRetry?: () => void
  onUpgrade?: () => void
}

const ENERGY_ORDER = ['volatile', 'guarded', 'steady', 'productive', 'rising'] as const

export function DailySignalCard({
  signal,
  isLoading,
  isPro,
  hasChart = true,
  isError = false,
  onSetupChart,
  onRetry,
  onUpgrade,
}: Props) {
  const { t } = useI18n()
  const ios = useIosPalette()
  const [showWhy, setShowWhy] = useState(false)

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, alignItems: 'center' }}>
        <ActivityIndicator color={ios.text} />
        <Text style={{ color: ios.secondary, marginTop: 12, fontSize: 13 }}>
          {t('signal_loading')}
        </Text>
      </View>
    )
  }

  if (!signal) {
    if (!hasChart) {
      return (
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 32,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: ios.text,
              fontSize: 16,
              fontWeight: '500',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}
          >
            {t('signal_no_chart_title')}
          </Text>
          <Text
            style={{
              color: ios.secondary,
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            {t('signal_no_chart_desc')}
          </Text>
          {onSetupChart ? (
            <Pressable
              onPress={onSetupChart}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 22,
                backgroundColor: ios.text,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: ios.tintFg,
                  fontSize: 13,
                  fontWeight: '500',
                  letterSpacing: 0.5,
                }}
              >
                {t('signal_no_chart_cta')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )
    }

    return (
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 32,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: ios.secondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 14,
          }}
        >
          {isError ? t('signal_error') : t('signal_empty')}
        </Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderWidth: 0.5,
              borderColor: ios.separator,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text
              style={{
                color: ios.text,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 0.5,
              }}
            >
              {t('signal_retry')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    )
  }

  const energyIdx = ENERGY_ORDER.indexOf(signal.content.energy.level)

  const luckyCells = [
    ['signal_lucky_hour', signal.content.lucky.hour],
    ['signal_lucky_direction', signal.content.lucky.direction],
    ['signal_lucky_color', signal.content.lucky.color],
    ['signal_lucky_advice', signal.content.lucky.advice],
  ] as const

  const filledCount = energyIdx + 1 // 1..5

  return (
    <View>
      {/* Hero headline — sized to harmonize with the rest of the page (22pt) */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18 }}>
        <Text
          style={{
            color: ios.text,
            fontSize: 22,
            fontWeight: '500',
            lineHeight: 32,
            letterSpacing: 0.3,
          }}
        >
          {signal.content.headline}
        </Text>
      </View>

      {/* Energy — wifi/signal-tower style: 5 bars of increasing height, filled up to current level */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 14 }}>
            {ENERGY_ORDER.map((lvl, i) => {
              const barHeight = 4 + i * 2.5 // 4 → 6.5 → 9 → 11.5 → 14
              const isFilled = i < filledCount
              return (
                <View
                  key={lvl}
                  style={{
                    width: 4,
                    height: barHeight,
                    backgroundColor: isFilled ? ios.text : ios.separator,
                    opacity: isFilled ? 0.55 + i * 0.11 : 0.5,
                  }}
                />
              )
            })}
          </View>
          <Text
            style={{
              color: ios.secondary,
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              fontWeight: '300',
            }}
          >
            {filledCount}/5 ·{' '}
            {t(`signal_energy_${signal.content.energy.level}` as Parameters<typeof t>[0])}
          </Text>
        </View>
      </View>

      {/* Body prose */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text
          style={{ color: ios.text, fontSize: 15, lineHeight: 26, fontWeight: '300' }}
          numberOfLines={3}
        >
          {signal.content.todayLens}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }}>
        <Text
          style={{ color: ios.secondary, fontSize: 14, lineHeight: 22, fontWeight: '300' }}
          numberOfLines={2}
        >
          {signal.content.watchFor}
        </Text>
      </View>

      {/* Lucky 2x2 — no cell borders, just typographic grid */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 4,
          borderTopWidth: 0.5,
          borderTopColor: ios.separator,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {luckyCells.map(([labelKey, value]) => (
            <View
              key={labelKey}
              style={{
                width: '50%',
                paddingBottom: 14,
              }}
            >
              <Text
                style={{
                  color: ios.secondary,
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  fontWeight: '300',
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {t(labelKey)}
              </Text>
              <Text
                style={{ color: ios.text, fontSize: 13, fontWeight: '500', letterSpacing: 0.3 }}
                numberOfLines={2}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Why disclosure — Pro only, hairline-separated */}
      {isPro ? (
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: ios.separator,
          }}
        >
          <Pressable
            onPress={() => setShowWhy((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingVertical: 14,
              gap: 8,
            }}
          >
            {showWhy ? (
              <ChevronDown size={14} color={ios.secondary} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} color={ios.secondary} strokeWidth={1.5} />
            )}
            <Text
              style={{
                color: ios.secondary,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 0.5,
                flex: 1,
              }}
            >
              {t('signal_why_label')}
            </Text>
          </Pressable>

          {showWhy ? (
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: 18,
              }}
            >
              <Text
                style={{
                  color: ios.secondary,
                  fontSize: 13,
                  lineHeight: 22,
                  fontStyle: 'italic',
                  fontWeight: '300',
                }}
              >
                {signal.content.reasoningChain}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Upgrade nudge for almanac fallback */}
      {signal.kind === 'almanac' && !isPro && onUpgrade ? (
        <Pressable
          onPress={onUpgrade}
          style={{
            borderTopWidth: 0.5,
            borderTopColor: ios.separator,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: ios.secondary, fontSize: 11, marginBottom: 4, letterSpacing: 0.5 }}>
            {t('signal_upgrade_label')}
          </Text>
          <Text style={{ color: ios.text, fontSize: 13, fontWeight: '500' }}>
            {t('paywall_upgrade')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
