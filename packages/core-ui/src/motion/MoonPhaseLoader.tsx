/**
 * MoonPhaseLoader — the 8-app suite's shared water-ink moon-phase loader.
 *
 * Verified in /spike/skia-moon → 1:1 port of HTML POC
 * `docs/design/motion-poc-fate-flow.html` #loading composition:
 *   • Lit face (mphFace radial) per `skin.faceStops`
 *   • Shadow disc (v15Shadow radial) sweeping cx via shared `phase` value
 *   • inkTerm 3-frequency displacement chain on the shadow edge
 *   • Material surface overlay per `skin.surface` (paper / silk / stone / none)
 *
 * Usage
 *
 *   import { MoonPhaseLoader, useMoonPhase } from '@zhop/core-ui/motion'
 *   import { SKIN_BRONZE } from '@zhop/hexastral-tokens/moon'
 *
 *   function FateLoader() {
 *     const phase = useMoonPhase()
 *     return <MoonPhaseLoader size={150} phase={phase} skin={SKIN_BRONZE} />
 *   }
 *
 * Or use the autonomous wrapper when you don't need to share the phase:
 *
 *   <AutoMoonPhaseLoader size={64} skin={SKIN_SILVER} />
 *
 * Sharing one `phase` between Full + Mini keeps them in sync (HTML behaviour).
 */

import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  Rect,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia'
import {
  DEFAULT_MOON_SKIN,
  DEFAULT_SHADOW_STOPS,
  MOON_CX,
  MOON_CY,
  MOON_R,
  MOON_VIEWBOX,
  type MoonFaceSkin,
  type MoonSurface,
  PHASE_DUR,
  phaseToCx,
  SHADOW_R,
} from '@zhop/hexastral-tokens/moon'
import { useEffect, useMemo } from 'react'
import { View, type ViewStyle } from 'react-native'
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

// ──────────────────────────────────────────────────────────────────
// SkSL shaders — implementation detail of the Skia renderer.
// ──────────────────────────────────────────────────────────────────

const NOISE_HELPERS = `
float hash21(float2 p){
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}
float noise2(float2 p){
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float2 noise2d(float2 p, float seed){
  return float2(
    noise2(p + float2(seed, 0.0)) - 0.5,
    noise2(p + float2(0.0, seed)) - 0.5
  );
}
float fbm(float2 p){
  float n = 0.0;
  float a = 0.5;
  for(int i=0; i<2; i++){ n += a * noise2(p); p *= 2.0; a *= 0.5; }
  return n;
}
`

// inkTerm — HTML POC's 3-frequency displacement chain (big tongues, fibres, particles).
const INK_TERM_SkSL = `
uniform shader src;
uniform float strength;
${NOISE_HELPERS}
half4 main(float2 xy){
  float2 d1 = noise2d(xy * 0.033, 7.0) * 15.0 * strength;
  float2 d2 = noise2d((xy + d1) * 0.233, 3.0) * 7.5 * strength;
  float2 d3 = noise2d((xy + d1 + d2) * 0.80, 11.0) * 4.5 * strength;
  return src.eval(xy + d1 + d2 + d3);
}
`

// paper — HTML mphgrain: fbm 0.85, raw range. Overlay blend at default 0.28.
const PAPER_GRAIN_SkSL = `
${NOISE_HELPERS}
half4 main(float2 xy){
  float n = fbm(xy * 0.85);
  return half4(half3(n), 1.0);
}
`

// silk — tight high-freq for metal sheen. SoftLight at default 0.18.
const SILK_GRAIN_SkSL = `
${NOISE_HELPERS}
half4 main(float2 xy){
  float n = fbm(xy * 2.2);
  float k = 0.5 + (n - 0.5) * 0.36;
  return half4(half3(k), 1.0);
}
`

// stone — coarser low-freq for patina. Overlay at default 0.22.
const STONE_GRAIN_SkSL = `
${NOISE_HELPERS}
half4 main(float2 xy){
  float n = fbm(xy * 0.5);
  return half4(half3(n), 1.0);
}
`

const inkTermEffect = Skia.RuntimeEffect.Make(INK_TERM_SkSL)
const paperGrainEffect = Skia.RuntimeEffect.Make(PAPER_GRAIN_SkSL)
const silkGrainEffect = Skia.RuntimeEffect.Make(SILK_GRAIN_SkSL)
const stoneGrainEffect = Skia.RuntimeEffect.Make(STONE_GRAIN_SkSL)
if (!inkTermEffect) console.warn('[MoonPhaseLoader] inkTerm shader compile failed')
if (!paperGrainEffect) console.warn('[MoonPhaseLoader] paper grain compile failed')
if (!silkGrainEffect) console.warn('[MoonPhaseLoader] silk grain compile failed')
if (!stoneGrainEffect) console.warn('[MoonPhaseLoader] stone grain compile failed')

// ──────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────

/**
 * Drives a moon-phase loop. Returns a SharedValue<number> ∈ [0, 1] that
 * ticks linearly over `durationMs`, then resets.
 *
 *   const phase = useMoonPhase()
 *   const phase = useMoonPhase({ durationMs: PHASE_DUR_MINI })
 *
 * Share one returned value between multiple <MoonPhaseLoader>s to keep
 * them perfectly in sync (e.g. full hero + mini badge of the same wait).
 */
export function useMoonPhase({
  durationMs = PHASE_DUR,
}: {
  durationMs?: number
} = {}): SharedValue<number> {
  const phase = useSharedValue(0)
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.linear }),
      -1,
      false
    )
  }, [phase, durationMs])
  return phase
}

// ──────────────────────────────────────────────────────────────────
// Surface overlay (paper / silk / stone / none)
// ──────────────────────────────────────────────────────────────────

type SurfaceOverlayProps = {
  surface: MoonSurface
  x: number
  y: number
  size: number
}

function SurfaceOverlay({ surface, x, y, size }: SurfaceOverlayProps) {
  if (surface.kind === 'none') return null

  // Skia v2 expects string literal blend modes (not the enum, which TS
  // widens awkwardly when assigned to a let).
  let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null
  let blendMode: 'overlay' | 'softLight' = 'overlay'
  let defaultOpacity = 0.28

  switch (surface.kind) {
    case 'paper':
      effect = paperGrainEffect
      blendMode = 'overlay'
      defaultOpacity = 0.28
      break
    case 'silk':
      effect = silkGrainEffect
      blendMode = 'softLight'
      defaultOpacity = 0.18
      break
    case 'stone':
      effect = stoneGrainEffect
      blendMode = 'overlay'
      defaultOpacity = 0.22
      break
  }

  if (!effect) return null

  return (
    <Rect
      x={x}
      y={y}
      width={size}
      height={size}
      blendMode={blendMode}
      opacity={surface.opacity ?? defaultOpacity}
    >
      <Shader source={effect} />
    </Rect>
  )
}

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export type MoonPhaseLoaderProps = {
  /** Render size in px (viewBox 100 scales to this). HTML uses 150 (full) / 64 (mini). */
  size: number
  /** Phase shared value, [0, 1] loop. Use `useMoonPhase()` to drive. */
  phase: SharedValue<number>
  /** Skin = face palette + surface texture. Default = HTML 宣纸. */
  skin?: MoonFaceSkin
  /**
   * Optional View shadow halo (HTML mphwrap box-shadow). Default scales with
   * size: full ~22px blur, mini ~11px. Pass `false` to disable.
   */
  halo?: boolean | { radius: number; opacity: number }
  /** Skip the surface grain overlay (paper/silk/stone) — for small sizes where
   *  the grain reads as speckle. The inkTerm shadow edge stays (see `inkStrength`). */
  clean?: boolean
  /**
   * Scales the inkTerm shadow-edge displacement (0 = smooth disc, 1 = full
   * water-ink). Small sizes want a low value so the ink wobble stays a fine
   * texture rather than big irregular tongues — but keep it > 0 so the moon
   * keeps its water-ink character (not a generic smooth Apple-style disc).
   */
  inkStrength?: number
  /** Extra style on the wrapper View. */
  style?: ViewStyle
}

/**
 * Skia moon-phase loader. Caller owns the `phase` value (use `useMoonPhase`).
 *
 * @example
 *   const phase = useMoonPhase()
 *   <MoonPhaseLoader size={150} phase={phase} skin={SKIN_RICE_PAPER} />
 */
export function MoonPhaseLoader({
  size,
  phase,
  skin = DEFAULT_MOON_SKIN,
  halo = true,
  clean = false,
  inkStrength = 1,
  style,
}: MoonPhaseLoaderProps) {
  const k = size / MOON_VIEWBOX

  // mphClip — circle r=40 in viewBox
  const moonClip = useMemo(() => {
    const p = Skia.Path.Make()
    p.addCircle(MOON_CX * k, MOON_CY * k, MOON_R * k)
    return p
  }, [k])

  // Animated shadow cx (in canvas px) — derived from phase
  const shadowCxPx = useDerivedValue(() => phaseToCx(phase.value) * k)
  // Shadow gradient centre follows the disc
  const shadowGradC = useDerivedValue(() => vec(phaseToCx(phase.value) * k, MOON_CY * k))

  // Resolve skin → concrete face params (canvas px)
  const bboxLeft = (MOON_CX - MOON_R) * k
  const bboxTop = (MOON_CY - MOON_R) * k
  const bboxSize = MOON_R * 2 * k
  const faceC = vec(
    bboxLeft + bboxSize * skin.faceCenter.cx,
    bboxTop + bboxSize * skin.faceCenter.cy
  )
  const faceR = bboxSize * skin.faceRadius
  const faceColors = skin.faceStops.map((s) => s.color)
  const facePositions = skin.faceStops.map((s) => s.offset)

  const shadowStops = skin.shadowStops ?? DEFAULT_SHADOW_STOPS
  const shadowColors = shadowStops.map((s) => s.color)
  const shadowPositions = shadowStops.map((s) => s.offset)

  // Halo style (RN box-shadow approximation)
  const haloStyle: ViewStyle = useMemo(() => {
    if (halo === false) return {}
    const cfg =
      typeof halo === 'object'
        ? halo
        : { radius: Math.max(8, size * 0.15), opacity: size > 100 ? 0.04 : 0.05 }
    return {
      shadowColor: '#e8e0cd',
      shadowOpacity: cfg.opacity,
      shadowRadius: cfg.radius,
      shadowOffset: { width: 0, height: 0 },
    }
  }, [halo, size])

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, haloStyle, style]}>
      <Canvas style={{ width: size, height: size }}>
        <Group clip={moonClip}>
          {/* Lit face — per skin */}
          <Circle cx={MOON_CX * k} cy={MOON_CY * k} r={MOON_R * k}>
            <RadialGradient c={faceC} r={faceR} colors={faceColors} positions={facePositions} />
          </Circle>

          {/* Shadow disc — animated cx. inkTerm noise displaces the edge, unless
              `clean` (small sizes look better with a smooth terminator). */}
          <Circle cx={shadowCxPx} cy={MOON_CY * k} r={SHADOW_R * k}>
            {inkTermEffect ? (
              <Shader source={inkTermEffect} uniforms={{ strength: inkStrength }}>
                <RadialGradient
                  c={shadowGradC}
                  r={SHADOW_R * k}
                  colors={shadowColors}
                  positions={shadowPositions}
                />
              </Shader>
            ) : (
              <RadialGradient c={shadowGradC} r={SHADOW_R * k} colors={shadowColors.slice(0, 3)} />
            )}
          </Circle>

          {/* Surface texture (per skin) — skipped in `clean` mode. */}
          {clean ? null : (
            <SurfaceOverlay surface={skin.surface} x={bboxLeft} y={bboxTop} size={bboxSize} />
          )}
        </Group>
      </Canvas>
    </View>
  )
}

// ──────────────────────────────────────────────────────────────────
// Convenience wrapper — owns its phase loop
// ──────────────────────────────────────────────────────────────────

export type AutoMoonPhaseLoaderProps = Omit<MoonPhaseLoaderProps, 'phase'> & {
  durationMs?: number
}

/**
 * Self-contained loader with internal phase loop. Use when you don't need to
 * synchronise multiple loaders or coordinate with other animations.
 *
 * @example
 *   <AutoMoonPhaseLoader size={150} skin={SKIN_BRONZE} />
 */
export function AutoMoonPhaseLoader({ durationMs, ...props }: AutoMoonPhaseLoaderProps) {
  const phase = useMoonPhase({ durationMs })
  return <MoonPhaseLoader {...props} phase={phase} />
}
