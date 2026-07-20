/**
 * Home — report-first. Hero = latest reading's verdict (tap → full report);
 * a photo strip opens the fullscreen locus viewer; a compact row updates 生辰.
 * Archive list lives in Settings. Sticky bottom CTA for thumb reach.
 */

import { Button, useTheme } from '@zhop/core-ui'
import {
  deletePortfolioReading,
  fetchReadings,
  type PortfolioReadingItem,
} from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { CalendarDays, Settings2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FeaturedReadingCard } from '@/components/FeaturedReadingCard'
import { HomeVerdictCard } from '@/components/HomeVerdictCard'
import { PhotoStrip } from '@/components/PhotoStrip'
import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import { fetchBiometricConsent } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import {
  formReadingListTitle,
  homeArchiveCopy,
  homeInputsCopy,
  partLabels,
  readingLocaleBadge,
} from '@/lib/living-copy'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { captureHrefForPart } from '@/lib/period-photos'
import { type CapturePart, draftReadyForPaywall, hydrateReadingDraft } from '@/lib/reading-draft'
import {
  acknowledgeReadingJob,
  consumeReadingJobError,
  getReadingJobState,
  type ReadingJobState,
  readingJobSteps,
  resumeReadingJobIfNeeded,
  showReadingStartedHandoff,
  startReadingJob,
  subscribeReadingJob,
} from '@/lib/reading-job'
import { clearLastReadingPhotoSnapshot } from '@/lib/reading-photo-stamp'
import { deleteReadingPhotoFolder } from '@/lib/reading-photos'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import { readingHasReportBody } from '@/lib/report-chapters'
import { verdictFromReading } from '@/lib/verdict'

export default function XingqiHomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasBirth, setHasBirth] = useState(false)
  const [job, setJob] = useState<ReadingJobState>(() => getReadingJobState())

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [hist, draft] = await Promise.all([
        fetchReadings(PORTFOLIO_TARGET_APP),
        hydrateReadingDraft(),
      ])
      setItems(hist.readings ?? [])
      setHasBirth(Boolean(draft.solarDate && draft.timeIndex != null && draft.gender))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => subscribeReadingJob(setJob), [])

  useEffect(() => {
    if (job.status === 'done' && job.readingId && job.resultPayload) {
      const id = job.readingId
      const payload = job.resultPayload
      // Skip auto-open if body is empty — stay on list so user sees the row.
      let hasBody = false
      try {
        const raw = JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
        hasBody = readingHasReportBody(raw)
      } catch {
        hasBody = false
      }
      acknowledgeReadingJob()
      void reload().then(() => {
        if (!hasBody) return
        router.push({
          pathname: '/result',
          params: { readingId: id },
        } as never)
      })
      return
    }
    if (job.status === 'error' && job.error) {
      const err = consumeReadingJobError()
      if (!err) return
      if (err === 'signin_required') {
        router.push('/sign-in')
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
      Alert.alert(s('解读未完成', '解讀未完成', 'Reading incomplete'), err, [
        { text: s('好', '好', 'OK') },
        ...(isUnchanged
          ? [
              {
                text: s('去更新照片', '去更新照片', 'Update photos'),
                onPress: () => router.push('/capture' as never),
              },
            ]
          : []),
      ])
      void reload()
    }
  }, [job, reload, router, locale])

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await reload()
        // Reconcile with server; resume even if UI still shows running after poll timeout.
        resumeReadingJobIfNeeded(locale, isPro)
      })()
    }, [reload, locale, isPro])
  )

  const openSettings = useCallback(() => {
    router.push('/(app)/settings')
  }, [router])

  const requireConsent = useCallback(async (): Promise<boolean> => {
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

  const startReading = useCallback(async () => {
    if (job.status === 'running') {
      Alert.alert(
        s('解读进行中', '解讀進行中', 'Reading in progress'),
        s(
          '请等待当前解读完成，或点推送打开结果。',
          '請等待目前解讀完成，或點推送打開結果。',
          'Wait for the current reading, or open it from the push.'
        )
      )
      return
    }
    if (!(await requireConsent())) return

    // Pro with a ready draft: skip unlock sheet — start in background.
    if (isPro) {
      const draft = await hydrateReadingDraft()
      if (draftReadyForPaywall(draft)) {
        if (
          items.length > 0 &&
          (await alertIfPhotosUnchanged({
            draft,
            locale,
            onUpdatePhotos: () => router.push('/capture' as never),
          }))
        ) {
          return
        }
        const started = startReadingJob({
          locale,
          outputKind: 'period_brief',
          isPro: true,
          draft,
          onQueued: () => {
            void showReadingStartedHandoff({ locale })
          },
        })
        if (!started) {
          Alert.alert(
            s('解读进行中', '解讀進行中', 'Reading in progress'),
            s(
              '请等待当前解读完成。',
              '請等待目前解讀完成。',
              'Wait for the current reading to finish.'
            )
          )
        }
        return
      }
    }

    router.push('/capture')
  }, [isPro, items.length, job.status, locale, requireConsent, router])

  const openBirth = useCallback(async () => {
    if (!(await requireConsent())) return
    router.push('/birth')
  }, [requireConsent, router])

  const swipeToSettings = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if (e.translationX < -55 || e.velocityX < -650) {
            runOnJS(openSettings)()
          }
        }),
    [openSettings]
  )

  const hasReading = items.length > 0
  const copy = homeArchiveCopy(locale)
  const inputsCopy = homeInputsCopy(locale)
  const stripLabels = partLabels(locale)
  const featured = items[0]
  const verdict = useMemo(
    () => (featured ? verdictFromReading(featured, locale) : null),
    [featured, locale]
  )

  const confirmDelete = useCallback(
    (item: PortfolioReadingItem) => {
      Alert.alert(
        s('删除解读？', '刪除解讀？', 'Delete reading?'),
        s(
          '将从账号中永久删除此条形气解读，无法恢复。',
          '將從帳號中永久刪除此條形氣解讀，無法恢復。',
          'Permanently removes this form reading from your account.'
        ),
        [
          { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
          {
            text: s('删除', '刪除', 'Delete'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await deletePortfolioReading(PORTFOLIO_TARGET_APP, item.id)
                  await deleteReadingPhotoFolder(item.id)
                  await clearLastReadingPhotoSnapshot()
                  await reload()
                } catch {
                  Alert.alert(s('删除失败', '刪除失敗', 'Delete failed'))
                }
              })()
            },
          },
        ]
      )
    },
    [locale, reload]
  )

  const readingMeta = useCallback(
    (item: PortfolioReadingItem) => {
      const localeBadge = readingLocaleBadge(item.locale)
      const dateLabel = item.createdAt?.slice(0, 10) ?? ''
      return [s('形气', '形氣', 'Form'), dateLabel, localeBadge].filter(Boolean).join(' · ')
    },
    [locale]
  )

  const openFeatured = useCallback(() => {
    if (!featured) return
    router.push({ pathname: '/result', params: { readingId: featured.id } } as never)
  }, [featured, router])

  const onPressPart = useCallback(
    (part: CapturePart, hasPhoto: boolean) => {
      if (!featured) return
      if (hasPhoto) {
        router.push({ pathname: '/locus', params: { readingId: featured.id, part } } as never)
        return
      }
      void (async () => {
        if (!(await requireConsent())) return
        router.push({ pathname: captureHrefForPart(part), params: { mode: 'slot' } } as never)
      })()
    },
    [featured, requireConsent, router]
  )

  const ctaLabel =
    job.status === 'running'
      ? s('解读进行中…', '解讀進行中…', 'Reading in progress…')
      : !hasReading
        ? s('开始解读', '開始解讀', 'Start reading')
        : isPro
          ? s('更新本期', '更新本期', 'Refresh period')
          : s('再读一次', '再讀一次', 'New reading')

  return (
    <GestureDetector gesture={swipeToSettings}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <XingqiMark size={28} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Xingqi</Text>
          </View>
          <Pressable
            onPress={openSettings}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={s('设置', '設定', 'Settings')}
          >
            <Settings2 size={22} color={colors.text} strokeWidth={1.5} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.lg,
            gap: spacing.lg,
            flexGrow: 1,
          }}
        >
          {job.status === 'running' ? (
            <View
              style={{
                paddingVertical: spacing.lg,
                gap: spacing.sm,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.separator,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                  <Text
                    style={{
                      fontFamily: 'CrimsonPro',
                      color: colors.text,
                      fontSize: 21,
                      lineHeight: 27,
                    }}
                    numberOfLines={1}
                  >
                    {s('形气解读', '形氣解讀', 'Form reading')}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono',
                      color: colors.dim,
                      fontSize: 11,
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {s('进行中', '進行中', 'In progress')}
                    {job.progress > 0 ? ` · ${job.progress}%` : ''}
                  </Text>
                </View>
                <XingqiLoader label={s('解读中', '解讀中', 'Reading')} size={28} />
              </View>
              <View style={{ gap: 6, marginTop: 4 }}>
                {readingJobSteps(job.phase, locale).map((step) => (
                  <View
                    key={step.key}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Text
                      style={{
                        color: step.done ? colors.accent : step.active ? colors.text : colors.dim,
                        fontSize: 12,
                        width: 14,
                      }}
                    >
                      {step.done ? '✓' : step.active ? '·' : '○'}
                    </Text>
                    <Text
                      style={{
                        color: step.active ? colors.text : colors.secondary,
                        fontSize: 13,
                        flex: 1,
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
                {s(
                  '可离开应用。完成后可点推送或回此列表打开。',
                  '可離開應用。完成後可點推送或回此列表打開。',
                  'You can leave. Open via push or this row when ready.'
                )}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
              <XingqiLoader label={s('加载中', '載入中', 'Loading')} />
            </View>
          ) : null}

          {!loading && items.length === 0 && job.status !== 'running' ? (
            <View
              style={{
                flex: 1,
                minHeight: 220,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.xl,
              }}
            >
              <Text style={{ color: colors.dim, fontSize: 13 }}>
                {s('尚无解读', '尚無解讀', 'No readings yet')}
              </Text>
            </View>
          ) : null}

          {!loading && featured && verdict ? (
            <HomeVerdictCard
              latestLabel={copy.latestLabel}
              goldenLine={verdict.goldenLine}
              meta={readingMeta(featured)}
              axes={verdict.axes}
              openHint={copy.openHint}
              onPress={openFeatured}
              onDelete={() => confirmDelete(featured)}
              deleteLabel={s('删除', '刪除', 'Delete')}
              colors={{
                text: colors.text,
                dim: colors.dim,
                accent: colors.accent,
                secondary: colors.secondary,
                separator: colors.separator,
                bg: colors.bg,
              }}
              spacing={spacing}
            />
          ) : null}

          {!loading && featured && !verdict ? (
            <FeaturedReadingCard
              title={formReadingListTitle(locale)}
              meta={readingMeta(featured)}
              hint={copy.openHint}
              onPress={openFeatured}
              onDelete={() => confirmDelete(featured)}
              colors={{
                text: colors.text,
                dim: colors.dim,
                accent: colors.accent,
                secondary: colors.secondary,
                separator: colors.separator,
                bg: colors.bg,
              }}
              spacing={spacing}
              deleteLabel={s('删除', '刪除', 'Delete')}
            />
          ) : null}

          {!loading && featured ? (
            <PhotoStrip
              readingId={featured.id}
              sectionLabel={inputsCopy.formLabel}
              labels={stripLabels}
              colors={{
                text: colors.text,
                dim: colors.dim,
                accent: colors.accent,
                secondary: colors.secondary,
                separator: colors.separator,
                bg: colors.bg,
              }}
              spacing={spacing}
              onPressPart={onPressPart}
            />
          ) : null}

          {!loading && featured ? (
            <Pressable
              onPress={() => void openBirth()}
              accessibilityRole='button'
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.md,
                borderTopWidth: 0.5,
                borderTopColor: colors.separator,
              }}
            >
              <CalendarDays
                size={18}
                color={hasBirth ? colors.secondary : colors.dim}
                strokeWidth={1.6}
              />
              <Text style={{ color: colors.secondary, fontSize: 14, flex: 1 }}>
                {inputsCopy.birth}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 12 }}>
                {hasBirth ? s('已填', '已填', 'Set') : s('去填写', '去填寫', 'Add')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.bg,
          }}
        >
          <Button
            variant='primary'
            onPress={() => void startReading()}
            disabled={job.status === 'running'}
          >
            {ctaLabel}
          </Button>
        </View>
      </View>
    </GestureDetector>
  )
}
