/**
 * Home — empty stack + in-place capture, or filled photo wheel.
 * Empty tap: login → consent → birth (if needed) → fan → capture on this screen.
 * New period (with history): same fan → capture — three fresh photos, no carry.
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { getPortfolioUserId, hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CaptureStudioScreen } from '@/components/CaptureStudioScreen'
import { OffsetPhotoStack } from '@/components/OffsetPhotoStack'
import { PeriodPhotoWheel } from '@/components/PeriodPhotoWheel'
import { ReadingProcessingPanel } from '@/components/ReadingProcessingPanel'
import { SealMark } from '@/components/SealMark'
import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import { hasSignedInSession } from '@/lib/account'
import { fetchBiometricConsent } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { consumeHomeCaptureHandoff, setHomeCaptureHandoff } from '@/lib/home-capture-handoff'
import { resolveLocale } from '@/lib/i18n'
import { consumeIntroHomeHandoff } from '@/lib/intro-home-handoff'
import { loadLastReadingPhotoSnapshot } from '@/lib/reading-photo-stamp'
import { draftPeriodCopy, partLabels, runningJobDraftCopy, sealCaseCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { periodCaption } from '@/lib/period-caption'
import {
  draftHasAnyPhoto,
  draftHasBirthInfo,
  draftHasInProgressPhotos,
  hydrateReadingDraft,
  patchReadingDraft,
  prepareNewPeriodCapture,
  type CapturePart,
} from '@/lib/reading-draft'
import {
  bindReadingJobLifecycle,
  consumeReadingJobDone,
  consumeReadingJobError,
  getReadingJobState,
  type ReadingJobState,
  resumeReadingJobIfNeeded,
  subscribeReadingJob,
} from '@/lib/reading-job'
import { openReadingScreen } from '@/lib/open-reading'
import { readingHasReportBody } from '@/lib/report-chapters'
import { POLAROID_CAPTURE_ENTER_MS, POLAROID_FAN_MS, POLAROID_FAN_W, POLAROID_RITUAL_MS, POLAROID_RITUAL_OVERLAP_MS, POLAROID_STACK_H } from '@/lib/stack-layout'

const HOME_CROSSFADE_MS = 280

export default function XingqiHomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const seal = sealCaseCopy(locale)
  const labels = partLabels(locale)
  const entitlements = useEntitlements()
  const isPro = useMemo(
    () =>
      hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro'),
    [entitlements]
  )
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [photoTick, setPhotoTick] = useState(0)
  const [draftIncomplete, setDraftIncomplete] = useState(false)
  const [showJobProgress, setShowJobProgress] = useState(false)
  const [job, setJob] = useState<ReadingJobState>(() => getReadingJobState())
  const hasLoadedRef = useRef(false)
  const lastFetchAtRef = useRef(0)
  const enteringRef = useRef(false)
  const capturingRef = useRef(false)
  const stackAnchorRef = useRef<View>(null)
  /** Tapped draft slot — held until CaptureStudioScreen mounts (async fan). */
  const initialPartRef = useRef<CapturePart | undefined>(undefined)
  const skipStackResetRef = useRef(consumeIntroHomeHandoff())
  const skipInitialReloadRef = useRef(skipStackResetRef.current)
  const [entering, setEntering] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [fanPrelude, setFanPrelude] = useState(false)
  const [exitingCapture, setExitingCapture] = useState(false)
  const [stackSpread, setStackSpread] = useState(0)
  const [stackRitual, setStackRitual] = useState(0)
  const [entitlementRevision, setEntitlementRevision] = useState(0)

  capturingRef.current = capturing || fanPrelude || exitingCapture

  const captureOpacity = useSharedValue(1)
  const wheelOpacity = useSharedValue(1)

  const captureFadeStyle = useAnimatedStyle(() => ({
    opacity: captureOpacity.value,
  }))
  const wheelFadeStyle = useAnimatedStyle(() => ({
    opacity: wheelOpacity.value,
  }))

  useEffect(() => {
    let cancelled = false
    void draftHasInProgressPhotos().then((yes) => {
      if (!cancelled) setDraftIncomplete(yes)
    })
    return () => {
      cancelled = true
    }
  }, [photoTick])

  const reload = useCallback(async (mode: 'full' | 'soft' = 'full'): Promise<{ emptyHistory: boolean }> => {
    const userId = await getPortfolioUserId()
    if (!userId) {
      await hydrateReadingDraft()
      setItems([])
      hasLoadedRef.current = true
      lastFetchAtRef.current = Date.now()
      setPhotoTick((n) => n + 1)
      return { emptyHistory: true }
    }
    if (mode === 'full') setLoading(true)
    try {
      const [hist] = await Promise.all([
        fetchReadings(PORTFOLIO_TARGET_APP),
        hydrateReadingDraft(),
        loadLastReadingPhotoSnapshot(),
      ])
      const next = hist.readings ?? []
      setItems(next)
      hasLoadedRef.current = true
      lastFetchAtRef.current = Date.now()
      return { emptyHistory: next.length === 0 }
    } catch {
      if (mode === 'full') setItems([])
      return { emptyHistory: true }
    } finally {
      setLoading(false)
      setPhotoTick((n) => n + 1)
    }
  }, [])

  const enterHomeCapture = useCallback(
    (opts?: { fan?: boolean; preparePeriod?: boolean; part?: CapturePart }) => {
      // CaptureStudioScreen mounts async (after the fan) — hold the tapped part
      // so its `initialPart` is correct the moment it appears.
      if (opts?.part) initialPartRef.current = opts.part
      const runFan = opts?.fan !== false
      if (!runFan) {
        setStackSpread(1)
        setStackRitual(1)
        setCapturing(true)
        captureOpacity.value = 1
        wheelOpacity.value = 0
        enteringRef.current = false
        setEntering(false)
        return
      }

      // Stay on home: fade timeline (if any), mount stack at 0, then fan open — same as empty.
      setExitingCapture(false)
      setFanPrelude(true)
      setStackSpread(0)
      setStackRitual(0)
      wheelOpacity.value = withTiming(0, { duration: HOME_CROSSFADE_MS })
      captureOpacity.value = 1

      void (async () => {
        const prep = opts?.preparePeriod ? prepareNewPeriodCapture() : Promise.resolve()
        // Next frame so OffsetPhotoStack mounts at spread=0 before we open.
        await new Promise((r) => setTimeout(r, 48))
        setStackSpread(1)
        await new Promise((r) => setTimeout(r, POLAROID_RITUAL_OVERLAP_MS))
        setStackRitual(1)
        const rest = Math.max(
          0,
          POLAROID_CAPTURE_ENTER_MS - POLAROID_RITUAL_OVERLAP_MS
        )
        await Promise.all([prep, new Promise((r) => setTimeout(r, rest))])
        // Crossfade fan → capture (capture stack already at open pose).
        captureOpacity.value = 0
        setCapturing(true)
        captureOpacity.value = withTiming(1, { duration: HOME_CROSSFADE_MS })
        await new Promise((r) => setTimeout(r, HOME_CROSSFADE_MS))
        setFanPrelude(false)
        enteringRef.current = false
        setEntering(false)
      })()
    },
    [captureOpacity, wheelOpacity]
  )

  const maybeAutoEnterCapture = useCallback(
    async (emptyHistory: boolean) => {
      if (!emptyHistory || capturingRef.current || enteringRef.current) return
      enteringRef.current = true
      const draft = await hydrateReadingDraft()
      if (!draftHasAnyPhoto(draft)) {
        enteringRef.current = false
        return
      }
      if (!(await hasSignedInSession())) {
        enteringRef.current = false
        return
      }
      try {
        const consented = await fetchBiometricConsent()
        if (!consented) {
          enteringRef.current = false
          return
        }
      } catch {
        enteringRef.current = false
        return
      }
      if (!draftHasBirthInfo(draft)) {
        enteringRef.current = false
        return
      }
      enterHomeCapture({ fan: true })
    },
    [enterHomeCapture]
  )

  useEffect(() => subscribeReadingJob(setJob), [])
  useEffect(() => bindReadingJobLifecycle(locale, isPro), [locale, isPro])

  useEffect(() => {
    if (job.status === 'done' && job.readingId && job.resultPayload) {
      const claimed = consumeReadingJobDone()
      if (!claimed) return
      const id = claimed.readingId
      const payload = claimed.resultPayload
      let hasBody = false
      let resultJson = ''
      try {
        const raw = JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
        hasBody = readingHasReportBody(raw) || Boolean(raw.brief)
        resultJson = JSON.stringify(raw)
      } catch {
        hasBody = false
      }
      void reload('soft').then(() => {
        if (!hasBody || !id) return
        openReadingScreen({ readingId: id, resultJson, replace: true })
      })
      return
    }
    if (job.status === 'error' && job.error) {
      const err = consumeReadingJobError()
      if (!err) return
      if (err === 'signin_required') {
        return
      }
      if (err === 'biometric_consent_required') {
        router.push('/consent')
        return
      }
      const isUnchanged =
        err.includes('照片特征未变化') ||
        err.includes('照片特徵未變化') ||
        err.toLowerCase().includes('photos unchanged')
      Alert.alert(
        s('解读未完成', '解讀未完成', 'Reading incomplete', '解読が完了しませんでした'),
        err,
        [
          { text: s('好', '好', 'OK', 'OK') },
          ...(isUnchanged
            ? [
                {
                  text: s('去更新照片', '去更新照片', 'Update photos', '写真を更新'),
                  onPress: () => {
                    setHomeCaptureHandoff()
                    router.replace('/(app)' as never)
                  },
                },
              ]
            : []),
        ]
      )
      void reload('soft')
    }
  }, [job, reload, router, locale])

  useFocusEffect(
    useCallback(() => {
      enteringRef.current = false
      setEntering(false)
      setEntitlementRevision((n) => n + 1)
      if (consumeHomeCaptureHandoff()) {
        void (async () => {
          if (items.length > 0) {
            enterHomeCapture({ fan: true, preparePeriod: true })
          } else {
            patchReadingDraft({ outputKind: 'oneshot', updateKind: 'full', partialParts: undefined })
            enterHomeCapture({ fan: true })
          }
        })()
      } else if (skipStackResetRef.current) {
        skipStackResetRef.current = false
      } else if (!capturingRef.current) {
        setStackSpread(0)
        setStackRitual(0)
      }
      void (async () => {
        let emptyHistory = items.length === 0
        if (skipInitialReloadRef.current) {
          skipInitialReloadRef.current = false
          await hydrateReadingDraft()
          hasLoadedRef.current = true
          lastFetchAtRef.current = Date.now()
          setPhotoTick((n) => n + 1)
          resumeReadingJobIfNeeded(locale, isPro)
          emptyHistory = true
        } else {
          const now = Date.now()
          const FRESH_MS = 12_000
          if (hasLoadedRef.current && now - lastFetchAtRef.current < FRESH_MS) {
            resumeReadingJobIfNeeded(locale, isPro)
            setPhotoTick((n) => n + 1)
          } else {
            const result = await reload(hasLoadedRef.current ? 'soft' : 'full')
            emptyHistory = result.emptyHistory
            resumeReadingJobIfNeeded(locale, isPro)
          }
        }
        await maybeAutoEnterCapture(emptyHistory)
      })()
    }, [enterHomeCapture, items.length, maybeAutoEnterCapture, reload, locale, isPro])
  )

  const requireConsent = useCallback(async (): Promise<boolean> => {
    if (!(await hasSignedInSession())) {
      router.push({ pathname: '/sign-in', params: { next: 'consent' } } as never)
      return false
    }
    try {
      const consented = await fetchBiometricConsent()
      if (!consented) {
        router.push('/consent')
        return false
      }
      return true
    } catch {
      router.push('/consent')
      return false
    }
  }, [router])

  const beginOnboarding = useCallback(
    async (part?: CapturePart) => {
      if (enteringRef.current || capturingRef.current) return
      enteringRef.current = true
      setEntering(true)
      if (job.status === 'running') {
        enteringRef.current = false
        setEntering(false)
        Alert.alert(
          s('解读进行中', '解讀進行中', 'Reading in progress', '解読中'),
          s(
            '请等待当前解读完成，或点推送打开结果。',
            '請等待目前解讀完成，或點推送打開結果。',
            'Wait for the current reading, or open it from the push.',
            '現在の解読が終わるまでお待ちください。プッシュ通知から開くこともできます。'
          )
        )
        return
      }
      if (!(await requireConsent())) {
        enteringRef.current = false
        setEntering(false)
        return
      }
      const draft = await hydrateReadingDraft()
      if (!draftHasBirthInfo(draft)) {
        enteringRef.current = false
        setEntering(false)
        setHomeCaptureHandoff()
        router.push('/birth' as never)
        return
      }
      if (items.length > 0) {
        enterHomeCapture({ fan: true, preparePeriod: true, part })
        return
      }
      patchReadingDraft({ outputKind: 'oneshot', updateKind: 'full', partialParts: undefined })
      enterHomeCapture({ fan: true, part })
    },
    [enterHomeCapture, items.length, job.status, locale, requireConsent, router, s]
  )

  const finishHistoryExit = useCallback(
    (wipePeriod: boolean) => {
      setCapturing(false)
      setFanPrelude(false)
      setStackSpread(0)
      setStackRitual(0)
      setExitingCapture(false)
      enteringRef.current = false
      setEntering(false)
      // Reset only after unmount — setting opacity=1 while still mounted flashes the dock.
      requestAnimationFrame(() => {
        captureOpacity.value = 1
      })
      // Close resets empty slots; job handoff must keep files for extract / retry.
      if (wipePeriod) void prepareNewPeriodCapture({ force: true })
      // Bust draft-row image cache (same file path overwritten on retake).
      setPhotoTick((n) => n + 1)
    },
    [captureOpacity]
  )

  const exitHomeCapture = useCallback(
    (opts?: { wipePeriod?: boolean }) => {
      if (exitingCapture) return
      const hasHistory = items.length > 0
      const wipePeriod = opts?.wipePeriod !== false
      setExitingCapture(true)

      if (hasHistory) {
        // Timeline stayed mounted under capture; restore opacity, then fade only the overlay.
        wheelOpacity.value = 1
        captureOpacity.value = withTiming(0, { duration: HOME_CROSSFADE_MS }, (finished) => {
          if (finished) runOnJS(finishHistoryExit)(wipePeriod)
        })
        return
      }

      // Empty home: reveal open fan, then fold to the idle deck.
      setFanPrelude(true)
      setStackSpread(1)
      setStackRitual(1)
      captureOpacity.value = withTiming(0, { duration: HOME_CROSSFADE_MS })

      void (async () => {
        await new Promise((r) => setTimeout(r, HOME_CROSSFADE_MS))
        setCapturing(false)
        await new Promise((r) => setTimeout(r, 48))
        captureOpacity.value = 1
        setStackRitual(0)
        await new Promise((r) => setTimeout(r, Math.round(POLAROID_RITUAL_MS * 0.35)))
        setStackSpread(0)
        await new Promise((r) => setTimeout(r, POLAROID_FAN_MS))
        setFanPrelude(false)
        setExitingCapture(false)
        enteringRef.current = false
        setEntering(false)
      })()
    },
    [captureOpacity, exitingCapture, finishHistoryExit, items.length, wheelOpacity]
  )

  const hasReading = items.length > 0
  const jobRunning = job.status === 'running'
  /** Upload must finish before quit-safe — block timeline until job 202. */
  const extractBlocking = jobRunning && job.phase === 'uploading'
  const cloudRunning =
    jobRunning &&
    (job.phase === 'extracting' || job.phase === 'queued' || job.phase === 'interpreting')
  const progressOpen = extractBlocking || showJobProgress

  useEffect(() => {
    if (extractBlocking) {
      setShowJobProgress(true)
      return
    }
    if (!jobRunning) {
      setShowJobProgress(false)
      return
    }
    // Cloud extract/queue/interpret: timeline when history exists; keep panel if first seal.
    setShowJobProgress(!hasReading)
  }, [extractBlocking, hasReading, jobRunning])

  const draftCopy = useMemo(() => {
    if (jobRunning) {
      return runningJobDraftCopy(locale, { phase: job.phase, progress: job.progress })
    }
    return draftPeriodCopy(locale, { incomplete: draftIncomplete })
  }, [draftIncomplete, job.phase, job.progress, jobRunning, locale])

  const wheelItems = useMemo(() => {
    if (!hasReading) return []
    const history = items.map((item) => {
      const cap = periodCaption(item, locale)
      return { id: item.id, title: cap.title, excerpt: cap.excerpt }
    })
    return [
      { id: '__draft__', draft: true as const, title: draftCopy.title, excerpt: draftCopy.excerpt },
      ...history,
    ]
  }, [draftCopy.excerpt, draftCopy.title, hasReading, items, locale])

  // Extract blocks the wheel; queued/interpret keep timeline visible.
  const showWheel = hasReading && !loading && !extractBlocking
  const showFanLayer =
    fanPrelude || (!hasReading && !capturing && !jobRunning && !loading)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <XingqiLoader label={s('加载中', '載入中', 'Loading', '読み込み中')} />
        </View>
      ) : null}

      {showWheel ? (
        <Animated.View
          pointerEvents={capturing || exitingCapture || fanPrelude ? 'none' : 'auto'}
          style={[
            {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
            wheelFadeStyle,
          ]}
        >
          <PeriodPhotoWheel
            items={wheelItems}
            revision={photoTick}
            scrollIndex={cloudRunning || draftIncomplete ? 0 : 1}
            onPressDraft={(part) => {
              if (jobRunning) {
                setShowJobProgress(true)
                return
              }
              void beginOnboarding(part)
            }}
            onPressReading={(readingId, part) => {
              const item = items.find((r) => r.id === readingId)
              openReadingScreen({ readingId, resultJson: item?.resultJson, part })
            }}
          />
        </Animated.View>
      ) : null}

      <View
        pointerEvents={capturing || extractBlocking || fanPrelude ? 'none' : 'box-none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          display: extractBlocking ? 'none' : 'flex',
          zIndex: 2,
        }}
      >
        <View
          pointerEvents='box-none'
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.sm,
          }}
        >
          <XingqiMark size={36} />
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={seal.title}
          >
            <SealMark size={22} color={colors.text} accessibilityLabel={seal.title} />
          </Pressable>
        </View>
      </View>

      {progressOpen && !loading ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 4 }}>
          <ReadingProcessingPanel
            locale={locale}
            phase={job.phase}
            progress={job.progress}
            onDismiss={cloudRunning ? () => setShowJobProgress(false) : undefined}
          />
        </View>
      ) : null}

      {/* Fan under capture — enter/exit crossfade stays on home. */}
      {showFanLayer ? (
        <View
          pointerEvents={fanPrelude ? 'none' : 'auto'}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 3,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
            backgroundColor: hasReading && fanPrelude ? 'transparent' : colors.bg,
          }}
        >
          <Pressable
            onPress={() => {
              if (!hasReading) void beginOnboarding()
            }}
            disabled={entering || fanPrelude || hasReading}
            accessibilityRole='button'
            accessibilityState={{ disabled: entering || fanPrelude || hasReading }}
            accessibilityLabel={s('开始录入照片', '開始錄入照片', 'Start capturing', '撮影を始める')}
            style={{ alignItems: 'center' }}
          >
            <View
              ref={stackAnchorRef}
              collapsable={false}
              style={{ width: POLAROID_FAN_W, height: POLAROID_STACK_H }}
            >
              <OffsetPhotoStack
                uris={{}}
                spread={stackSpread}
                ritual={stackRitual}
                compact
                labels={labels}
                ghostHint={s('新一期', '新一期', 'New', '新しい')}
              />
            </View>
            {!hasReading && !fanPrelude ? (
              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 14,
                  opacity: stackSpread === 0 ? 1 : 0,
                  height: stackSpread === 0 ? undefined : 0,
                  marginTop: stackSpread === 0 ? spacing.lg : 0,
                }}
              >
                {s('点此录入', '點此錄入', 'Tap to capture', 'タップして撮影')}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {capturing ? (
        <Animated.View
          pointerEvents={exitingCapture ? 'none' : 'auto'}
          style={[
            { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 5 },
            captureFadeStyle,
          ]}
        >
          <CaptureStudioScreen
            embedded
            exiting={exitingCapture}
            part={initialPartRef.current}
            entitlementRevision={entitlementRevision}
            onPhotosChanged={() => setPhotoTick((n) => n + 1)}
            onExit={() => {
              // Keep in-progress shots for timeline retry; only wipe empty / leftover seal files.
              initialPartRef.current = undefined
              void draftHasInProgressPhotos().then((keep) => {
                exitHomeCapture({ wipePeriod: !keep })
              })
            }}
            onHandoff={() => {
              initialPartRef.current = undefined
              exitHomeCapture({ wipePeriod: false })
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}
