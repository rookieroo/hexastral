/**
 * Unseal Reveal Spike — validates @zhop/core-ui/motion UnsealReveal.
 *
 * Stage: 6 mock "sealed" reading chapters in a row, each fronted by a wax
 * seal (封). Tap the chapter (or use replay button) → seal breaks, chapter
 * content reveals. Matches the reading-unlock POC.
 *
 * Route: /spike/unseal
 */

import { UnsealReveal } from '@zhop/core-ui/motion'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const PHONE_W = 320
const PHONE_H = 680
const SEAL_SIZE = 66
const AUTO_HOLD = 1800
const AUTO_REPLAY = 2600

type ChapterState = 'sealed' | 'breaking' | 'unsealed'

const CHAPTERS = [
  { ord: '壹', title: '命格', sub: '金骨清贵 · 寒木向阳' },
  { ord: '贰', title: '命主', sub: '戊午日主 · 火土得令' },
  { ord: '叁', title: '现运', sub: '戊午大运 · 32–41' },
]

export default function UnsealSpike() {
  // Track state per chapter so each can be opened individually
  const [states, setStates] = useState<ChapterState[]>(CHAPTERS.map(() => 'sealed'))

  // Track "lead" chapter for auto-loop demo
  const [autoIdx, setAutoIdx] = useState(0)

  const unseal = useCallback((idx: number) => {
    setStates((prev) => {
      if (prev[idx] !== 'sealed') return prev
      const next = [...prev]
      next[idx] = 'breaking'
      return next
    })
  }, [])

  const onBroken = useCallback((idx: number) => {
    setStates((prev) => {
      if (prev[idx] !== 'breaking') return prev
      const next = [...prev]
      next[idx] = 'unsealed'
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setStates(CHAPTERS.map(() => 'sealed'))
    setAutoIdx(0)
  }, [])

  // Auto-loop: open each chapter in sequence, then reset
  useEffect(() => {
    if (autoIdx < CHAPTERS.length) {
      const t = setTimeout(() => {
        unseal(autoIdx)
        setAutoIdx(autoIdx + 1)
      }, AUTO_HOLD)
      return () => clearTimeout(t)
    }
    // all opened → wait, reset
    const t = setTimeout(reset, AUTO_REPLAY)
    return () => clearTimeout(t)
  }, [autoIdx, unseal, reset])

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Unseal Reveal · core-ui</Text>
      <Text style={styles.sub}>蜡封启封 · halves split + splatter (700ms)</Text>

      <View style={styles.phone}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>命书 · 章目录</Text>
        </View>

        <View style={styles.list}>
          {CHAPTERS.map((ch, i) => {
            const state = states[i] ?? 'sealed'
            return (
              <ChapterCard
                key={ch.ord}
                ord={ch.ord}
                title={ch.title}
                sub={ch.sub}
                state={state}
                onTap={() => unseal(i)}
                onBroken={() => onBroken(i)}
              />
            )
          })}
        </View>
      </View>

      <Pressable
        onPress={reset}
        style={({ pressed }) => [styles.btn, styles.btnGhost, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.btnText}>↩ reset all</Text>
      </Pressable>
    </View>
  )
}

type ChapterCardProps = {
  ord: string
  title: string
  sub: string
  state: ChapterState
  onTap: () => void
  onBroken: () => void
}

function ChapterCard({ ord, title, sub, state, onTap, onBroken }: ChapterCardProps) {
  // Content blur + opacity per state
  const blurOpacity = useSharedValue(state === 'sealed' ? 0.25 : 1)
  const contentY = useSharedValue(state === 'sealed' ? 4 : 0)

  useEffect(() => {
    if (state === 'unsealed') {
      blurOpacity.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      })
      contentY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      })
    } else if (state === 'sealed') {
      blurOpacity.value = 0.25
      contentY.value = 4
    }
  }, [state, blurOpacity, contentY])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  return (
    <Pressable onPress={onTap} disabled={state !== 'sealed'}>
      <View style={styles.card}>
        <Animated.View style={[styles.cardContent, contentStyle]}>
          <Text style={styles.ord}>{ord}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSub}>{sub}</Text>
          </View>
        </Animated.View>
        {state !== 'unsealed' && (
          <View style={styles.sealOverlay} pointerEvents='none'>
            <UnsealReveal
              sealed={state === 'sealed'}
              size={SEAL_SIZE}
              glyph='封'
              onBroken={onBroken}
            />
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070605',
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
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
    marginBottom: 14,
    textAlign: 'center',
  },
  phone: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233,226,210,0.1)',
    backgroundColor: '#0C0B0A',
  },
  header: {
    paddingTop: 22,
    paddingBottom: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(233,226,210,0.08)',
  },
  headerTitle: {
    color: '#C2A878',
    fontFamily: 'Songti SC',
    fontSize: 14,
    letterSpacing: 4,
  },
  list: {
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 14,
  },

  card: {
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.18)',
    backgroundColor: '#17150f',
    padding: 16,
    justifyContent: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ord: {
    color: '#C2A878',
    fontFamily: 'Songti SC',
    fontSize: 22,
    letterSpacing: 1,
  },
  cardTitle: {
    color: '#E9E2D2',
    fontFamily: 'Songti SC',
    fontSize: 17,
    letterSpacing: 2,
  },
  cardSub: {
    color: '#8A8170',
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 1,
  },
  sealOverlay: {
    position: 'absolute',
    right: 12,
    top: 10,
  },

  btn: {
    marginTop: 14,
    paddingHorizontal: 22,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.4)',
    backgroundColor: '#17150f',
  },
  btnText: { color: '#E9E2D2', fontSize: 12, letterSpacing: 2 },
})
