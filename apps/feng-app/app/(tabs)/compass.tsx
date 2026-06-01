/**
 * (tabs)/compass — feng-app's in-app magnetic compass.
 *
 * Re-uses the shared `BaguaCompassOverlay` for the 8-direction overlay.
 * Pure utility — no separate Compass satellite (the standalone Compass app
 * was killed during Phase K matrix simplification, see ADR-0003 Reverted).
 */

import { BaguaCompassOverlay } from '@zhop/scenario-feng'
import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing, useFengTheme } from '@/lib/theme'

export default function CompassTab() {
  const insets = useSafeAreaInsets()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const [trueDeg, setTrueDeg] = useState<number | null>(null)
  const [magDeg, setMagDeg] = useState<number | null>(null)
  const [decl, setDecl] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null
    let cancelled = false
    void (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync()
        if (perm.status !== 'granted') {
          setError(t.compass_no_permission)
          return
        }
        sub = await Location.watchHeadingAsync((h) => {
          if (cancelled) return
          const mag = ((h.magHeading % 360) + 360) % 360
          const rawTrue = h.trueHeading
          const trueValue =
            typeof rawTrue === 'number' && rawTrue >= 0 ? ((rawTrue % 360) + 360) % 360 : null
          setMagDeg(mag)
          setTrueDeg(trueValue)
          if (trueValue !== null) {
            let d = mag - trueValue
            while (d > 180) d -= 360
            while (d < -180) d += 360
            setDecl(d)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [t.compass_no_permission])

  const heading = trueDeg ?? magDeg ?? 0

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: FENG_PALETTE.inkTeal,
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        alignItems: 'center',
        gap: spacing.lg,
      }}
    >
      <Text style={{ color: FENG_PALETTE.rice, fontSize: 14, opacity: 0.6, letterSpacing: 2 }}>
        {t.compass_heading_title.toUpperCase()}
      </Text>
      <Text style={{ color: FENG_PALETTE.copperGold, fontSize: 52, fontWeight: '300' }}>
        {Math.round(heading)}°
      </Text>

      <View style={{ width: 320, height: 320, alignItems: 'center', justifyContent: 'center' }}>
        <BaguaCompassOverlay
          size={320}
          rotation={-heading}
          showWedges
          showMountains
          showCardinals
          ringColor='rgba(245,239,227,0.5)'
          labelColor='rgba(245,239,227,0.85)'
          labelMajorColor={FENG_PALETTE.copperGold}
          cardinalColor={FENG_PALETTE.rice}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 11, letterSpacing: 1 }}>TRUE</Text>
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 18, fontWeight: '600' }}>
            {trueDeg !== null ? `${Math.round(trueDeg)}°` : '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 11, letterSpacing: 1 }}>
            MAGNETIC
          </Text>
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 18, fontWeight: '600' }}>
            {magDeg !== null ? `${Math.round(magDeg)}°` : '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 11, letterSpacing: 1 }}>
            DECLINATION
          </Text>
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 18, fontWeight: '600' }}>
            {decl !== null ? `${decl.toFixed(1)}°` : '—'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {error ? (
        <Text style={{ color: colors.warning, fontSize: 12, textAlign: 'center' }}>{error}</Text>
      ) : null}
    </View>
  )
}
