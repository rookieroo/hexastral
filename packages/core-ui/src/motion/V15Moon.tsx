/**
 * V15Moon — the static logo moon (splash, hero, share-card).
 *
 * 1:1 port of HTML POC `v15moon(px)`:
 *   • viewBox 100, single circle (cx=50, cy=50, r=44)
 *   • fill = v15G radial gradient (cx=64%, cy=70%, r=62% of bbox)
 *     stops: #3a3a40 → #222227 → #15151a → #e7e0d0
 *     reads as "dark sphere with rim-lit cream edge"
 *   • filter = inkM (1-freq turbulence + small displacement scale 1.5
 *     in viewBox units — barely visible organic edge variation)
 *
 * Size-aware: inkM uniform `canvasSize` keeps the displacement *visually*
 * consistent across render sizes (15px logo and 200px hero both get the
 * same relative edge variation).
 *
 * Different from <MoonPhaseLoader>:
 *   - V15Moon is the static LOGO form (no shadow disc, no animation)
 *   - MoonPhaseLoader is the LOADING form (animated phase, grain overlay)
 */

import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia'
import {
  LOGO_DEFAULT_V15,
  LOGO_MOON_R,
  type LogoMoonSkin,
  MOON_CX,
  MOON_CY,
  MOON_VIEWBOX,
} from '@zhop/hexastral-tokens/moon'
import { useMemo } from 'react'
import { View, type ViewStyle } from 'react-native'

// ──────────────────────────────────────────────────────────────────
// SkSL: inkM filter — single-octave displacement, size-aware via uniform.
// HTML reference: feTurbulence baseFreq 0.9 + feDisplacementMap scale 1.5
// in viewBox 100. At canvas px size S:
//   freq cycles/px = 0.9 / (S/100) = 90 / S
//   amp px         = 1.5 * (S/100) = S * 0.015
// ──────────────────────────────────────────────────────────────────
const INK_M_SkSL = `
uniform shader src;
uniform float canvasSize;

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
float2 noise2d(float2 p){
  return float2(
    noise2(p) - 0.5,
    noise2(p + float2(31.7, 17.3)) - 0.5
  );
}

half4 main(float2 xy){
  float freq = 90.0 / canvasSize;
  float amp = canvasSize * 0.015;
  float2 d = noise2d(xy * freq) * amp;
  return src.eval(xy + d);
}
`

const inkMEffect = Skia.RuntimeEffect.Make(INK_M_SkSL)
if (!inkMEffect) console.warn('[V15Moon] inkM shader compile failed')

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export type V15MoonProps = {
  /** Render size in px. HTML uses 150 (splash) / 154 (hero). */
  size: number
  /** Logo skin (gradient palette). Default = HTML v15G. */
  skin?: LogoMoonSkin
  /** Wrapper View style (e.g. opacity, position). */
  style?: ViewStyle
}

/**
 * Static water-ink moon logo. Render once, animate position via transforms.
 *
 * @example
 *   <V15Moon size={150} />
 *   <V15Moon size={200} skin={MY_LOGO_SKIN} />
 */
export function V15Moon({ size, skin = LOGO_DEFAULT_V15, style }: V15MoonProps) {
  const k = size / MOON_VIEWBOX

  // Moon circle (viewBox: cx=50, cy=50, r=44)
  const cxPx = MOON_CX * k
  const cyPx = MOON_CY * k
  const rPx = LOGO_MOON_R * k

  // Clip to circle so SkSL displacement doesn't bleed past the moon silhouette
  const moonClip = useMemo(() => {
    const p = Skia.Path.Make()
    p.addCircle(cxPx, cyPx, rPx)
    return p
  }, [cxPx, cyPx, rPx])

  // Gradient centre + radius in objectBoundingBox units → canvas px
  // bbox = (cx-r, cy-r) to (cx+r, cy+r), size 2r
  const bboxLeft = cxPx - rPx
  const bboxTop = cyPx - rPx
  const bboxSize = rPx * 2
  const gx = bboxLeft + bboxSize * skin.gradient.cx
  const gy = bboxTop + bboxSize * skin.gradient.cy
  const gr = bboxSize * skin.gradient.r
  const colors = skin.gradient.stops.map((s) => s.color)
  const positions = skin.gradient.stops.map((s) => s.offset)

  const uniforms = useMemo(() => ({ canvasSize: size }), [size])

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Canvas style={{ width: size, height: size }}>
        <Group clip={moonClip}>
          <Circle cx={cxPx} cy={cyPx} r={rPx}>
            {inkMEffect ? (
              <Shader source={inkMEffect} uniforms={uniforms}>
                <RadialGradient c={vec(gx, gy)} r={gr} colors={colors} positions={positions} />
              </Shader>
            ) : (
              <RadialGradient c={vec(gx, gy)} r={gr} colors={colors} positions={positions} />
            )}
          </Circle>
        </Group>
      </Canvas>
    </View>
  )
}
