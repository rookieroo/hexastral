/**
 * SkyField — the home's ambient night sky as a Skia <Canvas> of small star
 * circles (most static, a third twinkling via opacity).
 *
 * History / why this shape:
 *  - The original SVG StarField warmed the phone by committing ~30 native node
 *    props EVERY frame — a CPU/bridge cost, not a fill cost.
 *  - A full-screen fragment shader fixed the heat but looped over every star PER
 *    PIXEL at retina res every frame → it saturated the GPU and dropped frames
 *    home-wide (scroll + swipe included).
 *  - The right tool is between them: Skia DRAWING NODES. GPU-batched primitives,
 *    so there's no per-node native commit (cool) and no per-pixel loop (cheap +
 *    smooth). ~72 circles redraw in one pass per frame — trivial for Skia — and
 *    ~18 of them twinkle off a SINGLE shared clock. `paused` freezes the clock,
 *    so the canvas stops redrawing → a static frame at ~0 cost.
 *
 * Deterministic sin-hash scatter (no Math.random), per repo convention.
 */

import { Canvas, Circle } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import {
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated'

const STAR = '#c2cad8' // cool starlight
const COUNT = 72

/** Deterministic 0..1 hash — stable scatter without Math.random. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

interface Star {
  x: number
  y: number
  r: number
  baseOp: number
  twinkle: boolean
  phase: number
  speed: number
}

export interface SkyFieldProps {
  width: number
  height: number
  /** Overall sky brightness 0..1 (a gentle multiplier on the twinkle). */
  brightSv: SharedValue<number>
  /** Freeze the twinkle (screen blurred / app backgrounded / report covering). */
  paused?: boolean
}

export function SkyField({ width, height, brightSv, paused }: SkyFieldProps) {
  const reduced = useReducedMotion()
  const stars = useMemo<Star[]>(() => {
    const out: Star[] = []
    for (let i = 0; i < COUNT; i++) {
      out.push({
        x: hash(i * 3 + 1) * width,
        y: hash(i * 3 + 2) * height,
        r: 0.5 + hash(i * 3 + 3) * 1.1,
        baseOp: 0.18 + hash(i * 3 + 4) * 0.5,
        twinkle: i % 4 === 0, // ~1/4 of the field breathes; the rest is steady depth
        phase: hash(i * 3 + 5) * 6.2831853,
        speed: 1.2 + hash(i * 3 + 6) * 1.8,
      })
    }
    return out
  }, [width, height])

  // One monotonic seconds clock drives every twinkle (cheap UI-thread worklet),
  // stopped — not just ignored — while paused so the canvas stops redrawing.
  const clock = useSharedValue(0)
  const frame = useFrameCallback((info) => {
    'worklet'
    clock.value = (clock.value + (info.timeSincePreviousFrame ?? 16) / 1000) % 36000
  }, false)
  useEffect(() => {
    frame.setActive(!paused && !reduced)
  }, [paused, reduced, frame])

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {stars.map((s, i) =>
        s.twinkle ? (
          <TwinkleStar key={i} star={s} clock={clock} brightSv={brightSv} />
        ) : (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={STAR} opacity={s.baseOp} />
        )
      )}
    </Canvas>
  )
}

function TwinkleStar({
  star,
  clock,
  brightSv,
}: {
  star: Star
  clock: SharedValue<number>
  brightSv: SharedValue<number>
}) {
  const opacity = useDerivedValue(() => {
    const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(clock.value * star.speed + star.phase))
    return star.baseOp * tw * (0.6 + 0.7 * brightSv.value)
  })
  return <Circle cx={star.x} cy={star.y} r={star.r} color={STAR} opacity={opacity} />
}
