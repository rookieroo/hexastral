/**
 * ⭕ ThreeCoins — 六爻金钱卦铜钱动画
 *
 * 使用 RN Animated + useNativeDriver: true（全 UI 线程，无 JS bridge 卡顿）
 * 仅 2 个动画循环：flipAnim（翻面 + Z轴摇摆 + 垂直抛动）+ orbitXAnim（水平轨道）
 * rotZ 由 flipAnim 插值推导，首尾值相同 → 完全无接缝
 *
 * 铜钱规则：字面（阳）= 3  背面（阴）= 2
 *   三枚之和  6=老阴  7=少阳  8=少阴  9=老阳
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { CoinValue, YaoResult } from '@/lib/ux/useShakeDivination'

// ── 铜钱配色 ──────────────────────────────────────────────────────────────
const GOLD_BG = '#C5973A'
const GOLD_DARK = '#8B6414'
const GOLD_BORDER = '#E8C060'
const COPPER_BG = '#7A4F2D'
const COPPER_DARK = '#4A2C15'
const HOLE_COLOR = '#1A1208'
const COIN_SIZE = 70
const HOLE_SIZE = 18

// ── 每枚铜钱的个性参数 ───────────────────────────────────────────────────
const CONFIGS = [
  { flipMs: 560, orbitAmp: 7, orbitMs: 820, wobbleDeg: 9 },
  { flipMs: 400, orbitAmp: 10, orbitMs: 650, wobbleDeg: 6 },
  { flipMs: 730, orbitAmp: 5, orbitMs: 1050, wobbleDeg: 12 },
] as const

// ── SingleCoin ────────────────────────────────────────────────────────────

interface SingleCoinProps {
  index: 0 | 1 | 2
  isSpinning: boolean
  intensity: number
  result: CoinValue | null
}

function SingleCoin({ index, isSpinning, intensity, result }: SingleCoinProps) {
  const { t } = useI18n()
  const cfg = CONFIGS[index]

  /**
   * flipAnim  0 → 1 循环：驱动 scaleX / Z摇摆 / 正背面 opacity / 垂直抛动
   * orbitXAnim：独立水平轨道，与 flip 频率不同 → 产生李萨如感的复合运动
   * scalePulse：仅落地时使用
   * resultFade：落地后字符浮现
   */
  const flipAnim = useRef(new Animated.Value(0)).current
  const orbitXAnim = useRef(new Animated.Value(0)).current
  const scalePulse = useRef(new Animated.Value(1)).current
  const resultFade = useRef(new Animated.Value(0)).current

  const flipLoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const orbitLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  // ── 摇卦动画 ────────────────────────────────────────────────────────
  useEffect(() => {
    flipLoopRef.current?.stop()
    orbitLoopRef.current?.stop()

    if (!isSpinning || result !== null) return

    const sf = Math.max(0.48, 1 - intensity * 0.42) // 强度越高越快
    const delay = index * 85 // 三枚错开相位

    flipAnim.setValue(0)
    flipLoopRef.current = Animated.loop(
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: cfg.flipMs * sf,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    flipLoopRef.current.start()

    orbitXAnim.setValue(0)
    orbitLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(orbitXAnim, {
          toValue: cfg.orbitAmp,
          duration: cfg.orbitMs * sf,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbitXAnim, {
          toValue: -cfg.orbitAmp,
          duration: cfg.orbitMs * sf,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbitXAnim, {
          toValue: 0,
          duration: cfg.orbitMs * sf,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    orbitLoopRef.current.start()

    return () => {
      flipLoopRef.current?.stop()
      orbitLoopRef.current?.stop()
    }
  }, [
    isSpinning,
    result,
    intensity,
    cfg.flipMs,
    flipAnim,
    index,
    orbitXAnim.setValue,
    cfg.orbitMs,
    orbitXAnim,
    cfg.orbitAmp,
  ])

  // ── 落地动画 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (result === null) {
      resultFade.setValue(0)
      scalePulse.setValue(1)
      return
    }

    flipLoopRef.current?.stop()
    orbitLoopRef.current?.stop()

    const d = index * 130

    // 字面=3 → flipAnim=0（scaleX=1，frontOpacity=1）
    // 背面=2 → flipAnim=0.5（scaleX=1，backOpacity=1）
    Animated.timing(flipAnim, {
      toValue: result === 3 ? 0 : 0.5,
      duration: d + 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()

    Animated.timing(orbitXAnim, {
      toValue: 0,
      duration: d + 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()

    Animated.sequence([
      Animated.delay(d),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scalePulse, {
            toValue: 1.15,
            duration: 60,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(scalePulse, {
            toValue: 1,
            tension: 200,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(resultFade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [result, scalePulse, index, resultFade.setValue, resultFade, orbitXAnim, flipAnim])

  // ── 插值 ─────────────────────────────────────────────────────────
  /**
   * scaleX：1→0→1→0→1  模拟 Y 轴透视翻面
   * flipAnim=0/0.5 时 scaleX=1（正反面朝向屏幕）
   * flipAnim=0.25/0.75 时 scaleX=0（硬币侧立）
   */
  const flipScaleX = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0, 1, 0, 1],
  })

  /**
   * Z轴摇摆：首尾相同（0deg → ±wobble → 0deg）→ 无接缝
   * 与 scaleX 相位错 90°：硬币侧立时旋转到达极值，正面时归零
   */
  const w = cfg.wobbleDeg
  const rotateZ = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', `${w}deg`, '0deg', `-${w}deg`, '0deg'],
  })

  /** 垂直抛动：正面时在最低点（0），侧立时在最高点（-bounceH） */
  const bounceH = 8 + intensity * 11
  const bounceY = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -bounceH, 0, -bounceH, 0],
  })

  /** 正面朝上窗口（flipAnim 0–0.22 和 0.78–1） */
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.22, 0.28, 0.72, 0.78, 1],
    outputRange: [1, 1, 0, 0, 1, 1],
  })

  /** 背面朝上窗口（flipAnim 0.28–0.72） */
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.22, 0.28, 0.72, 0.78, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  })

  return (
    // 外层：translateX（轨道）+ translateY（抛动）+ rotateZ（摇摆）+ scale（落地脉冲）
    <Animated.View
      style={{
        transform: [
          { translateX: orbitXAnim },
          { translateY: bounceY },
          { rotate: rotateZ },
          { scale: scalePulse },
        ],
      }}
    >
      {/* 内层：scaleX 翻面 */}
      <Animated.View style={{ transform: [{ scaleX: flipScaleX }] }}>
        {/* 字面（阳 · 金色） */}
        <Animated.View
          style={[styles.coin, { opacity: result === null ? frontOpacity : result === 3 ? 1 : 0 }]}
        >
          <View style={[styles.coinInner, { backgroundColor: GOLD_BG, borderColor: GOLD_BORDER }]}>
            <View style={styles.squareHole} />
            <Animated.Text style={[styles.coinChar, { color: GOLD_DARK, opacity: resultFade }]}>
              {t('coin_face_yang')}
            </Animated.Text>
          </View>
          <View style={[styles.coinShadow, { backgroundColor: GOLD_DARK }]} />
        </Animated.View>

        {/* 背面（阴 · 铜色） */}
        <Animated.View
          style={[
            styles.coin,
            styles.coinAbsolute,
            { opacity: result === null ? backOpacity : result === 2 ? 1 : 0 },
          ]}
        >
          <View style={[styles.coinInner, { backgroundColor: COPPER_BG, borderColor: '#A06030' }]}>
            <View style={[styles.squareHole, { backgroundColor: HOLE_COLOR }]} />
            <Animated.Text style={[styles.coinChar, { color: COPPER_DARK, opacity: resultFade }]}>
              {t('coin_face_yin')}
            </Animated.Text>
          </View>
          <View style={[styles.coinShadow, { backgroundColor: COPPER_DARK }]} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  )
}

// ── ThreeCoins（主导出）──────────────────────────────────────────────────

interface ThreeCoinsProps {
  isSpinning: boolean
  intensity: number
  landedResult: YaoResult | null
}

export function ThreeCoins({ isSpinning, intensity, landedResult }: ThreeCoinsProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  const yaoMap: Record<number, [string, string]> = {
    6: [t('liuyao_laoyin'), '── ○ ──'],
    7: [t('liuyao_shaoyang'), '────────'],
    8: [t('liuyao_shaoyin'), '──   ──'],
    9: [t('liuyao_laoyang'), '── ✕ ──'],
  }

  const total = landedResult
    ? landedResult.coins[0] + landedResult.coins[1] + landedResult.coins[2]
    : null
  const yaoEntry = total !== null ? yaoMap[total] : null

  return (
    <View style={styles.container}>
      <View style={styles.coinsRow}>
        {([0, 1, 2] as const).map((i) => (
          <SingleCoin
            key={i}
            index={i}
            isSpinning={isSpinning}
            intensity={intensity}
            result={landedResult ? landedResult.coins[i] : null}
          />
        ))}
      </View>

      {yaoEntry && total !== null && (
        <View
          style={{
            alignItems: 'center',
            gap: 4,
            paddingVertical: 10,
            paddingHorizontal: 28,
            backgroundColor: colors.inkWash,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 1,
            }}
          >
            {t('liuyao_result_label', { total, name: yaoEntry[0] })}
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: colors.text,
              letterSpacing: 8,
              fontWeight: '300',
            }}
          >
            {yaoEntry[1]}
          </Text>
        </View>
      )}
    </View>
  )
}

// ── 样式 ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  coinsRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    minHeight: COIN_SIZE + 24,
    paddingTop: 20,
  },
  coin: {
    width: COIN_SIZE,
    height: COIN_SIZE,
  },
  coinAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  coinInner: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  coinShadow: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 3,
    opacity: 0.25,
    zIndex: -1,
  },
  squareHole: {
    position: 'absolute',
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    backgroundColor: HOLE_COLOR,
  },
  coinChar: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: HOLE_SIZE + 4,
  },
})
