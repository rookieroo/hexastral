/**
 * /timeline — Xingqi Life axis (Yuun-parity git spine).
 * Data: POST /api/physiognomy/cycle/timeline only.
 * Free: current 大运 + ghost chips + single CTA. Pro: full drill + explain + 形气条.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { verdictColors } from '@zhop/hexastral-tokens/palette'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReadingBubble } from '@/components/timeline/ReadingBubble'
import { TimelineYearGraph } from '@/components/timeline/TimelineYearGraph'
import { fetchFaceEvents } from '@/lib/api'
import { fetchCycleTimeline, type TimelinePayload } from '@/lib/cycle-api'
import type { DrilldownYear, LiuyueCell } from '@/lib/cycle-types'
import { resolveLocale } from '@/lib/i18n'
import { forwardLiuyue } from '@/lib/liuyue'
import { chartFavorableElement, resolveNodeDetail } from '@/lib/timeline-detail'
import { loadXingqiBirth } from '@/lib/xingqi-birth'

const COPY = {
  zh: {
    title: '人生时间线',
    subtitle: '大运 → 流年 → 流月。形气窗口见下方条。',
    loading: '加载中…',
    freeNote: '免费可看当前大运；点灰色大运或下方解锁完整人生轴与流月。',
    goPro: '订阅 Pro · 解锁人生时间线',
    editBirth: '编辑出生信息',
    needBirth: '请先完善出生信息',
    back: '返回',
    now: '今',
    events: '形气窗口',
    noEvents: '暂无形气事件表。',
    share: '分享',
    liuyueUpsell: '解锁流月织入',
  },
  'zh-Hant': {
    title: '人生時間線',
    subtitle: '大運 → 流年 → 流月。形氣窗口見下方條。',
    loading: '載入中…',
    freeNote: '免費可看當前大運；點灰色大運或下方解鎖完整人生軸與流月。',
    goPro: '訂閱 Pro · 解鎖人生時間線',
    editBirth: '編輯出生資訊',
    needBirth: '請先完善出生資訊',
    back: '返回',
    now: '今',
    events: '形氣窗口',
    noEvents: '暫無形氣事件表。',
    share: '分享',
    liuyueUpsell: '解鎖流月織入',
  },
  en: {
    title: 'Life axis',
    subtitle: 'DaYun → year → month. Form windows below.',
    loading: 'Loading…',
    freeNote: 'Free shows your current decade; tap a ghost chip or unlock below for the full axis and months.',
    goPro: 'Go Pro · unlock life axis',
    editBirth: 'Edit birth',
    needBirth: 'Add birth info first',
    back: 'Back',
    now: 'Now',
    events: 'Form windows',
    noEvents: 'No form event table yet.',
    share: 'Share',
    liuyueUpsell: 'Unlock monthly weave',
  },
  ja: {
    title: '人生タイムライン',
    subtitle: '大運 → 流年 → 流月。形気ウィンドウは下段。',
    loading: '読み込み中…',
    freeNote: '無料では今の大運のみ。灰色の大運や下のボタンで全体と流月を解除。',
    goPro: 'Pro で人生タイムラインを解除',
    editBirth: '出生情報を編集',
    needBirth: '先に出生情報を入力してください',
    back: '戻る',
    now: '今',
    events: '形気ウィンドウ',
    noEvents: '形気イベントはまだありません。',
    share: '共有',
    liuyueUpsell: '流月を解除',
  },
} as const

type FaceEvent = { startMonth?: string; endMonth?: string | null; theme?: string; note?: string }

export default function XingqiTimelineScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const locale = resolveLocale()
  const t = COPY[locale]
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')

  const [payload, setPayload] = useState<TimelinePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dayunIndex, setDayunIndex] = useState(0)
  const [selectedYearIndex, setSelectedYearIndex] = useState<number | null>(null)
  const [liuyueOpen, setLiuyueOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [events, setEvents] = useState<FaceEvent[]>([])
  const [explain, setExplain] = useState<string | null>(null)

  const openPaywall = useCallback(() => {
    router.push('/(commerce)/paywall' as never)
  }, [router])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const birth = await loadXingqiBirth()
          if (!birth) {
            if (!cancelled) {
              setError('birth')
              setPayload(null)
            }
            return
          }
          const data = await fetchCycleTimeline({
            birthDate: birth.date,
            birthHour: birth.hour,
            gender: birth.gender,
            locale,
          })
          if (cancelled) return
          setPayload(data)
          const cur = data.currentDayunIndex >= 0 ? data.currentDayunIndex : 0
          setDayunIndex(cur)
          const years = data.dayun[cur]?.liunian ?? []
          const yi = years.findIndex((y) => y.isCurrent)
          setSelectedYearIndex(yi >= 0 ? yi : years.length ? 0 : null)
          setLiuyueOpen(false)
          setSelectedMonth(null)
          if (isPro) {
            try {
              const ev = await fetchFaceEvents()
              if (!cancelled) setEvents(ev.events ?? [])
            } catch {
              if (!cancelled) setEvents([])
            }
          } else if (!cancelled) {
            setEvents([])
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'load_failed')
            setPayload(null)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [isPro, locale])
  )

  const favEl = useMemo(() => (payload ? chartFavorableElement(payload) : null), [payload])

  const dayun = payload?.dayun[dayunIndex]
  const years: DrilldownYear[] = useMemo(() => {
    if (!dayun) return []
    return dayun.liunian.map((r) => ({
      gz: `${r.pillar.stem}${r.pillar.branch}`,
      year: r.year,
      fit: r.fit,
      isCurrent: r.isCurrent,
      age: r.age,
      element: r.pillar.element,
    }))
  }, [dayun])

  const selectedYear =
    selectedYearIndex != null && years[selectedYearIndex]
      ? years[selectedYearIndex]!.year
      : null

  const liuyue: LiuyueCell[] | null = useMemo(() => {
    if (!isPro || selectedYear == null) return null
    return forwardLiuyue(selectedYear, favEl)
  }, [favEl, isPro, selectedYear])

  const selectedId = useMemo(() => {
    if (selectedMonth != null && selectedYear != null) {
      return `liuyue-${selectedYear}-${selectedMonth}`
    }
    if (selectedYear != null) return `liunian-${selectedYear}`
    if (dayun) return `dayun-${dayun.index}`
    return 'source'
  }, [dayun, selectedMonth, selectedYear])

  const detail = useMemo(() => {
    if (!payload) return null
    return resolveNodeDetail(payload, selectedId, locale)
  }, [locale, payload, selectedId])

  useFocusEffect(
    useCallback(() => {
      if (!payload || !isPro || !selectedId.startsWith('liunian-')) {
        setExplain(null)
        return
      }
      let cancelled = false
      const year = Number(selectedId.slice('liunian-'.length))
      void (async () => {
        try {
          const { fetchCycleTimelineExplain } = await import('@/lib/cycle-api')
          const res = await fetchCycleTimelineExplain({
            birthDate: payload.birth.date,
            birthHour: payload.birth.hour,
            gender: payload.birth.gender,
            locale,
            nodeType: 'liunian',
            year,
          })
          if (!cancelled) setExplain(res.reading)
        } catch {
          if (!cancelled) setExplain(null)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [isPro, locale, payload, selectedId])
  )

  const graphColors = {
    text: colors.text,
    secondary: colors.secondary,
    dim: colors.dim,
    accent: colors.accent,
    separator: colors.separator,
    bg: colors.bg,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 32,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 15 }}>{t.back}</Text>
          </Pressable>
          {payload ? (
            <Pressable
              onPress={() => {
                const day = payload.pillars.day
                void Share.share({
                  message: `${t.title} · ${day.stem}${day.branch} · Xingqi`,
                })
              }}
              hitSlop={12}
            >
              <Text style={{ color: colors.accent, fontSize: 15 }}>{t.share}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 28 }}>{t.title}</Text>
        <Text style={{ color: colors.secondary, lineHeight: 22 }}>{t.subtitle}</Text>

        {loading ? (
          <Text style={{ color: colors.dim }}>{t.loading}</Text>
        ) : error === 'birth' || (error && !payload) ? (
          <>
            <Text style={{ color: colors.secondary }}>
              {error === 'birth' ? t.needBirth : error}
            </Text>
            <Button variant='secondary' onPress={() => router.push('/birth' as never)}>
              {t.editBirth}
            </Button>
          </>
        ) : payload && dayun ? (
          <>
            {!isPro ? (
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>{t.freeNote}</Text>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {payload.dayun.map((d, i) => {
                  const hot = i === dayunIndex
                  const locked = !isPro && !d.isCurrent
                  return (
                    <Pressable
                      key={d.index}
                      onPress={() => {
                        if (locked) {
                          openPaywall()
                          return
                        }
                        setDayunIndex(i)
                        const curYi = d.liunian.findIndex((y) => y.isCurrent)
                        setSelectedYearIndex(curYi >= 0 ? curYi : 0)
                        setLiuyueOpen(false)
                        setSelectedMonth(null)
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderWidth: 0.5,
                        borderColor: hot ? colors.accent : colors.separator,
                        opacity: locked ? 0.35 : 1,
                      }}
                    >
                      <Text style={{ color: hot ? colors.accent : colors.text, fontSize: 12 }}>
                        {d.startAge}–{d.endAge}
                        {d.isCurrent ? ` · ${t.now}` : ''}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <TimelineYearGraph
              width={Math.min(width - spacing.xl * 2, 360)}
              colors={graphColors}
              dayunLabel={`${dayun.pillar.stem}${dayun.pillar.branch} · ${dayun.startAge}–${dayun.endAge}`}
              liunian={years}
              selectedYearIndex={selectedYearIndex}
              onSelectYear={(i) => {
                setSelectedYearIndex(i)
                setSelectedMonth(null)
                setLiuyueOpen(isPro)
              }}
              fitColor={verdictColors}
              nowLabel={t.now}
              lang={locale}
              isPro={isPro}
              liuyue={liuyue}
              liuyueOpen={liuyueOpen}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
            />

            {detail ? (
              <ReadingBubble
                heading={detail.heading}
                body={explain ? `${detail.body}\n\n${explain}` : detail.body}
                fit={detail.fit}
                colors={graphColors}
              />
            ) : null}

            {!isPro && selectedYear != null && selectedYear >= new Date().getFullYear() ? (
              <Pressable onPress={openPaywall}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                  {t.liuyueUpsell}
                </Text>
              </Pressable>
            ) : null}

            {!isPro ? (
              <Button variant='primary' onPress={openPaywall}>
                {t.goPro}
              </Button>
            ) : (
              <View style={{ gap: 8, marginTop: spacing.sm }}>
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono',
                    color: colors.dim,
                    fontSize: 11,
                    letterSpacing: 1.2,
                  }}
                >
                  {t.events}
                </Text>
                {events.length === 0 ? (
                  <Text style={{ color: colors.secondary }}>{t.noEvents}</Text>
                ) : (
                  events.slice(0, 6).map((e, i) => (
                    <Pressable
                      key={`${e.startMonth}-${i}`}
                      onPress={() => router.push('/result' as never)}
                      style={{ gap: 2 }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14 }}>
                        {e.startMonth}
                        {e.endMonth ? `–${e.endMonth}` : ''} · {e.theme}
                      </Text>
                      {e.note ? (
                        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
                          {e.note}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
