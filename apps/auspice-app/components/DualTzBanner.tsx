/**
 * Dual-timezone banner — Tier-1 audit #9. Reads the saved remote offset from
 * `@/lib/dual-tz`; renders a compact pill on Today **only when** the remote
 * calendar day differs from the device's local day. Hidden otherwise so the
 * sparse Today surface (ADR-0018) stays uncrowded the 99% of the time the
 * date matches.
 *
 * No prop drilling — the banner self-fetches state on mount and on
 * `useFocusEffect`, so Today can mount it inline as a one-liner.
 */

import { useTheme } from '@zhop/core-ui'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'

import { formatOffsetLabel, getRemoteTz, remoteDateIso, remoteDayDiffers } from '@/lib/dual-tz'
import { useStrings } from '@/lib/i18n-context'

export function DualTzBanner() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const [state, setState] = useState<{ label: string; date: string } | null>(null)

  const refresh = useCallback(() => {
    const localNow = new Date()
    getRemoteTz()
      .then((tz) => {
        if (!tz || !remoteDayDiffers(localNow, tz.offsetHours)) {
          setState(null)
          return
        }
        setState({
          label: tz.label.trim() || formatOffsetLabel(tz.offsetHours),
          date: remoteDateIso(localNow, tz.offsetHours),
        })
      })
      .catch(() => setState(null))
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  if (state === null) return null

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        // Match the Today screen's content margin (spacing.xl) so the chip lines
        // up with the day header / calendar / 宜忌 columns below it. Without this
        // it sits flush to the screen edge and reads as broken alignment.
        marginLeft: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: colors.accent,
        backgroundColor: colors.accentGhost,
      }}
      accessibilityLabel={`${state.label} ${t.remoteTzNow} ${state.date}`}
    >
      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
        {state.label}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 12 }}>{t.remoteTzNow}</Text>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>{state.date}</Text>
    </View>
  )
}
