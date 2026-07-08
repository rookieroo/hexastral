/**
 * Shared facing / orient UI for the (new-site) locate step.
 */

import { useHaptic } from '@zhop/core-ui'
import { FacingCalibrator, nudgeFengDeg, pixelOffsetToLatLng, useSatelliteTile } from '@zhop/scenario-feng'
import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native'
import { MAP_ATTRIBUTION } from '@/components/AnnotatedMapSwiper'
import { resolveLocale, t, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

interface HeadingSnapshot {
  trueDeg: number | null
  magDeg: number | null
  declination: number | null
}

const INIT: HeadingSnapshot = { trueDeg: null, magDeg: null, declination: null }

const SAT_TILE_ZOOM = 17
const SAT_TILE_SIZE = 640

function effectiveSiteCoords(
  geocodeLat: number,
  geocodeLng: number,
  norm: { x: number; y: number }
): { lat: number; lng: number } {
  const dx = (norm.x - 0.5) * SAT_TILE_SIZE
  const dy = (norm.y - 0.5) * SAT_TILE_SIZE
  return pixelOffsetToLatLng(geocodeLat, geocodeLng, SAT_TILE_ZOOM, dx, dy)
}

function diffDeg(a: number, b: number): number {
  let d = a - b
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

export interface NewSiteFacingStepProps {
  onComplete: () => void
}

export function NewSiteFacingStep({ onComplete }: NewSiteFacingStepProps) {
  const { colors } = useFengTheme()
  const locale = resolveLocale()
  const strings = useStrings(locale)
  const haptic = useHaptic()

  const [draftLat, setDraftLat] = useState<number | null>(null)
  const [draftLng, setDraftLng] = useState<number | null>(null)
  const [geocodeLat, setGeocodeLat] = useState<number | null>(null)
  const [geocodeLng, setGeocodeLng] = useState<number | null>(null)
  const [buildingCenterNorm, setBuildingCenterNorm] = useState({ x: 0.5, y: 0.5 })
  const [facingDeg, setFacingDeg] = useState<number>(180)
  const [doorDeg, setDoorDeg] = useState<number | undefined>(undefined)
  const [doorDifferent, setDoorDifferent] = useState(false)
  const [editTarget, setEditTarget] = useState<'face' | 'door'>('face')
  const [decl, setDecl] = useState<number>(0)
  const [heading, setHeading] = useState<HeadingSnapshot>(INIT)
  const [facingConfirmed, setFacingConfirmed] = useState(false)
  const [facingError, setFacingError] = useState<string | null>(null)

  const satellite = useSatelliteTile(draftLat, draftLng, { zoom: SAT_TILE_ZOOM, size: SAT_TILE_SIZE })
  const hasSatellite = Boolean(satellite.uri)

  useEffect(() => {
    void (async () => {
      const d = await loadDraft()
      if (typeof d.lat === 'number') setDraftLat(d.lat)
      if (typeof d.lng === 'number') setDraftLng(d.lng)
      if (typeof d.geocodeLat === 'number') setGeocodeLat(d.geocodeLat)
      else if (typeof d.lat === 'number') setGeocodeLat(d.lat)
      if (typeof d.geocodeLng === 'number') setGeocodeLng(d.geocodeLng)
      else if (typeof d.lng === 'number') setGeocodeLng(d.lng)
      if (d.buildingCenterNorm) setBuildingCenterNorm(d.buildingCenterNorm)
      if (typeof d.facingDegTrue === 'number') setFacingDeg(d.facingDegTrue)
      if (typeof d.magneticDeclination === 'number') setDecl(d.magneticDeclination)
      if (typeof d.doorDegTrue === 'number') {
        setDoorDifferent(true)
        setDoorDeg(d.doorDegTrue)
      }
      if (d.facingConfirmed) setFacingConfirmed(true)
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
      setFacingConfirmed(true)
      setFacingError(null)
      void patchDraft({ facingDegTrue: deg, magneticDeclination: decl, facingConfirmed: true })
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
      setFacingConfirmed(true)
      setFacingError(null)
      void patchDraft({
        facingDegTrue: deg,
        magneticDeclination: heading.declination ?? decl,
        facingConfirmed: true,
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
      setFacingConfirmed(true)
      setFacingError(null)
      void patchDraft({ facingDegTrue: next, magneticDeclination: decl, facingConfirmed: true })
    }
  }

  const onBuildingCenterChange = useCallback(
    (norm: { x: number; y: number }) => {
      setBuildingCenterNorm(norm)
      if (geocodeLat == null || geocodeLng == null) return
      const { lat, lng } = effectiveSiteCoords(geocodeLat, geocodeLng, norm)
      setDraftLat(lat)
      setDraftLng(lng)
      void patchDraft({ lat, lng, buildingCenterNorm: norm })
    },
    [geocodeLat, geocodeLng]
  )

  const finish = async () => {
    const d = await loadDraft()
    if (!d.facingConfirmed && !facingConfirmed) {
      setFacingError(strings.new_site_facing_confirm_required)
      return
    }
    const patch: Parameters<typeof patchDraft>[0] = {
      facingDegTrue: facingDeg,
      magneticDeclination: decl,
      facingConfirmed: true,
    }
    if (doorDifferent && typeof doorDeg === 'number') {
      patch.doorDegTrue = doorDeg
    }
    await patchDraft(patch)
    onComplete()
  }

  const satelliteSource = satellite.uri ? { uri: satellite.uri } : undefined
  const canCapture = heading.trueDeg !== null
  const compassDelta =
    hasSatellite && heading.trueDeg !== null
      ? Math.abs(diffDeg(facingDeg, heading.trueDeg))
      : null
  const showCompassWarn = compassDelta !== null && compassDelta > 12

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
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
                accessibilityRole='button'
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
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
              buildingCenterNorm={buildingCenterNorm}
              onBuildingCenterChange={hasSatellite ? onBuildingCenterChange : undefined}
            />
          )}
        </View>
        {hasSatellite ? (
          <>
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
            <Text
              style={{
                marginTop: spacing.xs,
                fontSize: 12,
                color: colors.textMute,
                textAlign: 'center',
              }}
            >
              {strings.new_site_facing_building_pin}
            </Text>
            <Text
              style={{
                marginTop: spacing.xs,
                fontSize: 10,
                color: colors.textMute,
                opacity: 0.6,
                textAlign: 'center',
              }}
            >
              {MAP_ATTRIBUTION}
            </Text>
          </>
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

      {showCompassWarn && heading.trueDeg !== null ? (
        <Text style={{ fontSize: 13, color: colors.warning, lineHeight: 19 }}>
          {strings.new_site_facing_compass_warn
            .replace('{sat}', String(Math.round(facingDeg)))
            .replace('{compass}', String(Math.round(heading.trueDeg)))
            .replace('{delta}', String(Math.round(compassDelta ?? 0)))}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 14, color: colors.textMute }}>
          {t(locale, 'new_site_facing_value', { deg: Math.round(facingDeg) })}
          {doorDifferent && typeof doorDeg === 'number'
            ? ` · ${t(locale, 'new_site_facing_door_value', { deg: Math.round(doorDeg) })}`
            : ''}
        </Text>
        <Pressable onPress={() => nudge(-1)} accessibilityRole='button' accessibilityLabel='−1°'>
          <Text style={{ color: colors.text, fontWeight: '600' }}>−1°</Text>
        </Pressable>
        <Pressable onPress={() => nudge(1)} accessibilityRole='button' accessibilityLabel='+1°'>
          <Text style={{ color: colors.text, fontWeight: '600' }}>+1°</Text>
        </Pressable>
      </View>

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

      {facingError ? (
        <Text style={{ color: colors.warning, fontSize: 13, lineHeight: 20 }}>{facingError}</Text>
      ) : null}

      <Pressable
        onPress={() => void finish()}
        accessibilityRole='button'
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
