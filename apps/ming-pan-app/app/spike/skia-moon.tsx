/**
 * Moon-Phase Loader Spike — now thin consumer of @zhop/core-ui/motion.
 *
 * After iter 10, the spike's MoonPhaseCanvas + skin defs were extracted to:
 *   • `@zhop/hexastral-tokens/moon` — types, skin presets, geometry, timing
 *   • `@zhop/core-ui/motion` — <MoonPhaseLoader>, <AutoMoonPhaseLoader>, useMoonPhase
 *
 * This file just composes them with a skin picker, phrase cycler, and FPS
 * meter — i.e. the bits that are spike infrastructure, not loader-component
 * concerns. End-to-end validation that the package works for the 8-app suite.
 *
 * Route: /spike/skia-moon
 */

import {
  ALL_MOON_SKINS,
  type MoonFaceSkin,
  MoonPhaseLoader,
  SKIN_RICE_PAPER,
  useMoonPhase,
} from '@zhop/core-ui/motion'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated'

const FULL_SIZE = 150
const MINI_SIZE = 64

// ── Phrase cycler (matches HTML LOAD_STEPS) ──
const LOAD_STEPS_ZH = [
  '校准真太阳时',
  '起四柱',
  '对齐天干',
  '对齐地支',
  '称五行旺衰',
  '排布大运',
  '勘合现运',
]
const PHRASE_INTERVAL = 1600

function usePhraseCycle(running: boolean): string {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setStep((s) => (s + 1) % LOAD_STEPS_ZH.length), PHRASE_INTERVAL)
    return () => clearInterval(id)
  }, [running])
  return LOAD_STEPS_ZH[step] ?? LOAD_STEPS_ZH[0]!
}

export default function SkiaMoonSpike() {
  // Shared phase — Full + Mini stay in sync (HTML behaviour).
  const phase = useMoonPhase()

  // FPS readout
  const [fps, setFps] = useState(0)
  const fpsShared = useSharedValue(0)
  const _frames = useSharedValue(0)
  const _lastT = useSharedValue(0)
  useFrameCallback((info) => {
    'worklet'
    _frames.value += 1
    if (_lastT.value === 0) _lastT.value = info.timestamp
    const elapsed = info.timestamp - _lastT.value
    if (elapsed >= 500) {
      fpsShared.value = Math.round((_frames.value * 1000) / elapsed)
      _frames.value = 0
      _lastT.value = info.timestamp
    }
  }, true)
  useAnimatedReaction(
    () => fpsShared.value,
    (cur, prev) => {
      if (cur !== prev && cur > 0) runOnJS(setFps)(cur)
    }
  )

  const phrase = usePhraseCycle(true)
  const [skinId, setSkinId] = useState<string>(SKIN_RICE_PAPER.id)
  const skin: MoonFaceSkin = ALL_MOON_SKINS.find((s) => s.id === skinId) ?? SKIN_RICE_PAPER

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Moon-Phase Loader · core-ui Consumer</Text>
      <Text style={styles.sub}>
        skin: <Text style={{ color: '#E9E2D2' }}>{skin.name}</Text>
        {'  ·  FPS '}
        {fps || '—'}
      </Text>

      {/* ── FULL loader ── */}
      <View style={styles.loadingScene}>
        <MoonPhaseLoader size={FULL_SIZE} phase={phase} skin={skin} />
        <View style={styles.phraseBox}>
          <Text style={styles.phrase} key={phrase}>
            {phrase}
          </Text>
        </View>
      </View>

      {/* ── Skin picker ── */}
      <View style={styles.skinRow}>
        {ALL_MOON_SKINS.map((s) => {
          const active = s.id === skinId
          return (
            <Pressable
              key={s.id}
              onPress={() => setSkinId(s.id)}
              style={({ pressed }) => [
                styles.skinChip,
                active && styles.skinChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={[styles.skinDot, { backgroundColor: s.faceStops[0]?.color ?? '#888' }]}
              />
              <Text style={[styles.skinChipText, active && styles.skinChipTextActive]}>
                {s.name}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.divider} />

      {/* ── MINI inline (shares phase with FULL) ── */}
      <View style={styles.miniRow}>
        <Text style={styles.miniText}>请稍候</Text>
        <MoonPhaseLoader size={MINI_SIZE} phase={phase} skin={skin} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaItem}>
          surface · <Text style={styles.metaVal}>{skin.surface.kind}</Text>
        </Text>
        <Text style={styles.metaItem}>
          source · <Text style={styles.metaVal}>@zhop/core-ui</Text>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070605',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  title: {
    color: '#C2A878',
    fontSize: 11,
    letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sub: {
    color: '#8A8170',
    fontSize: 11,
    marginBottom: 22,
    textAlign: 'center',
  },

  loadingScene: {
    width: 280,
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#0C0B0A',
    borderRadius: 20,
  },
  phraseBox: { marginTop: 24, minHeight: 18 },
  phrase: {
    color: '#C2A878',
    fontSize: 11,
    letterSpacing: 2.5,
  },

  // Skin picker
  skinRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 320,
  },
  skinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.28)',
    backgroundColor: '#17150f',
  },
  skinChipActive: {
    borderColor: '#C2A878',
    backgroundColor: '#251f15',
  },
  skinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  skinChipText: {
    color: '#8A8170',
    fontFamily: 'Songti SC',
    fontSize: 12,
    letterSpacing: 2,
  },
  skinChipTextActive: { color: '#E9E2D2' },

  divider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(194,168,120,0.25)',
    marginVertical: 22,
  },

  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(28,24,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.2)',
  },
  miniText: {
    color: '#C2A878',
    fontFamily: 'Songti SC',
    fontSize: 14,
    letterSpacing: 2,
  },

  meta: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.3)',
    borderRadius: 8,
  },
  metaItem: {
    color: '#8A8170',
    fontFamily: 'Menlo',
    fontSize: 11,
    letterSpacing: 1,
  },
  metaVal: { color: '#E9E2D2' },
})
