/**
 * /remote-tz — 外地时区 editor (2nd-level settings). A diaspora aid: track a second
 * timezone's 黄历 day boundary by picking a preset city, or clear it. Moved out of
 * Me (2026-06) so the niche setting gets its own page instead of an inline accordion.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getRemoteTz, REMOTE_TZ_CITY_PRESETS, setRemoteTz } from '@/lib/dual-tz'
import { useStrings } from '@/lib/i18n-context'

export default function RemoteTzScreen() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const [offset, setOffset] = useState<number | null>(null)
  const [city, setCity] = useState('')

  useEffect(() => {
    getRemoteTz()
      .then((tz) => {
        if (tz) {
          setOffset(tz.offsetHours)
          setCity(tz.label)
        }
      })
      .catch(() => {})
  }, [])

  const selectPreset = (preset: { label: string; offsetHours: number }) => {
    setOffset(preset.offsetHours)
    setCity(preset.label)
    void setRemoteTz({ offsetHours: preset.offsetHours, label: preset.label })
  }
  const clear = () => {
    setOffset(null)
    setCity('')
    void setRemoteTz(null)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018) — iOS edge-swipe-back handles nav. */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.remoteTzSection}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {REMOTE_TZ_CITY_PRESETS.map((preset) => {
            const isActive = offset === preset.offsetHours && city === preset.label
            return (
              <Pressable
                key={preset.id}
                onPress={() => selectPreset(preset)}
                accessibilityRole='button'
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: 0.5,
                  borderColor: isActive ? colors.accent : colors.separator,
                  backgroundColor: isActive ? colors.accent : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#fff' : colors.text,
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {preset.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable
          onPress={clear}
          accessibilityRole='button'
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.md,
            paddingVertical: 8,
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: colors.separator,
          }}
        >
          <Text style={{ color: colors.dim, fontSize: 13 }}>{t.remoteTzClear}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
