/**
 * Home — icon-led period strip (tap → slot view/replace); timeline;
 * sticky bottom CTA for thumb reach.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { deletePortfolioReading, fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { CalendarDays, Hand, ScanFace, Settings2 } from 'lucide-react-native'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HistoryReadingRow } from '@/components/HistoryReadingRow'
import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import { fetchBiometricConsent } from '@/lib/api'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { archiveSectionLabel, formReadingListTitle, readingLocaleBadge } from '@/lib/living-copy'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { captureHrefForPart, periodPhotoMap } from '@/lib/period-photos'
import { type CapturePart, draftReadyForPaywall, hydrateReadingDraft } from '@/lib/reading-draft'
import {
  alertIfPhotosUnchanged,
} from '@/lib/reading-preflight'
import { clearLastReadingPhotoSnapshot } from '@/lib/reading-photo-stamp'
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
import { readingHasReportBody } from '@/lib/report-chapters'

function StepIcon({
  label,
  active,
  colors,
  onPress,
  children,
}: {
  label: string
  active: boolean
  colors: { text: string; dim: string; secondary: string }
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
      }}
    >
      {children}
      <Text style={{ color: active ? colors.secondary : colors.dim, fontSize: 10 }}>{label}</Text>
    </Pressable>
  )
}

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
  const [slotReady, setSlotReady] = useState<Partial<Record<CapturePart, boolean>>>({})
  const [hasBirth, setHasBirth] = useState(false)
  const [job, setJob] = useState<ReadingJobState>(() => getReadingJobState())

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [hist, photos, draft] = await Promise.all([
        fetchReadings(PORTFOLIO_TARGET_APP),
        periodPhotoMap(),
        hydrateReadingDraft(),
      ])
      setItems(hist.readings ?? [])
      setSlotReady({
        palm_l: Boolean(photos.palm_l),
        palm_r: Boolean(photos.palm_r),
        face: Boolean(photos.face),
      })
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
        err.includes('照片特征未变化') || err.includes('照片特徵未變化') || err.toLowerCase().includes('photos unchanged')
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
        // Always reconcile with server active job (true quit-safe resume).
        if (getReadingJobState().status !== 'running') {
          resumeReadingJobIfNeeded(locale, isPro)
        }
      })()
    }, [reload, locale, isPro])
  )

  const openSettings = useCallback(() => {
    router.push('/(app)/settings')
  }, [router])

  const startReading = useCallback(async () => {
    if (job.status === 'running') {
      Alert.alert(
        s('解读进行中', '解讀進行中', 'Reading in progress'),
        s('请等待当前解读完成，或点推送打开结果。', '請等待目前解讀完成，或點推送打開結果。', 'Wait for the current reading, or open it from the push.')
      )
      return
    }
    try {
      const consented = await fetchBiometricConsent()
      if (!consented) {
        router.push('/consent')
        return
      }
    } catch {
      router.push('/consent')
      return
    }

    // Pro with a ready draft: skip unlock sheet — start in background.
    // Handoff only after the job is queued (not before extract/enqueue can fail).
    if (isPro) {
      const draft = await hydrateReadingDraft()
      if (draftReadyForPaywall(draft)) {
        // Client stamp only when archive still has a reading. Never re-seed stamp
        // here — that re-blocked right after delete (empty list + kept featureIds).
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
            s('请等待当前解读完成。', '請等待目前解讀完成。', 'Wait for the current reading to finish.')
          )
        }
        return
      }
    }

    router.push('/capture')
  }, [isPro, items.length, job.status, locale, router])

  const openSlot = useCallback(
    async (part: CapturePart) => {
      try {
        const consented = await fetchBiometricConsent()
        if (!consented) {
          router.push('/consent')
          return
        }
      } catch {
        router.push('/consent')
        return
      }
      const href = captureHrefForPart(part)
      router.push({ pathname: href, params: { mode: 'slot' } })
    },
    [router]
  )

  const openBirth = useCallback(async () => {
    try {
      const consented = await fetchBiometricConsent()
      if (!consented) {
        router.push('/consent')
        return
      }
    } catch {
      router.push('/consent')
      return
    }
    // Birth screen redirects to capture if three photos missing.
    router.push('/birth')
  }, [router])

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

        <View
          style={{
            marginHorizontal: spacing.xl,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            <StepIcon
              label={s('左掌', '左掌', 'L')}
              active={Boolean(slotReady.palm_l)}
              colors={colors}
              onPress={() => void openSlot('palm_l')}
            >
              {/* Lucide Hand reads as right-hand back; palm-facing capture flips R. */}
              <Hand size={22} color={colors.text} strokeWidth={1.75} />
            </StepIcon>
            <StepIcon
              label={s('右掌', '右掌', 'R')}
              active={Boolean(slotReady.palm_r)}
              colors={colors}
              onPress={() => void openSlot('palm_r')}
            >
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Hand size={22} color={colors.text} strokeWidth={1.75} />
              </View>
            </StepIcon>
            <StepIcon
              label={s('面', '面', 'Face')}
              active={Boolean(slotReady.face)}
              colors={colors}
              onPress={() => void openSlot('face')}
            >
              <ScanFace size={22} color={colors.text} strokeWidth={1.75} />
            </StepIcon>
            <StepIcon
              label={s('生辰', '生辰', 'Birth')}
              active={hasBirth}
              colors={colors}
              onPress={() => void openBirth()}
            >
              <CalendarDays size={22} color={colors.text} strokeWidth={1.75} />
            </StepIcon>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
            flexGrow: 1,
          }}
        >
          <Text
            style={{
              color: colors.dim,
              fontSize: 12,
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          >
            {archiveSectionLabel(locale, isPro)}
          </Text>
          {items.length > 0 ? (
            <Text style={{ color: colors.dim, fontSize: 11, marginBottom: 4, lineHeight: 16 }}>
              {isCjkZh(locale)
                ? pickZh(locale, '点开查看；左滑删除。', '點開查看；左滑刪除。')
                : locale === 'ja'
                  ? 'タップで開く。左スワイプで削除。'
                  : 'Tap to open. Swipe left to delete.'}
            </Text>
          ) : null}

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

          {items.map((item, index) => {
            const title = formReadingListTitle(locale)
            const localeBadge = readingLocaleBadge(item.locale)
            const dateLabel = item.createdAt?.slice(0, 10) ?? ''
            const meta = [s('形气', '形氣', 'Form'), dateLabel, localeBadge].filter(Boolean).join(' · ')
            const confirmDelete = () => {
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
            }
            return (
              <HistoryReadingRow
                key={item.id}
                title={title}
                meta={meta}
                onPress={() =>
                  router.push({
                    pathname: '/result',
                    params: { readingId: item.id },
                  } as never)
                }
                onDelete={confirmDelete}
                colors={{
                  text: colors.text,
                  dim: colors.dim,
                  accent: colors.accent,
                  separator: colors.separator,
                  bg: colors.bg,
                }}
                spacing={spacing}
                showTopBorder={index === 0 && job.status !== 'running'}
                deleteLabel={s('删除', '刪除', 'Delete')}
              />
            )
          })}
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
