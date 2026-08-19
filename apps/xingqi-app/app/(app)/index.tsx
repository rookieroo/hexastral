/**
 * Home — two states, one capture entry.
 * Empty: stacked placeholders; tap starts consent → capture.
 * Filled: full-height photo-stack wheel (local snapshots).
 */

import { useTheme } from '@zhop/core-ui'
import { fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { getPortfolioUserId, hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OffsetPhotoStack } from '@/components/OffsetPhotoStack'
import { PeriodPhotoWheel } from '@/components/PeriodPhotoWheel'
import { SealMark } from '@/components/SealMark'
import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import { fetchBiometricConsent } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { draftPeriodCopy, partLabels, sealCaseCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { periodCaption } from '@/lib/period-caption'
import { type CapturePart, hydrateReadingDraft } from '@/lib/reading-draft'
import {
  bindReadingJobLifecycle,
  consumeReadingJobDone,
  consumeReadingJobError,
  getReadingJobState,
  type ReadingJobState,
  resumeReadingJobIfNeeded,
  subscribeReadingJob,
} from '@/lib/reading-job'
import { readingHasReportBody } from '@/lib/report-chapters'
import { POLAROID_FAN_MS, POLAROID_RITUAL_MS } from '@/lib/stack-layout'

export default function XingqiHomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const seal = sealCaseCopy(locale)
  const labels = partLabels(locale)
  const draftCopy = draftPeriodCopy(locale)
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [photoTick, setPhotoTick] = useState(0)
  const [job, setJob] = useState<ReadingJobState>(() => getReadingJobState())
  const hasLoadedRef = useRef(false)
  const lastFetchAtRef = useRef(0)
  const enteringRef = useRef(false)
  const [entering, setEntering] = useState(false)
  const [stackSpread, setStackSpread] = useState(0)
  const [stackRitual, setStackRitual] = useState(0)

  const reload = useCallback(async (mode: 'full' | 'soft' = 'full') => {
    if (mode === 'full') setLoading(true)
    try {
      const userId = await getPortfolioUserId()
      if (!userId) {
        await hydrateReadingDraft()
        setItems([])
        hasLoadedRef.current = true
        lastFetchAtRef.current = Date.now()
        return
      }
      const [hist] = await Promise.all([fetchReadings(PORTFOLIO_TARGET_APP), hydrateReadingDraft()])
      setItems(hist.readings ?? [])
      hasLoadedRef.current = true
      lastFetchAtRef.current = Date.now()
    } catch {
      if (mode === 'full') setItems([])
    } finally {
      setLoading(false)
      setPhotoTick((n) => n + 1)
    }
  }, [])

  useEffect(() => subscribeReadingJob(setJob), [])
  useEffect(() => bindReadingJobLifecycle(locale, isPro), [locale, isPro])

  useEffect(() => {
    if (job.status === 'done' && job.readingId && job.resultPayload) {
      const claimed = consumeReadingJobDone()
      if (!claimed) return
      const id = claimed.readingId
      const payload = claimed.resultPayload
      let hasBody = false
      try {
        const raw = JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
        hasBody = readingHasReportBody(raw)
      } catch {
        hasBody = false
      }
      void reload('soft').then(() => {
        if (!hasBody) return
        router.replace({ pathname: '/result', params: { readingId: id } } as never)
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
                  onPress: () => router.push('/capture' as never),
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
      setStackSpread(0)
      setStackRitual(0)
      void (async () => {
        const now = Date.now()
        const FRESH_MS = 12_000
        if (hasLoadedRef.current && now - lastFetchAtRef.current < FRESH_MS) {
          resumeReadingJobIfNeeded(locale, isPro)
          setPhotoTick((n) => n + 1)
          return
        }
        await reload(hasLoadedRef.current ? 'soft' : 'full')
        resumeReadingJobIfNeeded(locale, isPro)
      })()
    }, [reload, locale, isPro])
  )

  const requireConsent = useCallback(async (): Promise<boolean> => {
    const userId = await getPortfolioUserId()
    if (!userId) {
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

  const beginOnboarding = useCallback(async () => {
    if (enteringRef.current) return
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
    setStackSpread(1)
    await new Promise((r) => setTimeout(r, POLAROID_FAN_MS))
    setStackRitual(1)
    await new Promise((r) => setTimeout(r, POLAROID_RITUAL_MS))
    if (!(await requireConsent())) {
      enteringRef.current = false
      setEntering(false)
      return
    }
    router.push({ pathname: '/capture', params: { spread: '1', ritual: '1' } } as never)
  }, [job.status, locale, requireConsent, router])

  const hasReading = items.length > 0
  const wheelItems = useMemo(
    () => [
      { id: '__draft__', draft: true as const, title: draftCopy.title, excerpt: draftCopy.excerpt },
      ...items.map((item) => {
        const cap = periodCaption(item, locale)
        return { id: item.id, title: cap.title, excerpt: cap.excerpt }
      }),
    ],
    [draftCopy.excerpt, draftCopy.title, items, locale]
  )

  const onPressPart = useCallback(
    (readingId: string, part: CapturePart, hasPhoto: boolean) => {
      if (hasPhoto) {
        router.push({ pathname: '/locus', params: { readingId, part } } as never)
        return
      }
      void (async () => {
        if (!(await requireConsent())) return
        router.push({ pathname: '/capture', params: { mode: 'slot', part } } as never)
      })()
    },
    [requireConsent, router]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <XingqiLoader label={s('加载中', '載入中', 'Loading', '読み込み中')} />
        </View>
      ) : null}

      <View
        pointerEvents={hasReading && !loading ? 'auto' : 'none'}
        style={{
          display: hasReading && !loading ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <PeriodPhotoWheel
          items={wheelItems}
          revision={photoTick}
          initialIndex={1}
          onPressPart={onPressPart}
          onPressDraft={() => void beginOnboarding()}
          onPressLabel={(readingId) =>
            router.push({ pathname: '/result', params: { readingId } } as never)
          }
        />
        {job.status === 'running' ? (
          <Text
            pointerEvents='none'
            style={{
              position: 'absolute',
              left: spacing.xl,
              right: spacing.xl,
              bottom: insets.bottom + spacing.sm,
              textAlign: 'center',
              color: colors.dim,
              fontSize: 12,
            }}
          >
            {s(
              '解读进行中，可离开。',
              '解讀進行中，可離開。',
              'Reading in progress. You can leave.',
              '解読中。アプリを閉じても大丈夫です。'
            )}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => void beginOnboarding()}
        disabled={entering}
        accessibilityRole='button'
        accessibilityState={{ disabled: entering }}
        accessibilityLabel={s('开始录入照片', '開始錄入照片', 'Start capturing', '撮影を始める')}
        style={{
          display: !loading && !hasReading ? 'flex' : 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          backgroundColor: colors.bg,
        }}
      >
        <OffsetPhotoStack
          uris={{}}
          spread={stackSpread}
          ritual={stackRitual}
          compact
          labels={labels}
        />
        <Text
          style={{
            color: colors.secondary,
            fontSize: 14,
            marginTop: spacing.lg,
            opacity: stackSpread === 0 ? 1 : 0,
          }}
        >
          {s(
            '点此录入 · 仅存本机',
            '點此錄入 · 僅存本機',
            'Tap to capture · on device only',
            'タップして撮影 · この端末のみ'
          )}
        </Text>
      </Pressable>

      <View
        pointerEvents='box-none'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
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
    </View>
  )
}
