/**
 * TimezoneGlobe — a GitHub-style rotatable Earth for picking a remote timezone
 * (2026-06 feedback: "let the user pick a point on the globe and compute the
 * timezone from it" instead of scanning a CJK-first city list).
 *
 * Orthographic projection drawn in Skia (the repo's canvas convention — see
 * BondsStarfield). Drag to spin, tap to drop a pin; the screen turns the pin's
 * longitude into a UTC offset (or snaps to a nearby city). City dots give the
 * sphere its "populated world" read. A slow idle auto-spin loads it like
 * GitHub's globe; it pauses on touch.
 *
 * The model is offset-only (no political TZ borders, no DST) — consistent with
 * lib/dual-tz's deliberate simplification.
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import type { GlobeCity } from '@/lib/dual-tz'

const DEG = Math.PI / 180

interface GlobeColors {
  bg: string
  text: string
  dim: string
  accent: string
  separator: string
  card: string
}

interface Projected {
  sx: number
  sy: number
  visible: boolean
  /** Depth front-to-back in [0,1] — 1 at the sphere center, 0 at the limb. */
  depth: number
}

/** Project a geographic point onto the orthographic sphere. */
function project(
  latDeg: number,
  lngDeg: number,
  lng0: number,
  lat0: number,
  R: number,
  cx: number,
  cy: number
): Projected {
  const phi = latDeg * DEG
  const lam = lngDeg * DEG
  const phi0 = lat0 * DEG
  const lam0 = lng0 * DEG
  const cosC =
    Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam - lam0)
  const x = R * Math.cos(phi) * Math.sin(lam - lam0)
  const y =
    R * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam - lam0))
  return { sx: cx + x, sy: cy - y, visible: cosC >= 0, depth: Math.max(0, cosC) }
}

/** Inverse: screen point → lat/lng, or null if the tap missed the sphere. */
function unproject(
  px: number,
  py: number,
  lng0: number,
  lat0: number,
  R: number,
  cx: number,
  cy: number
): { lat: number; lng: number } | null {
  const x = px - cx
  const y = -(py - cy)
  const rho = Math.hypot(x, y)
  if (rho > R) return null
  const phi0 = lat0 * DEG
  const lam0 = lng0 * DEG
  if (rho < 1e-6) return { lat: lat0, lng: lng0 }
  const c = Math.asin(Math.min(1, rho / R))
  const sinC = Math.sin(c)
  const cosC = Math.cos(c)
  const lat = Math.asin(cosC * Math.sin(phi0) + (y * sinC * Math.cos(phi0)) / rho) / DEG
  let lng =
    (lam0 + Math.atan2(x * sinC, rho * cosC * Math.cos(phi0) - y * sinC * Math.sin(phi0))) / DEG
  lng = ((((lng + 180) % 360) + 360) % 360) - 180
  return { lat, lng }
}

export function TimezoneGlobe({
  size,
  cities,
  picked,
  onPick,
  colors,
}: {
  size: number
  cities: ReadonlyArray<GlobeCity>
  picked: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
  colors: GlobeColors
}) {
  const R = size / 2 - 14
  const cx = size / 2
  const cy = size / 2

  const [lng0, setLng0] = useState(-20)
  const [lat0, setLat0] = useState(18)
  const lng0Ref = useRef(lng0)
  const lat0Ref = useRef(lat0)
  lng0Ref.current = lng0
  lat0Ref.current = lat0
  const interactingRef = useRef(false)

  // Idle auto-spin — loads like GitHub's globe; pauses while the user drags.
  useEffect(() => {
    const id = setInterval(() => {
      if (interactingRef.current) return
      setLng0((v) => ((v + 0.4 + 180) % 360) - 180)
    }, 50)
    return () => clearInterval(id)
  }, [])

  // Graticule (front-facing segments only), rebuilt as the globe turns.
  const graticule = useMemo(() => {
    const path = Skia.Path.Make()
    const addLine = (pts: Array<{ lat: number; lng: number }>) => {
      let pen = false
      for (const p of pts) {
        const pr = project(p.lat, p.lng, lng0, lat0, R, cx, cy)
        if (pr.visible) {
          if (pen) path.lineTo(pr.sx, pr.sy)
          else {
            path.moveTo(pr.sx, pr.sy)
            pen = true
          }
        } else {
          pen = false
        }
      }
    }
    for (let lng = -180; lng < 180; lng += 30) {
      const pts: Array<{ lat: number; lng: number }> = []
      for (let lat = -80; lat <= 80; lat += 8) pts.push({ lat, lng })
      addLine(pts)
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: Array<{ lat: number; lng: number }> = []
      for (let lng = -180; lng <= 180; lng += 8) pts.push({ lat, lng })
      addLine(pts)
    }
    return path
  }, [lng0, lat0, R, cx, cy])

  const dots = useMemo(
    () =>
      cities
        .map((c) => ({ c, pr: project(c.lat, c.lng, lng0, lat0, R, cx, cy) }))
        .filter((d) => d.pr.visible),
    [cities, lng0, lat0, R, cx, cy]
  )

  const pin = picked ? project(picked.lat, picked.lng, lng0, lat0, R, cx, cy) : null

  const startRef = useRef({ lng: 0, lat: 0 })
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin(() => {
          interactingRef.current = true
          startRef.current = { lng: lng0Ref.current, lat: lat0Ref.current }
        })
        .onUpdate((e) => {
          const nextLng = startRef.current.lng - e.translationX * 0.4
          setLng0((((nextLng % 360) + 540) % 360) - 180)
          setLat0(Math.max(-78, Math.min(78, startRef.current.lat + e.translationY * 0.4)))
        })
        .onFinalize(() => {
          interactingRef.current = false
        }),
    []
  )

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(260)
        .onEnd((e, success) => {
          if (!success) return
          const hit = unproject(e.x, e.y, lng0Ref.current, lat0Ref.current, R, cx, cy)
          if (!hit) return
          Haptics.selectionAsync().catch(() => {})
          onPick(hit.lat, hit.lng)
        }),
    [R, cx, cy, onPick]
  )

  const gesture = Gesture.Race(tap, pan)

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }}>
          {/* Sphere */}
          <Circle cx={cx} cy={cy} r={R} color={colors.card} />
          <Circle cx={cx} cy={cy} r={R} style='stroke' strokeWidth={1} color={colors.separator} />
          {/* Graticule */}
          <Path
            path={graticule}
            style='stroke'
            strokeWidth={0.7}
            color={colors.dim}
            opacity={0.4}
          />
          {/* City dots — fade toward the limb. */}
          <Group>
            {dots.map((d) => (
              <Circle
                key={d.c.label}
                cx={d.pr.sx}
                cy={d.pr.sy}
                r={1.6 + d.pr.depth * 1.6}
                color={colors.text}
                opacity={0.25 + d.pr.depth * 0.55}
              />
            ))}
          </Group>
          {/* Dropped pin. */}
          {pin?.visible ? (
            <Group>
              <Circle cx={pin.sx} cy={pin.sy} r={9} color={colors.accent} opacity={0.18} />
              <Circle cx={pin.sx} cy={pin.sy} r={4} color={colors.accent} />
              <Circle
                cx={pin.sx}
                cy={pin.sy}
                r={4}
                style='stroke'
                strokeWidth={1.2}
                color={colors.bg}
              />
            </Group>
          ) : null}
        </Canvas>
      </View>
    </GestureDetector>
  )
}
