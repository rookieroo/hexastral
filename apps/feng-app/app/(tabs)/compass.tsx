/**
 * (tabs)/compass — feng-app's in-app magnetic compass.
 *
 * Clean instrument surface: no stack chrome / title. Leave via edge swipe
 * or Settings navigation.
 */

import * as Location from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LuopanDial } from '@/components/LuopanDial'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

export default function CompassTab() {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const t = useStrings(resolveLocale())
  // Maximize the 综合盘 to (near) full screen width — the instrument is the point —
  // but cap by height so the heading readouts below stay on screen.
  const dialSize = Math.round(Math.min(width - spacing.md * 2, height * 0.52))
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
    <View style={{ flex: 1, backgroundColor: FENG_PALETTE.night }}>
      <StatusBar style='light' />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <Text style={{ color: FENG_PALETTE.copperGold, fontSize: 52, fontWeight: '300' }}>
          {Math.round(heading)}°
        </Text>

        <View
          style={{
            width: dialSize,
            height: dialSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* the plate turns so its 子(north) mark holds geographic north */}
          <View style={{ transform: [{ rotate: `${-heading}deg` }] }}>
            <LuopanDial size={dialSize} detail='full' />
          </View>
          {/* fixed device-facing reference at the top */}
          <View
            style={{
              position: 'absolute',
              top: -2,
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: FENG_PALETTE.rice,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 11, letterSpacing: 1 }}>
              TRUE
            </Text>
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
          <Text style={{ color: FENG_PALETTE.cinnabar, fontSize: 12, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
