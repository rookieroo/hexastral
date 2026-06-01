/**
 * 🎲 摇卦 Hook — 赛博周易的核心交互
 *
 * 使用 expo-sensors (Accelerometer) 监听手机摇晃
 * 使用 expo-haptics 提供沉浸式触觉反馈
 *
 * 交互设计：
 * 1. 用户写下问题 → 进入"摇卦模式"
 * 2. 双手握住手机摇晃，加速度越大震动越沉闷
 * 3. 达到阈值后"三枚铜钱落地"：重震 + 音效
 * 4. 完成 6 次 = 一个完整卦象（初爻→上爻）
 * 5. 将加速度数据作为熵源发送给后端
 *
 * 铜钱计值规则（传统六爻金钱卦）：
 *   字面（阳）= 3，背面（阴）= 2
 *   三枚之和：6=老阴(⚋○)，7=少阳(─)，8=少阴(⚋)，9=老阳(─×)
 */

import * as Haptics from 'expo-haptics'
import { Accelerometer } from 'expo-sensors'
import { useCallback, useEffect, useRef, useState } from 'react'

/** 单枚铜钱结果：3=字面（阳），2=背面（阴） */
export type CoinValue = 2 | 3

/** 单爻的铜钱结果：三枚铜钱的值及爻型 */
export interface YaoResult {
  /** 三枚铜钱各自的值 */
  coins: [CoinValue, CoinValue, CoinValue]
  /** 三枚铜钱之和（6=老阴, 7=少阳, 8=少阴, 9=老阳） */
  total: 6 | 7 | 8 | 9
}

export interface ShakeState {
  /** 当前是否在摇卦模式 */
  isShaking: boolean
  /** 当前摇晃强度 0-1 */
  intensity: number
  /** 已完成爻数 0-6 */
  completedYao: number
  /** 是否已完成（6 爻齐全） */
  isComplete: boolean
  /** 生成的熵源字符串 */
  entropy: string
  /** 累计加速度数据（用于生成动效） */
  accelerationHistory: { x: number; y: number; z: number; timestamp: number }[]
  /** 各爻铜钱结果（按爻序，index 0 = 初爻） */
  yaoResults: YaoResult[]
}

interface UseShakeDivinationOptions {
  /** 触发一爻的加速度阈值（默认 2.5g） */
  threshold?: number
  /** 两爻之间的冷却时间 ms（默认 800ms） */
  cooldown?: number
  /** 摇晃时的回调 */
  onShake?: (intensity: number) => void
  /** 完成一爻的回调（带铜钱结果） */
  onYaoComplete?: (yaoIndex: number, result: YaoResult) => void
  /** 全部完成的回调 */
  onComplete?: (entropy: string) => void
}

/**
 * 基于加速度数据生成三枚铜钱的值（2 或 3）
 * 使用加速度数据作为伪随机源——让每爻与物理运动绑定
 */
function castThreeCoins(x: number, y: number, z: number, timestamp: number): YaoResult {
  // 用加速度分量 + 时间戳构造三个独立的伪随机数
  const seed1 = Math.abs(Math.sin(x * 1234.567 + timestamp * 0.001))
  const seed2 = Math.abs(Math.sin(y * 9876.543 + timestamp * 0.002 + 137))
  const seed3 = Math.abs(Math.sin(z * 5432.109 + timestamp * 0.003 + 271))
  const c1: CoinValue = seed1 < 0.5 ? 2 : 3
  const c2: CoinValue = seed2 < 0.5 ? 2 : 3
  const c3: CoinValue = seed3 < 0.5 ? 2 : 3
  const total = (c1 + c2 + c3) as 6 | 7 | 8 | 9
  return { coins: [c1, c2, c3], total }
}

export function useShakeDivination(options: UseShakeDivinationOptions = {}) {
  const { threshold = 2.5, cooldown = 800, onShake, onYaoComplete, onComplete } = options

  const [state, setState] = useState<ShakeState>({
    isShaking: false,
    intensity: 0,
    completedYao: 0,
    isComplete: false,
    entropy: '',
    accelerationHistory: [],
    yaoResults: [],
  })

  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null)
  const lastYaoTimeRef = useRef(0)
  const entropyBufferRef = useRef<string[]>([])
  const isShakingRef = useRef(false)

  /** 开始摇卦 */
  const startShaking = useCallback(async () => {
    // 重置状态
    setState({
      isShaking: true,
      intensity: 0,
      completedYao: 0,
      isComplete: false,
      entropy: '',
      accelerationHistory: [],
      yaoResults: [],
    })
    entropyBufferRef.current = []
    lastYaoTimeRef.current = 0
    isShakingRef.current = true

    // 会话级随机种子 — 确保每次起卦唯一性
    const sessionSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
    entropyBufferRef.current.push(sessionSeed)

    // 设置采样频率 60Hz
    Accelerometer.setUpdateInterval(16)

    // 初始轻触觉提示 — "准备好了"
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // 开始监听
    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      if (!isShakingRef.current) return

      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const normalizedIntensity = Math.min(1, Math.max(0, (magnitude - 1) / (threshold - 0.5)))
      const now = Date.now()

      // 更新状态
      setState((prev) => {
        if (prev.isComplete) return prev

        const newHistory = [
          ...prev.accelerationHistory.slice(-30), // 只保留最近 30 帧
          { x, y, z, timestamp: now },
        ]

        // 持续震动反馈 — 强度跟随摇晃幅度
        if (normalizedIntensity > 0.3) {
          const style =
            normalizedIntensity > 0.8
              ? Haptics.ImpactFeedbackStyle.Heavy
              : normalizedIntensity > 0.5
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light
          Haptics.impactAsync(style)
          onShake?.(normalizedIntensity)
        }

        // 检查是否达到阈值（触发一爻）
        if (
          magnitude > threshold &&
          now - lastYaoTimeRef.current > cooldown &&
          prev.completedYao < 6
        ) {
          lastYaoTimeRef.current = now

          // 收集熵源数据（加速度 + 时间戳 + 随机数确保每爻唯一）
          const entropyPiece = `${x.toFixed(6)}${y.toFixed(6)}${z.toFixed(6)}${now}r${Math.random().toString(36).slice(2)}`
          entropyBufferRef.current.push(entropyPiece)

          // 用加速度数据生成铜钱结果（传统金钱卦）
          const yaoResult = castThreeCoins(x, y, z, now)

          const newCompleted = prev.completedYao + 1
          const newYaoResults = [...prev.yaoResults, yaoResult]

          // 重击触觉 — "铜钱落地"
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          onYaoComplete?.(newCompleted - 1, yaoResult)

          if (newCompleted >= 6) {
            // 完成！三震 + 通知
            setTimeout(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            }, 100)
            setTimeout(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            }, 250)

            const fullEntropy = entropyBufferRef.current.join(':')
            onComplete?.(fullEntropy)

            return {
              ...prev,
              intensity: normalizedIntensity,
              completedYao: 6,
              isComplete: true,
              entropy: fullEntropy,
              accelerationHistory: newHistory,
              yaoResults: newYaoResults,
            }
          }

          return {
            ...prev,
            intensity: normalizedIntensity,
            completedYao: newCompleted,
            accelerationHistory: newHistory,
            yaoResults: newYaoResults,
          }
        }

        return {
          ...prev,
          intensity: normalizedIntensity,
          accelerationHistory: newHistory,
        }
      })
    })
  }, [threshold, cooldown, onShake, onYaoComplete, onComplete])

  /** 停止摇卦 */
  const stopShaking = useCallback(() => {
    isShakingRef.current = false
    subscriptionRef.current?.remove()
    subscriptionRef.current = null
    setState((prev) => ({ ...prev, isShaking: false }))
  }, [])

  /** 重置 */
  const reset = useCallback(() => {
    stopShaking()
    setState({
      isShaking: false,
      intensity: 0,
      completedYao: 0,
      isComplete: false,
      entropy: '',
      accelerationHistory: [],
      yaoResults: [],
    })
    entropyBufferRef.current = []
  }, [stopShaking])

  /** 手动投掷一爻（按钮触发，无需摇晃） */
  const castManually = useCallback(async () => {
    const now = Date.now()
    const x = (Math.random() - 0.5) * 6
    const y = (Math.random() - 0.5) * 6
    const z = (Math.random() - 0.5) * 6
    const entropyPiece = `${x.toFixed(6)}${y.toFixed(6)}${z.toFixed(6)}${now}r${Math.random().toString(36).slice(2)}`
    entropyBufferRef.current.push(entropyPiece)
    const yaoResult = castThreeCoins(x, y, z, now)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setState((prev) => {
      if (prev.isComplete || prev.completedYao >= 6) return prev
      const newCompleted = prev.completedYao + 1
      const newYaoResults = [...prev.yaoResults, yaoResult]
      onYaoComplete?.(newCompleted - 1, yaoResult)
      if (newCompleted >= 6) {
        const fullEntropy = entropyBufferRef.current.join(':')
        onComplete?.(fullEntropy)
        return {
          ...prev,
          completedYao: 6,
          isComplete: true,
          entropy: fullEntropy,
          yaoResults: newYaoResults,
        }
      }
      return { ...prev, completedYao: newCompleted, yaoResults: newYaoResults }
    })
  }, [onYaoComplete, onComplete])

  // 清理
  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove()
      isShakingRef.current = false
    }
  }, [])

  return {
    ...state,
    startShaking,
    stopShaking,
    reset,
    castManually,
  }
}
