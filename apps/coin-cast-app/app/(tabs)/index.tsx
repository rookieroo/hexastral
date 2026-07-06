import { useHaptic, useTheme } from '@zhop/core-ui'
import { coinCastSceneColors } from '@zhop/hexastral-tokens/satellites'
import {
  PortfolioBannedError,
  PortfolioQuotaExceededError,
  PortfolioSessionExpiredError,
} from '@zhop/portfolio-client'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useRouter } from 'expo-router'
import { Pencil, Settings2, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CoinCastSealLogo } from '@/components/CoinCastSealLogo'
import {
  CONTAINER_SHAKE_DURATION_MS,
  PHYSICS_COMMIT_FALLBACK_MS,
} from '@/components/casting-scene/constants'
import { LazyCastingScene, preloadCastingScene } from '@/components/casting-scene/LazyCastingScene'
import { useSensorEntropy } from '@/components/casting-scene/useSensorEntropy'
import { runPortfolioPreview } from '@/lib/api'
import {
  coinsFromSeed,
  coinsFromSeedSyncFallback,
  fingerprintSamples,
  hashEntropyMaterial,
  seedUInt32FromHashHex,
} from '@/lib/casting-entropy'
import type { PhysicsSettlePayload, YaoResult } from '@/lib/casting-types'
import { type CoinSkinId, DEFAULT_COIN_SKIN_ID, getCoinSkinId } from '@/lib/coin-skins'
import {
  checkDuplicateQuestion,
  cooldownRemainingMs,
  getCastHapticsEnabled,
  getFirstRitualAcknowledged,
  getLastReadingMeta,
  getMotionShakeEnabled,
  normalizeQuestion,
  recordReadingCompleted,
  rememberRecentQuestion,
} from '@/lib/coincast-ritual'
import { canUseExpoGl } from '@/lib/gl-capabilities'
import { type SatelliteLocaleKey, useSatelliteI18n } from '@/lib/i18n'
import { yaoNumberForOverlayRow } from '@/lib/yao-display'

interface AccelerometerSample {
  x: number
  y: number
  z: number
}

interface AccelerometerSub {
  remove: () => void
}

interface AccelerometerModule {
  setUpdateInterval: (ms: number) => void
  addListener: (listener: (sample: AccelerometerSample) => void) => AccelerometerSub
}

/** Dev-only: skip first-cast ack, cooldown, and min question length to exercise WebGL physics. */
type ResolveTossOpts = { devBypassGuards?: boolean }

function formatCoincastBanRemaining(iso: string | null, uiLocale: string): string {
  if (!iso) return '—'
  const end = Date.parse(iso)
  if (!Number.isFinite(end)) return '—'
  const ms = Math.max(0, end - Date.now())
  const minsTotal = Math.max(1, Math.ceil(ms / 60_000))
  const hours = Math.floor(minsTotal / 60)
  const mins = minsTotal % 60
  if (uiLocale === 'ja') {
    return hours > 0 ? `約${hours}時間${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh-Hant') {
    return hours > 0 ? `約${hours}小時${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh') {
    return hours > 0 ? `约${hours}小时${mins}分` : `约${mins}分`
  }
  return hours > 0 ? `~${hours}h ${mins}m` : `~${mins}m`
}

function resolveAccelerometer(): AccelerometerModule | null {
  try {
    const mod = require('expo-sensors') as { Accelerometer?: AccelerometerModule }
    return mod.Accelerometer ?? null
  } catch {
    return null
  }
}

function CoinFaceMiniGlyph({ value, faceColor }: { value: 2 | 3; faceColor: string }) {
  if (value === 3) {
    return <View style={[styles.coinFaceYangBar, { backgroundColor: faceColor }]} />
  }
  return (
    <View style={styles.coinFaceYinWrap}>
      <View style={[styles.coinFaceYinHalf, { backgroundColor: faceColor }]} />
      <View style={[styles.coinFaceYinHalf, { backgroundColor: faceColor }]} />
    </View>
  )
}

function HexOverlayHeader({
  secondaryColor,
  t,
}: {
  secondaryColor: string
  t: (key: SatelliteLocaleKey, vars?: Record<string, string | number>) => string
}) {
  return (
    <View style={[styles.hexHeaderRow, { borderBottomColor: secondaryColor }]} accessible={false}>
      <Text style={[styles.hexHeaderLabel, { color: secondaryColor }]}>{t('homeYaoPosition')}</Text>
      <View style={styles.hexHeaderSpacer} />
      <Text style={[styles.hexHeaderLabel, { color: secondaryColor }]}>{t('homeYaoThrow')}</Text>
    </View>
  )
}

function AnimatedYaoLine({
  line,
  yaoNumber,
  textColor,
  secondaryColor,
  accentColor,
  t,
}: {
  line: YaoResult
  yaoNumber: number
  textColor: string
  secondaryColor: string
  accentColor: string
  t: (key: SatelliteLocaleKey, vars?: Record<string, string | number>) => string
}) {
  const anim = useSharedValue(0)

  useEffect(() => {
    anim.value = withSpring(1, { stiffness: 150, damping: 11 })
  }, [anim])

  const rowStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [14, 0]) }],
  }))

  const isChanging = line.total === 6 || line.total === 9
  const isYang = line.total === 7 || line.total === 9
  const lineColor = isChanging ? accentColor : textColor
  const facesText = line.coins
    .map((c) => (c === 2 ? t('coinFaceA11yYin') : t('coinFaceA11yYang')))
    .join(', ')
  const rowA11y = t('homeYaoRowA11y', { n: yaoNumber, faces: facesText, total: line.total })

  return (
    <Animated.View style={[styles.hexRow, rowStyle]} accessibilityLabel={rowA11y} accessible>
      <Text style={[styles.hexLabel, { color: secondaryColor }]}>{yaoNumber}</Text>
      <View style={styles.coinFacesRow} accessible={false}>
        {line.coins.map((c, i) => (
          <CoinFaceMiniGlyph key={i} value={c} faceColor={lineColor} />
        ))}
      </View>
      {isYang ? (
        <View style={[styles.lineFull, { backgroundColor: lineColor }]} />
      ) : (
        <View style={styles.lineBrokenWrap}>
          <View style={[styles.lineHalf, { backgroundColor: lineColor }]} />
          <View style={[styles.lineHalf, { backgroundColor: lineColor }]} />
        </View>
      )}
      <Text style={[styles.hexMark, { color: isChanging ? accentColor : secondaryColor }]}>
        {line.total}
      </Text>
    </Animated.View>
  )
}

export default function CoinCastHomeScreen() {
  const router = useRouter()
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const { locale, uiLocale, t } = useSatelliteI18n()
  const { colors, isDark } = useTheme()
  const [question, setQuestion] = useState('')
  // Question entry now lives in a bottom sheet (opened on the first 摇卦), not a
  // persistent input at the top. `draftQuestion` is the in-sheet editor buffer.
  const [questionSheetOpen, setQuestionSheetOpen] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState('')
  const [yaoResults, setYaoResults] = useState<YaoResult[]>([])
  const [roundEntropyHashes, setRoundEntropyHashes] = useState<string[]>([])
  const [motionEnabled, setMotionEnabled] = useState(true)
  const hapticsEnabledRef = useRef(true)
  const [coinSkinId, setCoinSkinId] = useState<CoinSkinId>(DEFAULT_COIN_SKIN_ID)
  const [firstAck, setFirstAck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastShakeRef = useRef(0)
  const glEnabled = useMemo(() => canUseExpoGl(), [])
  /**
   * iOS dev builds: RN reserves device shake for the developer menu. Accel-driven cast is off unless
   * `EXPO_PUBLIC_IOS_DEV_ALLOW_ACCEL_SHAKE=1` (see `.env.example`). Physics uses the same path as the Shake button.
   */
  const blockIosDevAccelShake = useMemo(() => {
    if (Platform.OS !== 'ios' || !__DEV__) return false
    const allow =
      process.env.EXPO_PUBLIC_IOS_DEV_ALLOW_ACCEL_SHAKE === '1' ||
      process.env.EXPO_PUBLIC_IOS_DEV_ALLOW_ACCEL_SHAKE === 'true'
    return !allow
  }, [])
  const [tossAnimating, setTossAnimating] = useState(false)
  const [activeToss, setActiveToss] = useState<{ seed: number } | null>(null)
  const [tossRevision, setTossRevision] = useState(0)
  const [castCameraPhase, setCastCameraPhase] = useState<'idle' | 'ritual' | 'table'>('idle')

  useEffect(() => {
    if (!tossAnimating) {
      setCastCameraPhase('idle')
      return
    }
    setCastCameraPhase('ritual')
    const id = setTimeout(() => {
      setCastCameraPhase('table')
    }, CONTAINER_SHAKE_DURATION_MS)
    return () => clearTimeout(id)
  }, [tossAnimating, tossRevision])

  const [breathingOverlayVisible, setBreathingOverlayVisible] = useState(false)
  const breathingShownRef = useRef(false)
  const overlayPulse = useSharedValue(1)
  const overlayRingStyle = useAnimatedStyle(() => ({ transform: [{ scale: overlayPulse.value }] }))
  const pendingCommitRef = useRef<{ hash: string; seed: number } | null>(null)
  const shakeDriveRef = useRef({ x: 0, y: 0, z: 0, mag: 0 })
  /** Dev physics toss: keep synthetic accel for whole flight (and skip real accelerometer overwriting ref). */
  const devPhysicsAutoShakeRef = useRef(false)
  const { pushSample, snapshot, clear: clearAccel } = useSensorEntropy()

  const live = useRef({
    question,
    yaoResults,
    loading,
    firstAck,
    motionEnabled,
    tossAnimating,
  })
  live.current = { question, yaoResults, loading, firstAck, motionEnabled, tossAnimating }

  useEffect(() => {
    void (async () => {
      const [ack, motion] = await Promise.all([
        getFirstRitualAcknowledged(),
        getMotionShakeEnabled(),
      ])
      setFirstAck(ack)
      setMotionEnabled(motion)
    })()
  }, [])

  useEffect(() => {
    if (yaoResults.length === 0) {
      breathingShownRef.current = false
    }
  }, [yaoResults.length])

  useEffect(() => {
    if (!breathingOverlayVisible) {
      overlayPulse.value = 1
      return
    }
    overlayPulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    )
  }, [breathingOverlayVisible, overlayPulse])

  useFocusEffect(
    useCallback(() => {
      void getFirstRitualAcknowledged().then(setFirstAck)
      void getCastHapticsEnabled().then((v) => {
        hapticsEnabledRef.current = v
      })
      void getCoinSkinId().then(setCoinSkinId)
    }, [])
  )

  useEffect(() => {
    if (glEnabled) preloadCastingScene()
  }, [glEnabled])

  const completed = yaoResults.length
  const canShakeBase =
    question.trim().length >= 2 && completed < 6 && !loading && !(glEnabled && tossAnimating)
  const canCommit = question.trim().length >= 2 && completed === 6 && !loading

  const commitLine = useCallback((result: YaoResult, hash: string) => {
    setYaoResults((prev) => [...prev, result])
    setRoundEntropyHashes((prev) => [...prev, hash])
    if (hapticsEnabledRef.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setError(null)
  }, [])

  const handlePhysicsSettled = useCallback(
    (payload: PhysicsSettlePayload) => {
      const pending = pendingCommitRef.current
      if (!pending) return
      pendingCommitRef.current = null
      setTossAnimating(false)
      if (__DEV__) devPhysicsAutoShakeRef.current = false

      if (payload.kind === 'wa_ying') {
        clearAccel()
        setYaoResults([])
        setRoundEntropyHashes([])
        setError(null)
        setActiveToss(null)
        setTossRevision(0)
        if (hapticsEnabledRef.current) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
        Alert.alert(t('waYingTitle'), t('waYingMessage'), [{ text: t('waYingAck') }])
        return
      }

      commitLine(payload.result, pending.hash)
    },
    [clearAccel, commitLine, t]
  )

  const impactHaptic = useCallback(() => {
    if (!hapticsEnabledRef.current) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const runEntropyCommit = useCallback(
    async (q: string, lineCount: number) => {
      const snap = snapshot()
      const fp = fingerprintSamples(snap, lineCount, normalizeQuestion(q))
      let hashHex: string
      let seed: number
      try {
        hashHex = await hashEntropyMaterial(fp)
        seed = seedUInt32FromHashHex(hashHex)
      } catch (err) {
        console.warn('[coincast] entropy hash failed', err)
        seed = seedUInt32FromHashHex('coincast_fallback')
        hashHex = 'fallback'
      }

      if (glEnabled) {
        pendingCommitRef.current = { hash: hashHex, seed }
        setActiveToss({ seed })
        setTossRevision((r) => r + 1)
        setTossAnimating(true)
        return
      }

      const result =
        hashHex === 'fallback' ? coinsFromSeedSyncFallback(snap, lineCount) : coinsFromSeed(seed)
      commitLine(result, hashHex)
    },
    [commitLine, glEnabled, snapshot]
  )

  const resolveToss = useCallback(
    async (opts?: ResolveTossOpts) => {
      const bypass = __DEV__ && opts?.devBypassGuards === true
      const {
        question: qRaw,
        loading: ld,
        firstAck: ack,
        yaoResults: lines,
        tossAnimating: tossing,
      } = live.current
      if (ld || lines.length >= 6 || tossing) return

      const q = bypass && qRaw.trim().length < 2 ? '__dev_physics__' : qRaw
      if (!bypass && qRaw.trim().length < 2) return

      if (!bypass && !ack) {
        Alert.alert(t('alertFirstTitle'), t('alertFirstMsg'), [
          { text: t('alertContinue'), style: 'cancel' },
          { text: t('alertFirstOpen'), onPress: () => router.push('/before-cast') },
        ])
        return
      }

      if (!bypass && lines.length === 0) {
        const meta = await getLastReadingMeta()
        if (meta) {
          const rem = cooldownRemainingMs(meta.at)
          if (rem > 0) {
            const mins = Math.max(1, Math.ceil(rem / 60_000))
            Alert.alert(t('alertCooldownTitle'), t('alertCooldownMsg', { m: mins }))
            return
          }
        }
      }

      const afterDuplicateAndBreathing = async () => {
        if (!bypass && lines.length === 0 && !breathingShownRef.current) {
          breathingShownRef.current = true
          setBreathingOverlayVisible(true)
          await new Promise<void>((r) => setTimeout(r, 2500))
          setBreathingOverlayVisible(false)
        }
        await runEntropyCommit(q, lines.length)
      }

      if (!bypass && lines.length === 0) {
        const isDup = await checkDuplicateQuestion(normalizeQuestion(qRaw.trim()))
        if (isDup) {
          await new Promise<void>((resolve) => {
            Alert.alert(t('alertDuplicateTitle'), t('alertDuplicateMsg'), [
              { text: t('alertDuplicateCancel'), style: 'cancel', onPress: () => resolve() },
              {
                text: t('alertDuplicateContinue'),
                onPress: () => {
                  void (async () => {
                    await afterDuplicateAndBreathing()
                    resolve()
                  })()
                },
              },
            ])
          })
          return
        }
      }

      await afterDuplicateAndBreathing()
    },
    [router, runEntropyCommit, t]
  )

  const tryShake = useCallback(async () => {
    await resolveToss()
  }, [resolveToss])

  // Open the question sheet (only before any line is cast — the question is
  // locked once the hexagram starts building).
  const openQuestionSheet = useCallback(() => {
    if (live.current.yaoResults.length > 0) return
    setDraftQuestion(live.current.question)
    setQuestionSheetOpen(true)
  }, [])

  // Confirm the sheet's question, then kick off the casting flow immediately.
  const confirmQuestion = useCallback(() => {
    const q = draftQuestion.trim()
    if (q.length < 2) return
    setQuestion(q)
    // resolveToss reads the question from the live ref — set it synchronously so
    // the first toss begins right after the sheet confirms (no extra tap).
    live.current.question = q
    setQuestionSheetOpen(false)
    Keyboard.dismiss()
    void resolveToss()
  }, [draftQuestion, resolveToss])

  const requestAbort = useCallback(() => {
    const n = live.current.yaoResults.length
    if (n === 0 || n >= 6 || live.current.loading) return
    Alert.alert(t('alertAbortTitle'), t('alertAbortMsg'), [
      { text: t('alertContinue'), style: 'cancel' },
      {
        text: t('alertAbortConfirm'),
        style: 'destructive',
        onPress: () => {
          if (__DEV__) devPhysicsAutoShakeRef.current = false
          setYaoResults([])
          setRoundEntropyHashes([])
          setError(null)
          pendingCommitRef.current = null
          setTossAnimating(false)
          setActiveToss(null)
          setTossRevision(0)
          clearAccel()
        },
      },
    ])
  }, [clearAccel, t])

  useEffect(() => {
    if (blockIosDevAccelShake) return
    if (!motionEnabled || !firstAck || loading) return
    const accelerometer = resolveAccelerometer()
    if (!accelerometer) return
    accelerometer.setUpdateInterval(120)
    const sub = accelerometer.addListener(({ x, y, z }) => {
      pushSample(x, y, z)
      const {
        question: q,
        yaoResults: lines,
        loading: ld,
        firstAck: ack,
        motionEnabled: mot,
        tossAnimating: tossing,
      } = live.current

      if (glEnabled && tossing) {
        if (__DEV__ && devPhysicsAutoShakeRef.current) {
          return
        }
        const magnitude = Math.sqrt(x * x + y * y + z * z)
        shakeDriveRef.current = { x, y, z, mag: magnitude }
        return
      }

      if (!mot || ld || !ack || tossing) return
      if (q.trim().length < 2 || lines.length >= 6) return
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const now = Date.now()
      if (magnitude < 2.2) return
      if (now - lastShakeRef.current < 750) return
      lastShakeRef.current = now
      void resolveToss()
    })
    return () => {
      sub.remove()
    }
  }, [blockIosDevAccelShake, glEnabled, motionEnabled, firstAck, loading, pushSample, resolveToss])

  /** If WebGL physics never reports settle (device GL quirks), still commit the pending line. */
  useEffect(() => {
    if (!glEnabled || !tossAnimating) return
    const id = setTimeout(() => {
      const pending = pendingCommitRef.current
      if (!pending) return
      pendingCommitRef.current = null
      const fallback = coinsFromSeed(pending.seed)
      commitLine(fallback, pending.hash)
      setTossAnimating(false)
      if (__DEV__) devPhysicsAutoShakeRef.current = false
    }, PHYSICS_COMMIT_FALLBACK_MS)
    return () => clearTimeout(id)
  }, [glEnabled, tossAnimating, commitLine])

  const castNow = async () => {
    if (!canCommit) return
    try {
      setLoading(true)
      setError(null)
      const entropyMaterial = roundEntropyHashes.join(':')
      const preview = await runPortfolioPreview(
        {
          question: question.trim(),
          entropy: `coincast_${Date.now()}_${entropyMaterial}`,
          yaoValues: yaoResults.map((item) => item.total),
        },
        locale
      )
      if (preview.mode === 'refused') {
        let body = `${preview.reason}\n\n${t('alertRefusedTradition')}`
        if (preview.showViolationWarning) {
          body += `\n\n${t('alertRefusedWarn')}`
        }
        Alert.alert(t('alertRefusedTitle'), body)
        return
      }
      const norm = normalizeQuestion(question)
      await rememberRecentQuestion(norm)
      await recordReadingCompleted(norm)
      setQuestion('')
      setYaoResults([])
      setRoundEntropyHashes([])
      setError(null)
      router.push({
        pathname: '/result',
        params: {
          readingId: preview.readingId,
          payload: encodeURIComponent(JSON.stringify(preview.output)),
        },
      })
    } catch (err) {
      if (err instanceof PortfolioQuotaExceededError) {
        const msg = err.guestDailyLimit ? t('alertQuotaGuestDailyMsg') : t('alertQuotaMsg')
        if (err.guestDailyLimit) {
          Alert.alert(t('alertQuotaTitle'), msg, [
            { text: t('alertContinue'), style: 'cancel' },
            { text: t('alertQuotaSignIn'), onPress: () => router.push('/(tabs)/profile') },
            { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
          ])
        } else {
          Alert.alert(t('alertQuotaTitle'), msg, [
            { text: t('alertContinue'), style: 'cancel' },
            { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
          ])
        }
        return
      }
      if (err instanceof PortfolioSessionExpiredError) {
        setError(t('homeError'))
        return
      }
      if (err instanceof PortfolioBannedError) {
        const when = formatCoincastBanRemaining(err.bannedUntil, uiLocale)
        Alert.alert(t('alertBannedTitle'), t('alertBannedMsg', { time: when }))
        return
      }
      console.warn('[coincast] preview failed from home', err)
      setError(t('homeError'))
    } finally {
      setLoading(false)
    }
  }

  const lineRows = useMemo(() => {
    const rev = [...yaoResults].reverse()
    return rev.map((line, idx) => ({
      line,
      yaoNumber: yaoNumberForOverlayRow(yaoResults.length, idx),
      key: `${idx}_${line.total}_${line.coins.join('')}`,
    }))
  }, [yaoResults])

  const dots = useMemo(() => Array.from({ length: 6 }, (_, i) => i < completed), [completed])

  /** Warm wood-adjacent tone (see altar albedo README) — matches fog/hemisphere to hide top seam. */
  const castingBackdrop = isDark
    ? coinCastSceneColors.castingBackdropDark
    : coinCastSceneColors.castingBackdropLight

  // One adaptive primary button drives the whole flow: write the question (sheet)
  // → 摇卦 each line → 成卦 to commit. The device-shake path stays live in parallel.
  const hasQuestion = question.trim().length >= 2
  const primaryIsCommit = completed === 6
  const primaryLabel = primaryIsCommit
    ? loading
      ? t('homeCastingButton')
      : t('homeCast')
    : t('homeShake')
  const primaryDisabled = primaryIsCommit ? !canCommit : hasQuestion ? !canShakeBase : loading
  const onPrimary = () => {
    if (primaryIsCommit) {
      void castNow()
      return
    }
    if (!hasQuestion) {
      openQuestionSheet()
      return
    }
    void tryShake()
  }

  const openSettings = useCallback(() => {
    void haptic('light')
    router.push('/(tabs)/profile')
  }, [haptic, router])

  const swipeToSettings = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX < -55 || e.velocityX < -650) runOnJS(openSettings)()
    })

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <CoinCastSealLogo />
        <Pressable
          onPress={openSettings}
          accessibilityRole='button'
          accessibilityLabel={t('stackSettings')}
          hitSlop={12}
        >
          <Settings2 size={22} color={colors.accent} strokeWidth={1.6} />
        </Pressable>
      </View>

      <GestureDetector gesture={swipeToSettings}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.inner}>
            <Pressable
              onPress={openQuestionSheet}
              disabled={completed > 0}
              accessibilityRole='button'
              accessibilityLabel={t('homeInputA11y')}
              style={({ pressed }) => [
                styles.questionChip,
                {
                  borderColor: colors.separator,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={2}
                style={{
                  flex: 1,
                  fontSize: 15,
                  lineHeight: 21,
                  color: hasQuestion ? colors.text : colors.dim,
                }}
              >
                {hasQuestion ? question : t('homeQuestionPrompt')}
              </Text>
              {completed === 0 ? <Pencil size={16} color={colors.dim} strokeWidth={1.6} /> : null}
            </Pressable>

            <View
              style={[
                styles.sceneHost,
                { borderColor: colors.separator, backgroundColor: colors.inkWash },
              ]}
            >
              {glEnabled ? (
                <LazyCastingScene
                  tossRevision={tossRevision}
                  impulseSeed={activeToss?.seed ?? 0}
                  coinSkinId={coinSkinId}
                  sceneBg={castingBackdrop}
                  arenaWallsActive={tossAnimating}
                  cameraPhase={castCameraPhase}
                  onPhysicsSettled={handlePhysicsSettled}
                  onImpact={impactHaptic}
                  shakeDriveRef={shakeDriveRef}
                  style={{ width: '100%', flex: 1, minHeight: 0 }}
                />
              ) : (
                <View style={styles.glFallback}>
                  <Text style={[styles.glFallbackText, { color: colors.secondary }]}>
                    {t('homeGlFallback')}
                  </Text>
                </View>
              )}

              {completed > 0 && completed < 6 ? (
                <Pressable
                  style={[styles.abortBtnScene, { borderColor: colors.separator }]}
                  onPress={requestAbort}
                  accessibilityRole='button'
                  accessibilityLabel={t('homeAbortA11y')}
                  hitSlop={12}
                >
                  <X size={18} color={colors.secondary} strokeWidth={1.5} />
                </Pressable>
              ) : null}

              {lineRows.length > 0 ? (
                <View
                  style={[
                    styles.yaoOverlay,
                    {
                      backgroundColor: isDark
                        ? coinCastSceneColors.yaoPanelOverlayDark
                        : coinCastSceneColors.yaoPanelOverlayLight,
                      borderTopColor: colors.separator,
                      borderTopWidth: 0.5,
                    },
                  ]}
                  accessibilityHint={t('homeYaoCoinBarLegend')}
                >
                  <HexOverlayHeader secondaryColor={colors.secondary} t={t} />
                  {lineRows.map((row) => (
                    <AnimatedYaoLine
                      key={row.key}
                      line={row.line}
                      yaoNumber={row.yaoNumber}
                      textColor={colors.text}
                      secondaryColor={colors.secondary}
                      accentColor={colors.accent}
                      t={t}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            <View
              style={styles.dotsRow}
              accessibilityLabel={t('homeProgressA11y', { n: completed })}
            >
              {dots.map((on, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: on ? colors.text : `${colors.secondary}33`,
                      borderColor: colors.separator,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: primaryDisabled ? colors.accentGhost : colors.accent },
                ]}
                onPress={onPrimary}
                accessibilityRole='button'
                disabled={primaryDisabled}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: primaryDisabled ? colors.dim : colors.tintFg },
                  ]}
                >
                  {primaryLabel}
                </Text>
              </Pressable>
            </View>

            {error ? (
              <Text style={[styles.error, { color: colors.secondary }]}>{error}</Text>
            ) : null}
            {blockIosDevAccelShake && motionEnabled ? (
              <Text style={[styles.devShakeHint, { color: colors.dim }]}>
                {t('homeDevShakeHint')}
              </Text>
            ) : null}
          </View>
        </TouchableWithoutFeedback>
      </GestureDetector>
      {breathingOverlayVisible ? (
        <View
          style={[styles.breathOverlayRoot, { backgroundColor: `${colors.bg}e6` }]}
          pointerEvents='auto'
          accessibilityViewIsModal
        >
          <Text style={[styles.breathOverlayText, { color: colors.text }]}>
            {t('breathingOverlayText')}
          </Text>
          <Animated.View
            style={[styles.breathOverlayRing, overlayRingStyle, { borderColor: colors.accent }]}
          />
        </View>
      ) : null}

      {/* Question sheet — the single point of text entry. The iOS keyboard's
          built-in dictation mic covers voice input with no extra dependency. */}
      <SatelliteBottomSheet
        visible={questionSheetOpen}
        onClose={() => setQuestionSheetOpen(false)}
        title={t('questionSheetTitle')}
      >
        <View style={styles.sheetBody}>
          <TextInput
            autoFocus
            placeholder={t('castPlaceholder')}
            accessibilityLabel={t('homeInputA11y')}
            placeholderTextColor={colors.dim}
            multiline
            style={[
              styles.sheetInput,
              {
                borderColor: colors.separator,
                color: colors.text,
                backgroundColor: colors.cardElevated,
              },
            ]}
            value={draftQuestion}
            onChangeText={setDraftQuestion}
          />
          <Pressable
            onPress={confirmQuestion}
            disabled={draftQuestion.trim().length < 2}
            accessibilityRole='button'
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  draftQuestion.trim().length < 2 ? colors.accentGhost : colors.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                { color: draftQuestion.trim().length < 2 ? colors.dim : colors.tintFg },
              ]}
            >
              {t('questionSheetCta')}
            </Text>
          </Pressable>
        </View>
      </SatelliteBottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breathOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  breathOverlayText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  breathOverlayRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  inner: { flex: 1, gap: 10, minHeight: 0, paddingBottom: 12 },
  questionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  sceneHost: {
    flex: 1,
    minHeight: 200,
    borderWidth: 0.5,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  yaoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    maxHeight: 240,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  hexHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  hexHeaderLabel: { fontSize: 9, letterSpacing: 0.6, width: 16, textAlign: 'center' },
  hexHeaderSpacer: { width: 162 },
  glFallback: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  glFallbackText: { fontSize: 13, textAlign: 'center', letterSpacing: 0.3 },
  abortBtnScene: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 18,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hexLabel: { width: 16, textAlign: 'right', fontSize: 10 },
  coinFacesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 44,
    justifyContent: 'center',
  },
  coinFaceYangBar: { width: 12, height: 5, borderRadius: 2 },
  coinFaceYinWrap: {
    width: 12,
    height: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinFaceYinHalf: { width: 4, height: 5, borderRadius: 2 },
  lineFull: { width: 118, height: 6, borderRadius: 3 },
  lineBrokenWrap: { width: 118, flexDirection: 'row', justifyContent: 'space-between' },
  lineHalf: { width: 54, height: 6, borderRadius: 3 },
  hexMark: { width: 16, textAlign: 'left', fontSize: 10, fontWeight: '600' },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  actions: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  sheetBody: { gap: 16, paddingTop: 4 },
  sheetInput: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
    minHeight: 96,
    fontSize: 16,
    lineHeight: 22,
  },
  actionText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  error: { fontSize: 13, textAlign: 'center' },
  devShakeHint: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
})
