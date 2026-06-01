/**
 * InkWipeReveal — water-ink mask transition.
 *
 * 1:1 port of HTML POC `revealMask` + `iwedge` filter (motion-poc-fate-flow.html):
 *   - Starts as a fullscreen overlay covering the BENEATH content (caller's
 *     normal RN view tree).
 *   - On `active`, a circle "hole" grows from `origin` outward over `duration`,
 *     punching through the overlay via dstOut blend.
 *   - The circle's radial gradient has soft 0.94/0.5/0 stops at the edge AND
 *     a 2-frequency SkSL displacement → the hole's edge is an organic ink wash,
 *     not a hard circle.
 *
 * Mental model: render NEW content underneath, drop this on top, set `active`.
 * When wipe completes, set `active=false` to dismiss the overlay (or unmount).
 *
 *   <View style={fullScreen}>
 *     <ReportScreen />
 *     <InkWipeReveal
 *       active={revealing}
 *       overlayColor="#0C0B0A"   // appearance of the OLD screen
 *       origin={{ x: 160, y: 606 }}
 *       maxRadius={820}
 *       width={320}
 *       height={680}
 *       onComplete={() => setRevealing(false)}
 *     />
 *   </View>
 */

import { Canvas, Circle, RadialGradient, Rect, Shader, Skia, vec } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { StyleSheet, type ViewStyle } from 'react-native'
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

// HTML POC: cubic-bezier(.3,.45,.2,1), 2400ms
const DEFAULT_DURATION = 2400
const DEFAULT_EASING = Easing.bezier(0.3, 0.45, 0.2, 1)

// ──────────────────────────────────────────────────────────────────
// SkSL: iwedge filter — 2-frequency displacement chain.
// HTML reference (in viewBox 320×680):
//   baseFreq 0.012/0.02, scale 32   →  big ink tongues
//   baseFreq 0.18/0.26,  scale 9    →  splatter particles
// Since our canvas is rendered at the same px size as the SVG viewBox here
// (overlay = phone screen size), use values directly without rescaling.
// ──────────────────────────────────────────────────────────────────
const IWEDGE_SkSL = `
uniform shader src;

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

half4 main(float2 xy){
  float2 d1 = noise2d(xy * 0.016, 7.0) * 32.0;
  float2 d2 = noise2d((xy + d1) * 0.22, 3.0) * 9.0;
  return src.eval(xy + d1 + d2);
}
`

const iwedgeEffect = Skia.RuntimeEffect.Make(IWEDGE_SkSL)
if (!iwedgeEffect) console.warn('[InkWipeReveal] iwedge shader compile failed')

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export type InkWipeRevealProps = {
  /** True = play wipe (hole grows). False = overlay covers (initial state). */
  active: boolean
  /** Origin of the wipe in container coordinates. HTML POC: (160, 606). */
  origin: { x: number; y: number }
  /** Final radius the hole grows to (should cover viewport diagonal). HTML: 820. */
  maxRadius: number
  /** Overlay container dimensions. Usually phone/screen size. */
  width: number
  height: number
  /** Colour that "covers" the beneath content. Match the OLD screen's bg. */
  overlayColor?: string
  /** Animation duration in ms. Default 2400ms (HTML POC). */
  duration?: number
  /** Called when the wipe reaches `maxRadius`. */
  onComplete?: () => void
  /** Position style — usually absoluteFill or matching the parent stage. */
  style?: ViewStyle
}

/**
 * Renders an overlay that hides beneath content. When `active` flips true,
 * a growing ink-displaced circle "hole" reveals what's underneath.
 */
export function InkWipeReveal({
  active,
  origin,
  maxRadius,
  width,
  height,
  overlayColor = '#0C0B0A',
  duration = DEFAULT_DURATION,
  onComplete,
  style,
}: InkWipeRevealProps) {
  const r = useSharedValue(0)

  useEffect(() => {
    if (active) {
      r.value = withTiming(maxRadius, { duration, easing: DEFAULT_EASING })
    } else {
      r.value = 0
    }
  }, [active, maxRadius, duration, r])

  // Notify caller when the wipe lands
  useAnimatedReaction(
    () => r.value,
    (cur, prev) => {
      if (!active || !onComplete) return
      if (prev !== null && prev < maxRadius && cur >= maxRadius) {
        runOnJS(onComplete)()
      }
    }
  )

  // Animated radial gradient centre + radius for the dstOut circle
  const gradC = useMemo(() => vec(origin.x, origin.y), [origin.x, origin.y])
  const gradR = useDerivedValue(() => Math.max(1, r.value))

  return (
    <Canvas
      style={[StyleSheet.absoluteFillObject, { width, height }, style as object]}
      pointerEvents={active ? 'auto' : 'none'}
    >
      {/* Solid overlay covering the whole area */}
      <Rect x={0} y={0} width={width} height={height} color={overlayColor} />

      {/* dstOut "hole" — radial gradient (soft edge) + ink displacement */}
      <Circle cx={origin.x} cy={origin.y} r={r} blendMode='dstOut'>
        {iwedgeEffect ? (
          <Shader source={iwedgeEffect}>
            <RadialGradient
              c={gradC}
              r={gradR}
              colors={[
                'rgba(255,255,255,1)',
                'rgba(255,255,255,1)',
                'rgba(255,255,255,0.94)',
                'rgba(255,255,255,0.5)',
                'rgba(255,255,255,0)',
              ]}
              positions={[0, 0.58, 0.79, 0.91, 1]}
            />
          </Shader>
        ) : (
          <RadialGradient
            c={gradC}
            r={gradR}
            colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            positions={[0, 0.85, 1]}
          />
        )}
      </Circle>
    </Canvas>
  )
}

// ──────────────────────────────────────────────────────────────────
// InkBloomMask — the same ink shape, but as a MaskedView mask element.
// ──────────────────────────────────────────────────────────────────

export type InkBloomMaskProps = {
  /** True = grow the ink shape (reveal). False = collapsed (nothing shown). */
  active: boolean
  /** Origin of the bloom in container coordinates (e.g. the CTA that opened it). */
  origin: { x: number; y: number }
  /** Final radius the shape grows to (should cover the viewport diagonal). */
  maxRadius: number
  width: number
  height: number
  duration?: number
  /** Fires when the shape finishes growing to maxRadius. */
  onOpened?: () => void
  /** Fires when the shape finishes collapsing back to 0 (use for symmetric close). */
  onCollapsed?: () => void
  style?: ViewStyle
}

/**
 * White organic-ink shape on a transparent canvas — meant to be a MaskedView
 * `maskElement`. Wherever it paints (white) the masked content shows; the
 * feathered ink edge fades content out into whatever sits *behind* the mask
 * (e.g. the previous screen). Same 墨晕 edge as {@link InkWipeReveal}, but it
 * reveals content *inside* the shape instead of punching a hole through a cover
 * — so a report can bloom in over the live home screen rather than over flat black.
 *
 * `active` drives the direction: flipping false→true grows the shape (open),
 * true→false collapses it back to 0 (close). `onOpened` / `onCollapsed` fire at
 * each endpoint so the caller can sequence open and close symmetrically.
 */
export function InkBloomMask({
  active,
  origin,
  maxRadius,
  width,
  height,
  duration = DEFAULT_DURATION,
  onOpened,
  onCollapsed,
  style,
}: InkBloomMaskProps) {
  const r = useSharedValue(0)

  useEffect(() => {
    r.value = withTiming(active ? maxRadius : 0, { duration, easing: DEFAULT_EASING })
  }, [active, maxRadius, duration, r])

  useAnimatedReaction(
    () => r.value,
    (cur, prev) => {
      if (prev === null) return
      if (active && prev < maxRadius && cur >= maxRadius && onOpened) {
        runOnJS(onOpened)()
      } else if (!active && prev > 0 && cur <= 0 && onCollapsed) {
        runOnJS(onCollapsed)()
      }
    }
  )

  const gradC = useMemo(() => vec(origin.x, origin.y), [origin.x, origin.y])
  const gradR = useDerivedValue(() => Math.max(1, r.value))

  return (
    <Canvas
      style={[StyleSheet.absoluteFillObject, { width, height }, style as object]}
      pointerEvents='none'
    >
      <Circle cx={origin.x} cy={origin.y} r={r}>
        {iwedgeEffect ? (
          <Shader source={iwedgeEffect}>
            <RadialGradient
              c={gradC}
              r={gradR}
              colors={[
                'rgba(255,255,255,1)',
                'rgba(255,255,255,1)',
                'rgba(255,255,255,0.96)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0)',
              ]}
              positions={[0, 0.6, 0.82, 0.93, 1]}
            />
          </Shader>
        ) : (
          <RadialGradient
            c={gradC}
            r={gradR}
            colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            positions={[0, 0.88, 1]}
          />
        )}
      </Circle>
    </Canvas>
  )
}
