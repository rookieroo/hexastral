/**
 * (new-site)/facing — step 2 of 4.
 *
 * Map (true north): drag gold / blue arrows. Outdoors: Record copies phone true heading.
 */

import { useHaptic } from '@zhop/core-ui'
import { FacingCalibrator, nudgeFengDeg, useSatelliteTile } from '@zhop/scenario-feng'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

interface HeadingSnapshot {
  trueDeg: number | null
  magDeg: number | null
  declination: number | null
}

const INIT: HeadingSnapshot = { trueDeg: null, magDeg: null, declination: null }

function diffDeg(a: number, b: number): number {
  let d = a - b
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

export default function FacingScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const locale = resolveLocale()
  const strings = useStrings(locale)
  const insets = useSafeAreaInsets()

  const [draftLat, setDraftLat] = useState<number | null>(null)
  const [draftLng, setDraftLng] = useState<number | null>(null)
  const [facingDeg, setFacingDeg] = useState<number>(180)
  const [doorDeg, setDoorDeg] = useState<number | undefined>(undefined)
  const [doorDifferent, setDoorDifferent] = useState(false)
  const [editTarget, setEditTarget] = useState<'face' | 'door'>('face')
  const [decl, setDecl] = useState<number>(0)
  const [heading, setHeading] = useState<HeadingSnapshot>(INIT)
  const haptic = useHaptic()

  const satellite = useSatelliteTile(draftLat, draftLng, { zoom: 17, size: 640 })
  const hasSatellite = Boolean(satellite.uri)

  useEffect(() => {
    void (async () => {
      const d = await loadDraft()
      if (typeof d.lat === 'number') setDraftLat(d.lat)
      if (typeof d.lng === 'number') setDraftLng(d.lng)
      if (typeof d.facingDegTrue === 'number') setFacingDeg(d.facingDegTrue)
      if (typeof d.magneticDeclination === 'number') setDecl(d.magneticDeclination)
      if (typeof d.doorDegTrue === 'number') {
        setDoorDifferent(true)
        setDoorDeg(d.doorDegTrue)
      }
    })()
  }, [])

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null
    let cancelled = false
    void (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync()
        if (perm.status !== 'granted') return
        sub = await Location.watchHeadingAsync((h) => {
          if (cancelled) return
          const mag = ((h.magHeading % 360) + 360) % 360
          const rawTrue = h.trueHeading
          const trueDeg =
            typeof rawTrue === 'number' && rawTrue >= 0 ? ((rawTrue % 360) + 360) % 360 : null
          const d = trueDeg !== null ? diffDeg(mag, trueDeg) : null
          setHeading({ trueDeg, magDeg: mag, declination: d })
          if (d !== null) setDecl(d)
        })
      } catch {
        // sensor unavailable
      }
    })()
    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [])

  const onFacingChange = useCallback(
    (deg: number) => {
      setFacingDeg(deg)
      void patchDraft({ facingDegTrue: deg, magneticDeclination: decl })
    },
    [decl]
  )

  const onDoorChange = useCallback((deg: number) => {
    setDoorDeg(deg)
    void patchDraft({ doorDegTrue: deg })
  }, [])

  const toggleDoorDifferent = (enabled: boolean) => {
    setDoorDifferent(enabled)
    if (enabled) {
      const initial = doorDeg ?? facingDeg
      setDoorDeg(initial)
      setEditTarget('face')
      void patchDraft({ doorDegTrue: initial })
    } else {
      setDoorDeg(undefined)
      setEditTarget('face')
      void patchDraft({ doorDegTrue: undefined })
    }
  }

  const captureHeading = (target: 'face' | 'door') => {
    if (heading.trueDeg === null) return
    void haptic('medium')
    const deg = Math.round(heading.trueDeg)
    if (target === 'door') {
      setDoorDeg(deg)
      void patchDraft({ doorDegTrue: deg })
    } else {
      setFacingDeg(deg)
      void patchDraft({
        facingDegTrue: deg,
        magneticDeclination: heading.declination ?? decl,
      })
    }
  }

  const nudge = (delta: number) => {
    void haptic('light')
    if (editTarget === 'door' && typeof doorDeg === 'number') {
      const next = nudgeFengDeg(doorDeg, delta)
      setDoorDeg(next)
      void patchDraft({ doorDegTrue: next })
    } else {
      const next = nudgeFengDeg(facingDeg, delta)
      setFacingDeg(next)
      void patchDraft({ facingDegTrue: next, magneticDeclination: decl })
    }
  }

  const next = async () => {
    const patch: Parameters<typeof patchDraft>[0] = {
      facingDegTrue: facingDeg,
      magneticDeclination: decl,
    }
    if (doorDifferent && typeof doorDeg === 'number') {
      patch.doorDegTrue = doorDeg
    }
    await patchDraft(patch)
    router.push('/(new-site)/building')
  }

  const satelliteSource = satellite.uri ? { uri: satellite.uri } : undefined
  const canCapture = heading.trueDeg !== null

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        backgroundColor: colors.bg,
        gap: spacing.md,
      }}
    >
      <ProgressIndicator step={2} total={4} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {strings.new_site_facing_title}
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMute, lineHeight: 21 }}>
        {strings.new_site_facing_subtitle}
      </Text>

      {doorDifferent ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['face', 'door'] as const).map((target) => {
            const active = editTarget === target
            const label =
              target === 'face'
                ? strings.new_site_facing_edit_building
                : strings.new_site_facing_edit_unit_door
            return (
              <Pressable
                key={target}
                onPress={() => setEditTarget(target)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.surface : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: active ? '700' : '500',
                    color: active ? colors.accent : colors.textMute,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 320,
            height: 320,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.surfaceMute,
          }}
        >
          {satellite.isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.accent} />
              <Text style={{ marginTop: spacing.sm, fontSize: 12, color: colors.textMute }}>
                {strings.new_site_facing_tile_loading}
              </Text>
            </View>
          ) : (
            <FacingCalibrator
              size={320}
              initialFacingDeg={facingDeg}
              onChange={onFacingChange}
              satelliteSource={satelliteSource}
              arrowColor={colors.arrowFace}
              showSitArrow={false}
              editTarget={editTarget}
              liveHeadingDeg={hasSatellite ? heading.trueDeg : null}
              ringRotation={hasSatellite ? 0 : (heading.magDeg ?? 0)}
              doorDeg={doorDifferent ? (doorDeg ?? facingDeg) : undefined}
              onDoorChange={doorDifferent ? onDoorChange : undefined}
            />
          )}
        </View>
        {hasSatellite ? (
          <Text
            style={{
              marginTop: spacing.sm,
              fontSize: 13,
              color: colors.textMute,
              textAlign: 'center',
            }}
          >
            {strings.new_site_facing_map_legend}
          </Text>
        ) : null}
      </View>

      {satellite.error && !satellite.isLoading ? (
        <Pressable onPress={() => void satellite.refetch()}>
          <Text style={{ fontSize: 13, color: colors.warning }}>
            {strings.new_site_facing_tile_error}
            {satellite.error.message ? ` (${satellite.error.message})` : ''} —{' '}
            {strings.new_site_facing_tile_retry}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 14, color: colors.textMute }}>
          {t(locale, 'new_site_facing_value', { deg: Math.round(facingDeg) })}
          {doorDifferent && typeof doorDeg === 'number'
            ? ` · ${t(locale, 'new_site_facing_door_value', { deg: Math.round(doorDeg) })}`
            : ''}
        </Text>
        <Pressable
          onPress={() => nudge(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>−1°</Text>
        </Pressable>
        <Pressable
          onPress={() => nudge(1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>+1°</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 13, color: colors.textMute }}>
        {strings.new_site_facing_capture_hint}
      </Text>

      <Pressable
        onPress={() => captureHeading(editTarget === 'door' ? 'door' : 'face')}
        disabled={!canCapture}
        style={{
          backgroundColor: canCapture ? colors.accent : colors.surfaceMute,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 16 }}>
          {editTarget === 'door' && doorDifferent
            ? strings.new_site_facing_capture_unit_door
            : strings.new_site_facing_capture_building}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
          {strings.new_site_facing_door_toggle}
        </Text>
        <Switch
          value={doorDifferent}
          onValueChange={toggleDoorDifferent}
          trackColor={{ false: colors.surfaceMute, true: colors.accent }}
        />
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={next}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: spacing.lg,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 16 }}>
          {strings.new_site_facing_next}
        </Text>
      </Pressable>
    </View>
  )
}
