/**
 * BondsStarfield — ECharts webkit-dep style force graph with semantic zoom.
 *
 * Visual design: monochrome zinc palette. Edge lines only (no arrowheads),
 * clean filled circles with thin stroke rings — inspired by ECharts
 * graph-webkit-dep hub layout (WebGLRenderingContext = central hub).
 *
 * Semantic zoom levels (continuous cross-fade):
 *   • s < 0.70  → dot        (filled circle + first character centered inside)
 *   • 0.60–1.10 → chip       (name label below node)
 *   • 1.00–1.60 → card       (small card below: name + rel + vibe + grade)
 *   • s > 1.50  → detail     (expanded card: archetype, synastry, stage)
 *
 * Architecture:
 *   • Skia Canvas      → background, nebulae, stars, edge lines, node circles
 *   • RN View layer    → semantic label/card overlays (absolute positioned)
 *   • Reanimated v4    → useSharedValue for scale/pan (UI thread)
 *   • rAF loop         → syncs shared values → React state (ZoomState)
 *   • Pure-TS force    → settled layout, computed once at mount (no ESM deps)
 *   • RNGH             → Simultaneous(Pinch, Race(Tap, Pan))
 *
 * NaN safety: all layout math gated on W > 0 && H > 0.
 */

import { Canvas, Circle, Fill, Group, Line, RadialGradient, vec } from '@shopify/react-native-skia'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  BOND_SELF,
  buildDemoBonds,
  LABEL_KEY_MAP,
} from '@/components/bonds/bonds-constellation-data'
import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
import type { BondData } from '@/lib/domain/bonds'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.3
const ZOOM_MAX = 3.2
const SELF_R = 24 // world-space radius of self hub
const NODE_R = 16 // world-space radius of bond nodes
const HIT_PAD = 14 // extra hit radius beyond NODE_R

// Semantic zoom crossfade thresholds (world scale s)
const S_DOT_FADE_OUT = 0.8
const S_CHIP_FADE_IN = 0.6
const S_CHIP_FADE_OUT = 1.0 // chip gone before card appears
const S_CARD_FADE_IN = 1.1 // card starts after chip is gone
const S_DETAIL_FADE_IN = 1.6

const cl = (x: number) => Math.max(0, Math.min(1, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * cl(t)

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

type TFn = (key: TranslationKeys, params?: Record<string, string | number>) => string

function vibeLabel(score: number | null, t: TFn): string {
  if (score == null) return '—'
  if (score >= 95) return t('bonds_vibe_chosen')
  if (score >= 90) return t('bonds_vibe_contract')
  if (score >= 85) return t('bonds_vibe_fated')
  if (score >= 80) return t('bonds_vibe_sync')
  if (score >= 75) return t('bonds_vibe_tacit')
  if (score >= 70) return t('bonds_vibe_attract')
  if (score >= 65) return t('bonds_vibe_spark')
  if (score >= 60) return t('bonds_vibe_affinity')
  if (score >= 50) return t('bonds_vibe_plain')
  return t('bonds_vibe_effort')
}

function gradeHighlight(grade: string | null): boolean {
  return grade === 'S' || grade === 'A+' || grade === 'A'
}

/** Deterministic background star positions */
function makeStars(w: number, h: number, count = 88) {
  return Array.from({ length: count }, (_, i) => ({
    x: ((i * 41 + 17) % 100) * w * 0.01,
    y: ((i * 61 + 11) % 100) * h * 0.01,
    r: i % 7 === 0 ? 1.6 : i % 3 === 0 ? 0.9 : 0.45,
    bright: i % 13 === 0,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Force layout  (pure TS — no external deps)
// replaces d3-force (ESM-only, "type":"module" → Metro/Hermes crash)
// ─────────────────────────────────────────────────────────────────────────────

interface FNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

function runForceLayout(
  bonds: BondData[],
  selfX: number,
  selfY: number,
  w: number,
  h: number
): Record<string, { x: number; y: number }> {
  if (bonds.length === 0 || w <= 0 || h <= 0) return {}

  const nodes: FNode[] = bonds.map((b, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / bonds.length
    const radius = Math.min(w, h) * 0.16
    return {
      id: b.id,
      x: selfX + radius * Math.cos(angle),
      y: selfY + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    }
  })

  const CHARGE = -900
  const CX = w * 0.5
  const CY = h * 0.44
  const MIN_DIST = NODE_R * 4.0
  let alpha = 0.22

  for (let t = 0; t < 160; t++) {
    alpha *= 0.974

    // Many-body repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i]
        const nj = nodes[j]
        if (!ni || !nj) continue
        const dx = nj.x - ni.x
        const dy = nj.y - ni.y
        const d2 = Math.max(dx * dx + dy * dy, 1)
        const f = (CHARGE * alpha) / d2
        ni.vx += dx * f
        ni.vy += dy * f
        nj.vx -= dx * f
        nj.vy -= dy * f
      }
    }

    // Center gravity — stronger on Y axis to fight portrait spread
    for (const n of nodes) {
      n.vx += (CX - n.x) * 0.06 * alpha
      n.vy += (CY - n.y) * 0.09 * alpha
    }

    // Collision avoidance
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i]
        const nj = nodes[j]
        if (!ni || !nj) continue
        const dx = nj.x - ni.x
        const dy = nj.y - ni.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const over = MIN_DIST - dist
        if (over > 0) {
          const f = (over / dist) * 0.55 * alpha
          ni.vx -= dx * f
          ni.vy -= dy * f
          nj.vx += dx * f
          nj.vy += dy * f
        }
      }
    }

    // Integrate
    for (const n of nodes) {
      n.vx *= 0.55
      n.vy *= 0.55
      n.x += n.vx
      n.y += n.vy
    }
  }

  const pad = NODE_R * 4.5
  const out: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) {
    out[n.id] = {
      x: Math.max(pad, Math.min(w - pad, n.x)),
      y: Math.max(pad, Math.min(h - pad, n.y)),
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  bonds?: BondData[]
  activeNode?: string | null
  onNodePress?: (id: string) => void
  onClose: () => void
  avatarIndex?: number
  userAvatarUri?: string | null
  isDemo?: boolean
}

interface ZoomState {
  dot: number // dot phase (s < 0.76)
  chip: number // chip label below node
  card: number // card body
  detail: number // detail row
  s: number // current scale
  px: number // current pan x
  py: number // current pan y
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BondsStarfield({
  bonds = [],
  activeNode = null,
  onNodePress,
  onClose,
  avatarIndex = 0,
  userAvatarUri = null,
  isDemo,
}: Props) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const { width: W, height: H } = useWindowDimensions()

  const showDemo = isDemo ?? bonds.length === 0
  const demoBonds = useMemo(() => buildDemoBonds(t), [t])
  const displayBonds: BondData[] = showDemo ? demoBonds : bonds

  const selfX = BOND_SELF.x * W
  const selfY = BOND_SELF.y * H

  // ── Force layout ────────────────────────────────────────────────────────
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const posRef = useRef<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    if (W <= 0 || H <= 0) return
    const settled = runForceLayout(displayBonds, selfX, selfY, W, H)
    posRef.current = settled
    setPositions(settled)
  }, [displayBonds.length, W, H, displayBonds, selfY, selfX]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag offsets ────────────────────────────────────────────────────────
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const dragOffsetsRef = useRef<Record<string, { x: number; y: number }>>({})

  // ── Zoom / Pan (Reanimated UI thread) ───────────────────────────────────
  const vScale = useSharedValue(1.0)
  const panX = useSharedValue(0.0)
  const panY = useSharedValue(0.0)
  const scaleBase = useSharedValue(1.0)
  const panXBase = useSharedValue(0.0)
  const panYBase = useSharedValue(0.0)

  // ── Drag (JS thread refs) ────────────────────────────────────────────────
  const draggingRef = useRef<string | null>(null)
  const dragWorldStart = useRef({ x: 0, y: 0 })
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // ── Semantic zoom state (rAF bridged) ────────────────────────────────────
  const [zoom, setZoom] = useState<ZoomState>({
    dot: 1,
    chip: 0,
    card: 0,
    detail: 0,
    s: 0.68,
    px: 0,
    py: 0,
  })
  const zoomRef = useRef(zoom)
  const rafRef = useRef<number | null>(null)

  // Initialise shared values to match default zoom level
  useEffect(() => {
    vScale.value = 0.68
  }, [vScale]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tick = () => {
      const s = vScale.value
      const px = panX.value
      const py = panY.value
      const prev = zoomRef.current

      if (
        Math.abs(s - prev.s) < 0.003 &&
        Math.abs(px - prev.px) < 0.3 &&
        Math.abs(py - prev.py) < 0.3
      ) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const dot = cl((S_DOT_FADE_OUT - s) / 0.14)
      const chip = cl((s - S_CHIP_FADE_IN) / 0.14) * cl((S_CHIP_FADE_OUT - s) / 0.12)
      const card = cl((s - S_CARD_FADE_IN) / 0.15)
      const detail = cl((s - S_DETAIL_FADE_IN) / 0.12)

      const next: ZoomState = { dot, chip, card, detail, s, px, py }
      zoomRef.current = next
      setZoom(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [panX.value, vScale.value, panY.value]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coordinate transforms ────────────────────────────────────────────────
  const w2s = (wx: number, wy: number, sc: number, opx: number, opy: number) => {
    const cx = W / 2
    const cy = H / 2
    return { sx: (wx - cx) * sc + cx + opx, sy: (wy - cy) * sc + cy + opy }
  }
  const s2w = (sx: number, sy: number, sc: number, opx: number, opy: number) => {
    const cx = W / 2
    const cy = H / 2
    return { wx: (sx - opx - cx) / sc + cx, wy: (sy - opy - cy) / sc + cy }
  }

  // ── Hit test ─────────────────────────────────────────────────────────────
  const hitTest = (screenX: number, screenY: number): string | null => {
    const { wx, wy } = s2w(screenX, screenY, vScale.value, panX.value, panY.value)
    for (const bond of displayBonds) {
      const base = posRef.current[bond.id]
      if (!base) continue
      const off = dragOffsetsRef.current[bond.id]
      const nx = base.x + (off?.x ?? 0)
      const ny = base.y + (off?.y ?? 0)
      if (Math.hypot(wx - nx, wy - ny) < NODE_R + HIT_PAD) return bond.id
    }
    return null
  }

  // ── Animate to scale ─────────────────────────────────────────────────────
  const animateTo = (targetS: number, targetPx = 0, targetPy = 0) => {
    vScale.value = withTiming(targetS, { duration: 340 })
    panX.value = withTiming(targetPx, { duration: 340 })
    panY.value = withTiming(targetPy, { duration: 340 })
  }

  // ── Stars ────────────────────────────────────────────────────────────────
  const stars = useMemo(() => makeStars(W, H), [W, H])

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const bg = isDark ? '#09090B' : '#FAFAFA'
  const accent = isDark ? '#C4A882' : '#3C2415'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardTxt = isDark ? '#FAFAFA' : '#09090B'
  const cardDim = isDark ? '#71717A' : '#A1A1AA'
  const nodeFill = isDark ? '#27272A' : '#E4E4E7'
  const nodeStroke = isDark ? '#3F3F46' : '#D4D4D8'
  const selfFill = isDark ? 'rgba(196,168,130,0.48)' : 'rgba(60,36,21,0.35)'
  const selfGlow = isDark ? 'rgba(196,168,130,0.22)' : 'rgba(60,36,21,0.14)'
  const lineIdle = isDark ? 'rgba(113,113,122,0.28)' : 'rgba(113,113,122,0.22)'
  const lineActive = isDark ? 'rgba(196,168,130,0.65)' : 'rgba(60,36,21,0.55)'
  const lineHigh = isDark ? 'rgba(196,168,130,0.38)' : 'rgba(60,36,21,0.30)'
  const starDim = isDark ? 'rgba(250,250,250,0.055)' : 'rgba(9,9,11,0.040)'
  const starBrt = isDark ? 'rgba(250,250,250,0.18)' : 'rgba(9,9,11,0.10)'

  // ── Gestures ─────────────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      scaleBase.value = vScale.value
    })
    .onUpdate((e) => {
      vScale.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scaleBase.value * e.scale))
    })
    .onEnd(() => {
      runOnJS(Haptics.selectionAsync)()
    })

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .onStart((e) => {
      panXBase.value = panX.value
      panYBase.value = panY.value
      const id = hitTest(e.x, e.y)
      if (id) {
        draggingRef.current = id
        setDraggingId(id)
        const base = posRef.current[id]
        const off = dragOffsetsRef.current[id]
        dragWorldStart.current = {
          x: (base?.x ?? 0) + (off?.x ?? 0),
          y: (base?.y ?? 0) + (off?.y ?? 0),
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    })
    .onUpdate((e) => {
      const id = draggingRef.current
      if (id) {
        const sc = vScale.value
        const worldDx = e.translationX / sc
        const worldDy = e.translationY / sc
        const base = posRef.current[id]
        if (!base) return
        const offsets = { ...dragOffsetsRef.current }
        offsets[id] = {
          x: dragWorldStart.current.x - base.x + worldDx,
          y: dragWorldStart.current.y - base.y + worldDy,
        }
        dragOffsetsRef.current = offsets
        setDragOffsets({ ...offsets })
      } else {
        panX.value = panXBase.value + e.translationX
        panY.value = panYBase.value + e.translationY
      }
    })
    .onEnd(() => {
      draggingRef.current = null
      setDraggingId(null)
    })

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(240)
    .onEnd((e, success) => {
      if (!success) return
      const id = hitTest(e.x, e.y)
      if (!id) return
      onNodePress?.(id)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    })

  const gesture = Gesture.Simultaneous(pinchGesture, Gesture.Race(tapGesture, panGesture))

  // ── Computed render values ───────────────────────────────────────────────
  const { s, px, py, dot, chip, card, detail } = zoom
  const fs = s ** 0.58

  const nodeWorldPos = (bondId: string) => {
    const base = positions[bondId]
    const off = dragOffsets[bondId]
    return {
      wx: (base?.x ?? selfX) + (off?.x ?? 0),
      wy: (base?.y ?? selfY) + (off?.y ?? 0),
    }
  }

  const selfPt = w2s(selfX, selfY, s, px, py)

  // ── Skia render data ─────────────────────────────────────────────────────
  const skiaData = useMemo(() => {
    if (W <= 0 || H <= 0) return []
    const { sx: ssx, sy: ssy } = w2s(selfX, selfY, s, px, py)
    return displayBonds.map((bond) => {
      const { wx, wy } = nodeWorldPos(bond.id)
      const { sx: bsx, sy: bsy } = w2s(wx, wy, s, px, py)
      return {
        bond,
        bsx,
        bsy,
        ssx,
        ssy,
        isActive: activeNode === bond.id,
        highScore: bond.score != null && bond.score >= 80,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, px, py, activeNode, displayBonds, selfX, selfY, W, H, w2s, nodeWorldPos])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1, backgroundColor: bg }}>
          {/* ── Skia GPU Canvas ── */}
          <Canvas style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
            <Fill color={bg} />

            {/* Ambient nebula glows */}
            <Circle cx={W * 0.15} cy={H * 0.22} r={W * 0.52}>
              <RadialGradient
                c={vec(W * 0.15, H * 0.22)}
                r={W * 0.52}
                colors={[
                  isDark ? 'rgba(196,168,130,0.030)' : 'rgba(60,36,21,0.016)',
                  'transparent',
                ]}
              />
            </Circle>
            <Circle cx={W * 0.88} cy={H * 0.78} r={W * 0.46}>
              <RadialGradient
                c={vec(W * 0.88, H * 0.78)}
                r={W * 0.46}
                colors={[isDark ? 'rgba(100,80,55,0.022)' : 'rgba(60,36,21,0.010)', 'transparent']}
              />
            </Circle>

            {/* Background stars (mild parallax drift) */}
            {stars.map((star, i) => {
              const { sx, sy } = w2s(star.x, star.y, s ** 0.12, px * 0.06, py * 0.06)
              return (
                <Circle
                  key={`st-${i}`}
                  cx={sx}
                  cy={sy}
                  r={star.r * s ** 0.18}
                  color={star.bright ? starBrt : starDim}
                />
              )
            })}

            {/* ── Edge lines — webkit-dep style: thin strokes, opacity by score ── */}
            {skiaData.map(({ bond, bsx, bsy, ssx, ssy, isActive, highScore }) => {
              const isPend = bond.status === 'pending_invite'
              return (
                <Line
                  key={`ln-${bond.id}`}
                  p1={vec(ssx, ssy)}
                  p2={vec(bsx, bsy)}
                  color={
                    isPend
                      ? isDark
                        ? 'rgba(82,82,91,0.14)'
                        : 'rgba(113,113,122,0.10)'
                      : isActive
                        ? lineActive
                        : highScore
                          ? lineHigh
                          : lineIdle
                  }
                  strokeWidth={isActive ? 1.5 : highScore ? 0.9 : 0.6}
                  style='stroke'
                />
              )
            })}

            {/* ── Node glow halos (high-score / active) ── */}
            {skiaData.map(({ bond, bsx, bsy, isActive, highScore }) =>
              isActive || highScore ? (
                <Circle key={`hl-${bond.id}`} cx={bsx} cy={bsy} r={NODE_R * s * 2.6}>
                  <RadialGradient
                    c={vec(bsx, bsy)}
                    r={NODE_R * s * 2.6}
                    colors={[
                      isActive
                        ? isDark
                          ? 'rgba(196,168,130,0.22)'
                          : 'rgba(60,36,21,0.16)'
                        : isDark
                          ? 'rgba(196,168,130,0.12)'
                          : 'rgba(60,36,21,0.09)',
                      'transparent',
                    ]}
                  />
                </Circle>
              ) : null
            )}

            {/* ── Node visual: fades out BEFORE card starts to avoid simultaneous overlap ── */}
            <Group opacity={cl((S_CARD_FADE_IN - s) / 0.15)}>
              {/* ── Node outer ring — webkit-dep thin stroke circle ── */}
              {skiaData.map(({ bond, bsx, bsy, isActive, highScore }) => (
                <Circle
                  key={`ring-${bond.id}`}
                  cx={bsx}
                  cy={bsy}
                  r={NODE_R * s * 1.52}
                  color={
                    isActive
                      ? isDark
                        ? 'rgba(196,168,130,0.30)'
                        : 'rgba(60,36,21,0.24)'
                      : highScore
                        ? isDark
                          ? 'rgba(196,168,130,0.14)'
                          : 'rgba(60,36,21,0.10)'
                        : isDark
                          ? 'rgba(82,82,91,0.10)'
                          : 'rgba(113,113,122,0.08)'
                  }
                  style='stroke'
                  strokeWidth={isActive ? 0.8 : 0.45}
                />
              ))}

              {/* ── Node fill circles ── */}
              {skiaData.map(({ bond, bsx, bsy }) => (
                <Circle key={`nc-${bond.id}`} cx={bsx} cy={bsy} r={NODE_R * s} color={nodeFill} />
              ))}

              {/* ── Node border stroke ── */}
              {skiaData.map(({ bond, bsx, bsy, isActive, highScore }) => (
                <Circle
                  key={`nb-${bond.id}`}
                  cx={bsx}
                  cy={bsy}
                  r={NODE_R * s}
                  color={
                    isActive
                      ? accent
                      : highScore
                        ? isDark
                          ? 'rgba(196,168,130,0.45)'
                          : 'rgba(60,36,21,0.38)'
                        : nodeStroke
                  }
                  style='stroke'
                  strokeWidth={isActive ? 1.4 : 0.7}
                />
              ))}
            </Group>

            {/* ── Self node — outer wide glow ── */}
            <Circle cx={selfPt.sx} cy={selfPt.sy} r={SELF_R * s * 3.2}>
              <RadialGradient
                c={vec(selfPt.sx, selfPt.sy)}
                r={SELF_R * s * 3.2}
                colors={[selfGlow, 'transparent']}
              />
            </Circle>

            {/* ── Self node — orbit rings (hub aesthetic) ── */}
            <Circle
              cx={selfPt.sx}
              cy={selfPt.sy}
              r={(SELF_R + 9) * s}
              color={accent}
              style='stroke'
              strokeWidth={0.6}
            />
            <Circle
              cx={selfPt.sx}
              cy={selfPt.sy}
              r={(SELF_R + 16) * s}
              color={isDark ? 'rgba(196,168,130,0.12)' : 'rgba(60,36,21,0.09)'}
              style='stroke'
              strokeWidth={0.35}
            />

            {/* ── Self node fill ── */}
            <Circle cx={selfPt.sx} cy={selfPt.sy} r={SELF_R * s} color={selfFill} />

            {/* ── Self node border ── */}
            <Circle
              cx={selfPt.sx}
              cy={selfPt.sy}
              r={SELF_R * s}
              color={accent}
              style='stroke'
              strokeWidth={1.4}
            />
          </Canvas>

          {/* ──────────────────────────────────────────────────────────────────
              Bond node semantic overlays
              Each node: dot inside Pressable + chip/card below
          ─────────────────────────────────────────────────────────────────── */}
          {displayBonds.map((bond) => {
            const { wx, wy } = nodeWorldPos(bond.id)
            const { sx: bsx, sy: bsy } = w2s(wx, wy, s, px, py)
            const isActive = activeNode === bond.id
            const isDragging = draggingId === bond.id
            const highScore = bond.score != null && bond.score >= 80
            const isPending = bond.status === 'pending_invite'
            const labelKey = LABEL_KEY_MAP[bond.relationshipLabel]
            const relLabel = labelKey ? t(labelKey) : bond.relationshipLabel
            const vibe = vibeLabel(bond.score, t)
            const cardW = lerp(0, 200, cl((s - S_CARD_FADE_IN) / 0.5))
            const hitR = NODE_R * s + HIT_PAD
            // Pressable expands to accommodate card centered at node
            const CARD_HALF_H = 58
            const pressHalfW = card > 0.02 ? Math.max(hitR, cardW / 2 + 4) : hitR
            const pressHalfH = card > 0.02 ? Math.max(hitR, CARD_HALF_H) : hitR

            return (
              <View
                key={`nd-${bond.id}`}
                style={{
                  position: 'absolute',
                  left: bsx - pressHalfW,
                  top: bsy - pressHalfH,
                  width: pressHalfW * 2,
                  height: pressHalfH * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isDragging ? 0.75 : 1,
                  zIndex: isDragging ? 10 : isActive ? 5 : 1,
                }}
              >
                {/* Dot: single initial inside node circle */}
                {dot > 0.02 ? (
                  <Text
                    style={{
                      fontSize: Math.max(8, NODE_R * s * 0.68),
                      fontWeight: '300',
                      color: isActive ? accent : isDark ? '#A1A1AA' : '#52525B',
                      opacity: dot,
                      textAlign: 'center',
                    }}
                  >
                    {bond.targetName.charAt(0)}
                  </Text>
                ) : null}

                {/* Chip: name label just below node circle — hidden when card shows */}
                {chip > 0.02 && card < 0.02 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: hitR + NODE_R * s + 6,
                      left: -(60 * Math.min(s, 1)),
                      width: 120 * Math.min(s, 1),
                      alignItems: 'center',
                      opacity: chip,
                      pointerEvents: 'none',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: Math.max(8, 11 * Math.min(fs, 1.0)),
                        fontWeight: '500',
                        color: isActive ? accent : cardTxt,
                        letterSpacing: 0.2,
                      }}
                    >
                      {bond.targetName}
                    </Text>
                  </View>
                ) : null}

                {/* Card: centered AT node — node transforms into card as you zoom in */}
                {card > 0.02 ? (
                  <View
                    style={{
                      width: cardW,
                      backgroundColor: cardBg,
                      borderRadius: 8,
                      borderWidth: isActive ? 1.2 : 0.6,
                      borderColor: isActive
                        ? accent
                        : highScore
                          ? isDark
                            ? 'rgba(196,168,130,0.32)'
                            : 'rgba(60,36,21,0.26)'
                          : isDark
                            ? '#3F3F46'
                            : '#D4D4D8',
                      padding: 10,
                      opacity: card,
                      shadowColor: isActive ? accent : '#000',
                      shadowOffset: { width: 0, height: isActive ? 0 : 2 },
                      shadowOpacity: isActive ? 0.45 : 0.08,
                      shadowRadius: isActive ? 10 : 3,
                      pointerEvents: 'none',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12 * Math.min(fs, 1.2),
                        fontWeight: '600',
                        color: isActive ? accent : cardTxt,
                        letterSpacing: 0.3,
                      }}
                    >
                      {bond.targetName}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 9 * Math.min(fs, 1.2),
                        fontWeight: '300',
                        color: cardDim,
                        letterSpacing: 1.1,
                        textTransform: 'uppercase',
                        marginTop: 2 * Math.min(fs, 1.2),
                      }}
                    >
                      {relLabel}
                    </Text>

                    {bond.score != null ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6 * Math.min(fs, 1.2),
                          marginTop: 5 * Math.min(fs, 1.2),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12 * Math.min(fs, 1.2),
                            fontWeight: '400',
                            color: accent,
                          }}
                        >
                          {vibe}
                        </Text>
                        {bond.grade ? (
                          <View
                            style={{
                              paddingHorizontal: 5 * Math.min(fs, 1.2),
                              paddingVertical: 1.5 * Math.min(fs, 1.2),
                              backgroundColor: isDark
                                ? 'rgba(196,168,130,0.12)'
                                : 'rgba(60,36,21,0.07)',
                              borderRadius: 3,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10 * Math.min(fs, 1.2),
                                fontWeight: '700',
                                color: gradeHighlight(bond.grade) ? '#D4A853' : accent,
                              }}
                            >
                              {bond.grade}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : isPending ? (
                      <Text
                        style={{
                          fontSize: 9 * Math.min(fs, 1.2),
                          fontWeight: '300',
                          color: cardDim,
                          marginTop: 4 * Math.min(fs, 1.2),
                        }}
                      >
                        {t('bond_status_pending')}
                      </Text>
                    ) : null}

                    <Text
                      style={{
                        fontSize: 7.5 * Math.min(fs, 1.2),
                        fontWeight: '300',
                        color: cardDim,
                        letterSpacing: 1.3,
                        textTransform: 'uppercase',
                        marginTop: 3 * Math.min(fs, 1.2),
                      }}
                    >
                      {bond.mode === 'solo' ? t('bond_mode_solo') : t('bond_mode_resonance')}
                    </Text>

                    {detail > 0.02 ? (
                      <View style={{ opacity: detail, marginTop: 8 * Math.min(fs, 1.2) }}>
                        <View
                          style={{
                            height: 0.5,
                            backgroundColor: isDark
                              ? 'rgba(82,82,91,0.28)'
                              : 'rgba(113,113,122,0.20)',
                            marginBottom: 6 * Math.min(fs, 1.2),
                          }}
                        />
                        {bond.archetypeName ? (
                          <>
                            <Text
                              style={{
                                fontSize: 11 * Math.min(fs, 1.2),
                                fontWeight: '500',
                                color: cardTxt,
                              }}
                            >
                              {bond.archetypeName}
                            </Text>
                            {bond.archetypeTagline ? (
                              <Text
                                style={{
                                  fontSize: 9 * Math.min(fs, 1.2),
                                  fontWeight: '300',
                                  color: cardDim,
                                  marginTop: 2 * Math.min(fs, 1.2),
                                  lineHeight: 13 * Math.min(fs, 1.2),
                                }}
                              >
                                {bond.archetypeTagline}
                              </Text>
                            ) : null}
                          </>
                        ) : null}
                        {bond.todaySynastry ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              gap: 12 * Math.min(fs, 1.2),
                              marginTop: 6 * Math.min(fs, 1.2),
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12 * Math.min(fs, 1.2),
                                fontWeight: '200',
                                color: accent,
                              }}
                            >
                              {'\u2191'} {bond.todaySynastry.synergy}%
                            </Text>
                            <Text
                              style={{
                                fontSize: 12 * Math.min(fs, 1.2),
                                fontWeight: '200',
                                color: cardDim,
                              }}
                            >
                              {'\u2193'} {bond.todaySynastry.friction}%
                            </Text>
                          </View>
                        ) : null}
                        {bond.relationshipStage ? (
                          <Text
                            style={{
                              fontSize: 7 * Math.min(fs, 1.2),
                              fontWeight: '300',
                              color: cardDim,
                              letterSpacing: 2,
                              textTransform: 'uppercase',
                              marginTop: 5 * Math.min(fs, 1.2),
                            }}
                          >
                            {bond.relationshipStage}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          })}

          {/* ── Self node labels ── */}
          {(() => {
            const hitR = SELF_R * s + HIT_PAD
            const cardW = lerp(0, 160, cl((s - S_CARD_FADE_IN) / 0.5))
            const SELF_CARD_HALF_H = 44
            const pressHalfW = card > 0.02 ? Math.max(hitR, cardW / 2 + 4) : hitR
            const pressHalfH = card > 0.02 ? Math.max(hitR, SELF_CARD_HALF_H) : hitR
            return (
              <View
                style={{
                  position: 'absolute',
                  left: selfPt.sx - pressHalfW,
                  top: selfPt.sy - pressHalfH,
                  width: pressHalfW * 2,
                  height: pressHalfH * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              >
                {dot > 0.02 ? (
                  <Text
                    style={{
                      fontSize: Math.max(9, SELF_R * s * 0.62),
                      fontWeight: '300',
                      color: accent,
                      opacity: dot,
                    }}
                  >
                    {'\u6211'}
                  </Text>
                ) : null}

                {chip > 0.02 && card < 0.02 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: hitR + SELF_R * s + 6,
                      alignItems: 'center',
                      opacity: chip,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Math.max(8, 12 * Math.min(fs, 1.0)),
                        fontWeight: '600',
                        color: accent,
                        letterSpacing: 0.3,
                      }}
                    >
                      {t('tab_me')}
                    </Text>
                  </View>
                ) : null}

                {card > 0.02 ? (
                  <View
                    style={{
                      width: cardW,
                      backgroundColor: cardBg,
                      borderRadius: 8,
                      borderWidth: 1.2,
                      borderColor: accent,
                      padding: 10,
                      opacity: card,
                      shadowColor: accent,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {userAvatarUri ? (
                        <Image
                          source={{ uri: userAvatarUri }}
                          style={{ width: 26, height: 26, borderRadius: 13 }}
                          cachePolicy='memory-disk'
                        />
                      ) : (
                        <DefaultAvatar index={avatarIndex} size={26} isDark={isDark} />
                      )}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: accent,
                          letterSpacing: 0.3,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {t('tab_me')}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '300',
                        color: cardDim,
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginTop: 3,
                      }}
                    >
                      {t('bonds_starfield_bonds_n', { n: displayBonds.length })}
                    </Text>
                    {detail > 0.02 ? (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '400',
                          color: accent,
                          marginTop: 4,
                          opacity: detail,
                        }}
                      >
                        {t('bonds_starfield_active_n', {
                          n: displayBonds.filter((b) => b.status === 'active').length,
                        })}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          })()}

          {/* ── Top bar ── */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
              right: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 30,
            }}
          >
            {showDemo ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                  backgroundColor: isDark ? 'rgba(196,168,130,0.09)' : 'rgba(60,36,21,0.06)',
                  borderWidth: 0.5,
                  borderColor: accent,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: accent,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('bonds_starfield_demo')}
                </Text>
              </View>
            ) : (
              <View />
            )}

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                borderWidth: 0.5,
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <X size={17} color={colors.text} strokeWidth={1.5} />
            </Pressable>
          </View>

          {/* ── Bottom zoom track ── */}
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + 20,
              left: 0,
              right: 0,
              alignItems: 'center',
              gap: 7,
              zIndex: 30,
            }}
          >
            <Pressable
              onPress={() => animateTo(1.0, 0, 0)}
              hitSlop={16}
              style={({ pressed }) => ({ opacity: pressed ? 0.45 : 1 })}
            >
              <View
                style={{
                  width: 108,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: isDark ? 'rgba(113,113,122,0.14)' : 'rgba(113,113,122,0.10)',
                }}
              >
                {([0.45, 0.78, 1.2, 1.65] as const).map((th, i) => {
                  const left = ((th - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left,
                        top: -2.5,
                        width: 1.5,
                        height: 8,
                        borderRadius: 0.75,
                        backgroundColor:
                          s >= th
                            ? accent
                            : isDark
                              ? 'rgba(113,113,122,0.24)'
                              : 'rgba(113,113,122,0.18)',
                      }}
                    />
                  )
                })}
                <View
                  style={{
                    position: 'absolute',
                    left: ((s - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100,
                    top: -1,
                    width: 8,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: accent,
                  }}
                />
              </View>
            </Pressable>

            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '300',
                color: isDark ? '#52525B' : '#A1A1AA',
                letterSpacing: 0.3,
              }}
            >
              {t('bonds_starfield_hint')}
            </Text>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  )
}
