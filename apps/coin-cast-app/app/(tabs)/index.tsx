import { coinCastSceneColors } from '@zhop/hexastral-tokens/satellites'
import {
  PortfolioBannedError,
  PortfolioQuotaExceededError,
  PortfolioSessionExpiredError,
} from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CoinCastSealLogo } from '@/components/CoinCastSealLogo'
import { CastingScene } from '@/components/casting-scene/CastingScene'
import {
  CONTAINER_SHAKE_DURATION_MS,
  PHYSICS_COMMIT_FALLBACK_MS,
} from '@/components/casting-scene/constants'
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
import { type CoinSkinId, DEFAULT_SKIN_ID, getCoinSkin, loadSelectedSkinId } from '@/lib/coin-skins'
import {
  checkDuplicateQuestion,
  cooldownRemainingMs,
  getFirstRitualAcknowledged,
  getLastReadingMeta,
  getMotionShakeEnabled,
  normalizeQuestion,
  recordReadingCompleted,
  rememberRecentQuestion,
} from '@/lib/coincast-ritual'
import { sampleDevSyntheticAccel } from '@/lib/dev-synthetic-accel'
import { canUseExpoGl } from '@/lib/gl-capabilities'
import { type SatelliteLocaleKey, useSatelliteI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

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
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 150,
      friction: 11,
      useNativeDriver: true,
    }).start()
  }, [anim])

  const isChanging = line.total === 6 || line.total === 9
  const isYang = line.total === 7 || line.total === 9
  const lineColor = isChanging ? accentColor : textColor
  const facesText = line.coins
    .map((c) => (c === 2 ? t('coinFaceA11yYin') : t('coinFaceA11yYang')))
    .join(', ')
  const rowA11y = t('homeYaoRowA11y', { n: yaoNumber, faces: facesText, total: line.total })

  return (
    <Animated.View
      style={[
        styles.hexRow,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
      ]}
      accessibilityLabel={rowA11y}
      accessible
    >
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
  const { locale, uiLocale, t } = useSatelliteI18n()
  const { colors, isDark } = useAppTheme()
  const [question, setQuestion] = useState('')
  const [yaoResults, setYaoResults] = useState<YaoResult[]>([])
  const [roundEntropyHashes, setRoundEntropyHashes] = useState<string[]>([])
  const [motionEnabled, setMotionEnabled] = useState(true)
  const [firstAck, setFirstAck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastShakeRef = useRef(0)
  const glEnabled = useMemo(() => canUseExpoGl(), [])
  const entitlements = useEntitlements()
  const coincastPro = hasEntitlement(entitlements, 'coincast_pro')
  const [selectedSkinId, setSelectedSkinId] = useState<CoinSkinId>(DEFAULT_SKIN_ID)
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
  const overlayPulse = useRef(new Animated.Value(1)).current
  const pendingCommitRef = useRef<{ hash: string; seed: number } | null>(null)
  const shakeDriveRef = useRef({ x: 0, y: 0, z: 0, mag: 0 })
  /** Dev physics toss: keep synthetic accel for whole flight (and skip real accelerometer overwriting ref). */
  const devPhysicsAutoShakeRef = useRef(false)
  const [devHoldSyntheticDrive, setDevHoldSyntheticDrive] = useState(false)
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
      overlayPulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(overlayPulse, {
          toValue: 1.25,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(overlayPulse, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => {
      loop.stop()
    }
  }, [breathingOverlayVisible, overlayPulse])

  useFocusEffect(
    useCallback(() => {
      void getFirstRitualAcknowledged().then(setFirstAck)
      void loadSelectedSkinId().then(setSelectedSkinId)
    }, [])
  )

  /** Dev: synthetic accelerometer during toss — Dev physics button runs whole flight; hold boosts intensity. */
  useEffect(() => {
    if (!__DEV__ || !glEnabled) return
    if (!tossAnimating) return
    if (!devHoldSyntheticDrive && !devPhysicsAutoShakeRef.current) return
    const t0 = performance.now()
    const id = setInterval(() => {
      const t = (performance.now() - t0) / 1000
      const intensity = devHoldSyntheticDrive ? 1.34 : 1.08
      shakeDriveRef.current = sampleDevSyntheticAccel(t, { intensity })
    }, 16)
    return () => {
      clearInterval(id)
      shakeDriveRef.current = { x: 0, y: 0, z: 0, mag: 0 }
    }
  }, [devHoldSyntheticDrive, tossAnimating, glEnabled])

  const completed = yaoResults.length
  const canShakeBase =
    question.trim().length >= 2 && completed < 6 && !loading && !(glEnabled && tossAnimating)
  const canCommit = question.trim().length >= 2 && completed === 6 && !loading

  const commitLine = useCallback((result: YaoResult, hash: string) => {
    setYaoResults((prev) => [...prev, result])
    setRoundEntropyHashes((prev) => [...prev, hash])
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Alert.alert(t('waYingTitle'), t('waYingMessage'), [{ text: t('waYingAck') }])
        return
      }

      commitLine(payload.result, pending.hash)
    },
    [clearAccel, commitLine, t]
  )

  const impactHaptic = useCallback(() => {
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

  const tryDevPhysicsToss = useCallback(async () => {
    if (!__DEV__) return
    devPhysicsAutoShakeRef.current = true
    await resolveToss({ devBypassGuards: true })
    if (!live.current.tossAnimating) {
      devPhysicsAutoShakeRef.current = false
    }
  }, [resolveToss])

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
            { text: t('alertQuotaSignIn'), onPress: () => router.push('/(tabs)/me') },
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
      yaoNumber: 6 - idx,
      key: `${idx}_${line.total}_${line.coins.join('')}`,
    }))
  }, [yaoResults])

  const dots = useMemo(() => Array.from({ length: 6 }, (_, i) => i < completed), [completed])

  /** Warm wood-adjacent tone (see altar albedo README) — matches fog/hemisphere to hide top seam. */
  const castingBackdrop = isDark
    ? coinCastSceneColors.castingBackdropDark
    : coinCastSceneColors.castingBackdropLight

  const activeSkin = getCoinSkin(selectedSkinId)
  const effectiveSkin = activeSkin.pro && !coincastPro ? getCoinSkin(DEFAULT_SKIN_ID) : activeSkin

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.inner}>
          <View style={styles.logoWrap}>
            <CoinCastSealLogo />
          </View>

          <TextInput
            placeholder={t('castPlaceholder')}
            accessibilityLabel={t('homeInputA11y')}
            placeholderTextColor={colors.dim}
            multiline
            numberOfLines={3}
            editable={yaoResults.length === 0}
            style={[
              styles.input,
              { borderColor: colors.separator, color: colors.text, backgroundColor: colors.card },
            ]}
            value={question}
            onChangeText={setQuestion}
            blurOnSubmit
            returnKeyType='done'
          />

          <View
            style={[
              styles.sceneHost,
              { borderColor: colors.separator, backgroundColor: colors.inkWash },
            ]}
          >
            {glEnabled ? (
              <CastingScene
                tossRevision={tossRevision}
                impulseSeed={activeToss?.seed ?? 0}
                sceneBg={castingBackdrop}
                arenaWallsActive={tossAnimating}
                cameraPhase={castCameraPhase}
                onPhysicsSettled={handlePhysicsSettled}
                onImpact={impactHaptic}
                shakeDriveRef={shakeDriveRef}
                coinYang={effectiveSkin.yang}
                coinYin={effectiveSkin.yin}
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
                  },
                ]}
                accessibilityHint={t('homeYaoCoinBarLegend')}
              >
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

          <View style={styles.dotsRow} accessibilityLabel={t('homeProgressA11y', { n: completed })}>
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
                styles.shakeBtn,
                { borderColor: colors.separator, backgroundColor: colors.card },
              ]}
              onPress={() => void tryShake()}
              accessibilityRole='button'
              disabled={!canShakeBase}
            >
              <Text style={[styles.actionText, { color: canShakeBase ? colors.text : colors.dim }]}>
                {t('homeShake')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.castBtn,
                {
                  borderColor: colors.separator,
                  backgroundColor: canCommit ? (isDark ? colors.text : colors.tint) : colors.card,
                },
              ]}
              onPress={() => void castNow()}
              accessibilityRole='button'
              disabled={!canCommit}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: canCommit ? (isDark ? colors.bg : colors.tintFg) : colors.dim,
                  },
                ]}
              >
                {loading ? t('homeCastingButton') : t('homeCast')}
              </Text>
            </Pressable>
          </View>

          {__DEV__ && glEnabled ? (
            <View style={styles.devPhysicsBlock}>
              <Pressable
                style={[styles.devPhysicsBtn, { borderColor: colors.separator }]}
                onPress={() => void tryDevPhysicsToss()}
                onPressIn={() => setDevHoldSyntheticDrive(true)}
                onPressOut={() => setDevHoldSyntheticDrive(false)}
                accessibilityRole='button'
                accessibilityLabel={t('homeDevPhysicsButton')}
                accessibilityHint={t('homeDevPhysicsJiggleHint')}
                disabled={loading || completed >= 6}
              >
                <Text
                  style={[
                    styles.devPhysicsBtnText,
                    {
                      color: loading || completed >= 6 ? colors.dim : colors.secondary,
                    },
                  ]}
                >
                  {t('homeDevPhysicsButton')}
                </Text>
              </Pressable>
              <Text style={[styles.devPhysicsJiggleHint, { color: colors.dim }]}>
                {t('homeDevPhysicsJiggleHint')}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.secondary }]}>{error}</Text> : null}
          {blockIosDevAccelShake && motionEnabled ? (
            <Text style={[styles.devShakeHint, { color: colors.dim }]}>
              {t('homeDevShakeHint')}
            </Text>
          ) : null}
        </View>
      </TouchableWithoutFeedback>
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
            style={[
              styles.breathOverlayRing,
              {
                borderColor: colors.accent,
                transform: [{ scale: overlayPulse }],
              },
            ]}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
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
  inner: { flex: 1, gap: 10, minHeight: 0 },
  logoWrap: { alignItems: 'center', paddingVertical: 2 },
  input: {
    borderWidth: 0.5,
    padding: 12,
    borderRadius: 0,
    textAlignVertical: 'top',
    minHeight: 64,
  },
  sceneHost: {
    flex: 1,
    minHeight: 200,
    borderWidth: 0.5,
    position: 'relative',
    overflow: 'hidden',
  },
  yaoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 10,
    maxHeight: 220,
  },
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
    borderRadius: 0,
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
  coinFaceYangBar: { width: 12, height: 5 },
  coinFaceYinWrap: {
    width: 12,
    height: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinFaceYinHalf: { width: 4, height: 5 },
  lineFull: { width: 118, height: 6 },
  lineBrokenWrap: { width: 118, flexDirection: 'row', justifyContent: 'space-between' },
  lineHalf: { width: 54, height: 6 },
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
  devPhysicsBlock: { alignSelf: 'stretch', gap: 4, marginBottom: 4 },
  devPhysicsBtn: {
    alignSelf: 'stretch',
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  devPhysicsBtnText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  devPhysicsJiggleHint: { fontSize: 10, textAlign: 'center', lineHeight: 14, paddingHorizontal: 6 },
  shakeBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
  },
  castBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  error: { fontSize: 13, textAlign: 'center' },
  devShakeHint: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
})
