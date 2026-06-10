/**
 * /remote-tz — 外地时区 editor (2nd-level settings). A diaspora aid: track a second
 * timezone's 黄历 day boundary.
 *
 * 2026-06 redesign: the primary affordance is a rotatable globe — drag to spin,
 * tap a point, and the timezone is computed from that point's longitude (snapping
 * to a nearby city's real offset when there is one). The quick-pick city chips
 * remain as a fast path, but are no longer sorted CJK-first. The offset-only model
 * (no political TZ borders / DST) matches lib/dual-tz's deliberate simplification.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { TimezoneGlobe } from '@/components/TimezoneGlobe'
import {
  formatOffsetLabel,
  GLOBE_CITIES,
  getRemoteTz,
  nearestGlobeCity,
  offsetFromLongitude,
  REMOTE_TZ_CITY_PRESETS,
  setRemoteTz,
} from '@/lib/dual-tz'
import { useStrings } from '@/lib/i18n-context'

export default function RemoteTzScreen() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const { width } = useWindowDimensions()

  const [offset, setOffset] = useState<number | null>(null)
  const [label, setLabel] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    getRemoteTz()
      .then((tz) => {
        if (!tz) return
        setOffset(tz.offsetHours)
        setLabel(tz.label)
        // Seed the pin from a known city so a saved value shows on the globe.
        const city = GLOBE_CITIES.find((c) => c.label === tz.label)
        if (city) setCoords({ lat: city.lat, lng: city.lng })
      })
      .catch(() => {})
  }, [])

  const apply = (
    nextOffset: number,
    nextLabel: string,
    nextCoords: { lat: number; lng: number }
  ) => {
    setOffset(nextOffset)
    setLabel(nextLabel)
    setCoords(nextCoords)
    void setRemoteTz({ offsetHours: nextOffset, label: nextLabel })
  }

  const onPickPoint = (lat: number, lng: number) => {
    const city = nearestGlobeCity(lat, lng)
    if (city) {
      apply(city.offsetHours, city.label, { lat: city.lat, lng: city.lng })
    } else {
      const off = offsetFromLongitude(lng)
      apply(off, formatOffsetLabel(off), { lat, lng })
    }
  }

  const clear = () => {
    setOffset(null)
    setLabel('')
    setCoords(null)
    void setRemoteTz(null)
  }

  const globeSize = useMemo(() => Math.min(width - spacing.xl * 2, 320), [width, spacing.xl])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018) — iOS edge-swipe-back handles nav. */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.remoteTzSection}
        </Text>

        {/* Selected readout — city / UTC±N. */}
        <View style={{ minHeight: 44, justifyContent: 'center' }}>
          {offset === null ? (
            <Text style={{ color: colors.dim, fontSize: 13 }}>{t.remoteTzGlobeHint}</Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
                {label || formatOffsetLabel(offset)}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 14 }}>{formatOffsetLabel(offset)}</Text>
            </View>
          )}
        </View>

        {/* Globe picker. */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <TimezoneGlobe
            size={globeSize}
            cities={GLOBE_CITIES}
            picked={coords}
            onPick={onPickPoint}
            colors={colors}
          />
        </View>

        {/* Quick-pick city chips (no longer CJK-first). */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {REMOTE_TZ_CITY_PRESETS.map((preset) => {
            const isActive = offset === preset.offsetHours && label === preset.label
            return (
              <Pressable
                key={preset.id}
                onPress={() =>
                  apply(preset.offsetHours, preset.label, { lat: preset.lat, lng: preset.lng })
                }
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
