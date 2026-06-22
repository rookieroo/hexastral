/**
 * /timeline — 人生时间线 (ADR-0020, 2026-06 git-graph redesign).
 *
 * The life is drawn as a git graph (see components/TimelineGraph): the natal
 * 命局 is the SOURCE, each 大运 is a 10-year branch off the through-line of self,
 * the 大运 you're living is the checked-out HEAD branch carrying the 流年 as
 * commits, and 流月 are the finest commits of the current year.
 *
 * Gating is ONE wall, ONE CTA (2026-06 feedback — the old page showed three
 * "unlock" rows). Free sees the SOURCE + the current branch + this year; Pro
 * lights up the whole life. The single unlock CTA sits at the very bottom.
 *
 * ADR-0018 minimalism: no chrome, no bordered "cards". The graph and the app's
 * own type ARE the page. Element colors come from the shared 五行 palette.
 */

import {
  analyzeGeJu,
  type EarthlyBranch,
  getFourPillars,
  getFourPillarsShiShen,
  getShiShen,
  getTaoHua,
  getYiMa,
  type HeavenlyStem,
  retrodictionMatch,
  type WuXing,
} from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { verdictColors } from '@zhop/hexastral-tokens/palette'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { BookOpen, ChevronRight, Share2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import type { DrilldownYear } from '@/components/DrilldownGraph'
import { MoonLoader } from '@/components/MoonLoader'
import { SHARE_PALETTE, ShareableCard } from '@/components/ShareableCard'
import { DOMAIN_COLORS, ReadingBubble } from '@/components/TimelineGraph'
import { TimelineYearGraph } from '@/components/TimelineYearGraph'
import {
  fetchTimeline,
  fetchTimelineExplain,
  type PersonalFit,
  type TimelinePayload,
} from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { getAuspiceDeviceId } from '@/lib/device'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import { forwardLiuyue, type LiuyueCell } from '@/lib/liuyue'
import { shareTaglineFor, timelineShareChrome, timelineShareUrl } from '@/lib/share'

function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  return timeIndex * 2
}

/** Default the detail panel to "now": the current 流年, else current 大运, else SOURCE. */
function defaultSelection(payload: TimelinePayload): string {
  const cur = payload.liunian.find((r) => r.isCurrent)
  if (cur) return `liunian-${cur.year}`
  if (payload.currentDayunIndex >= 0) {
    const d = payload.dayun[payload.currentDayunIndex]
    if (d) return `dayun-${d.index}`
  }
  return 'source'
}

/**
 * Build the share snapshot — scoped to the CURRENT 大运 + this year's 流年 (we
 * share "by 大运 unit", not the whole 80-year line). Returns null when there's no
 * current 大运 in coverage, so the caller can hide the Share entry.
 */
function buildTimelineSnapshot(
  payload: TimelinePayload,
  t: ReturnType<typeof useStrings>['t']
): Parameters<typeof timelineShareUrl>[0] | null {
  const dayun =
    payload.currentDayunIndex >= 0 ? payload.dayun[payload.currentDayunIndex] : undefined
  if (!dayun) return null
  const liunian = payload.liunian.find((r) => r.isCurrent)
  const source = payload.pillars.day
  return {
    source: `${source.stem}${source.branch}`,
    dayun: `${dayun.pillar.stem}${dayun.pillar.branch}`,
    dayunAges: `${dayun.startAge}–${dayun.endAge}`,
    year: liunian?.year ?? new Date().getFullYear(),
    yearPillar: liunian ? `${liunian.pillar.stem}${liunian.pillar.branch}` : '—',
    fit: dayun.fit,
    advice: t.timelineAdvice[dayun.fit],
  }
}

interface BirthCtx {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
}

interface NodeDetail {
  heading: string
  body: string
  fit: PersonalFit | null
}

/**
 * Resolve a selected node id → its 对你而言 verdict + advice. Pure + shared by the
 * live Body and the share capture, so the PNG bakes exactly the node the user has
 * selected (WYSIWYG) instead of a hardcoded "current 大运".
 */
/** 紫微 second-system note per locale × tone (local copy; neutral carries none). */
const ZIWEI_NOTE: Record<
  'zh' | 'zh-Hant' | 'ja' | 'en',
  Record<'harmony' | 'tension' | 'growth', string>
> = {
  zh: {
    harmony: '紫微亦见助力，两套系统不约而同。',
    tension: '紫微亦显摩擦，宜稳不宜冒进。',
    growth: '紫微见张力，宜借势化解而非硬冲。',
  },
  'zh-Hant': {
    harmony: '紫微亦見助力，兩套系統不約而同。',
    tension: '紫微亦顯摩擦，宜穩不宜冒進。',
    growth: '紫微見張力，宜借勢化解而非硬衝。',
  },
  ja: {
    harmony: '紫微も後押し。二つの系統が一致。',
    tension: '紫微も摩擦を示す。慎重に。',
    growth: '紫微に張りあり。勢いを借りて化す。',
  },
  en: {
    harmony: 'Zi Wei agrees — both systems align.',
    tension: 'Zi Wei flags friction; steady over bold.',
    growth: 'Zi Wei shows tension; ride it, don’t force.',
  },
}

function resolveNodeDetail(
  payload: TimelinePayload,
  selectedId: string | null,
  t: ReturnType<typeof useStrings>['t'],
  /** Chart 用神 五行 — appended as a 化解 ("支线解法") on conflict / 忌神 nodes. */
  favorableEl?: WuXing | null,
  /** UI locale — headings drop the raw 干支 outside zh (jargon to non-CJK readers). */
  lang?: string
): NodeDetail | null {
  const cjk = (lang ?? 'zh').startsWith('zh')
  // The 用神/忌神 element note — the per-node "why" the per-grade advice drops.
  const elementNote = (reasons: string[], element: string): string => {
    if (reasons.includes('favorable_element_present'))
      return ` ${t.timelinePeriodElement.favorable.replace('{el}', element)}`
    if (reasons.includes('unfavorable_element_present'))
      return ` ${t.timelinePeriodElement.unfavorable.replace('{el}', element)}`
    return ''
  }
  // 化解 ("支线解法") — a 冲太岁 / 忌神 node is a "conflict"; resolve it by leaning
  // into the chart's 用神. git merge-conflict → resolution.
  const huajie = (reasons: string[]): string => {
    if (!favorableEl) return ''
    if (reasons.includes('personal_clash') || reasons.includes('unfavorable_element_present'))
      return ` ${t.timelineHuajie.replace('{el}', favorableEl)}`
    return ''
  }
  // 紫微 second-system note — when the server folded a 流年/流月四化 into this node,
  // surface whether 紫微 echoes the 八字 verdict (kept as local copy, like the
  // make-if card, so the shared i18n table stays untouched).
  const langKey =
    lang === 'zh-Hant' ? 'zh-Hant' : lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : 'zh'
  const ziweiNote = (z?: { tone: 'harmony' | 'tension' | 'growth' | 'neutral' }): string => {
    if (!z || z.tone === 'neutral') return ''
    return ` ${ZIWEI_NOTE[langKey][z.tone]}`
  }
  if (!selectedId) return null
  if (selectedId === 'source') {
    return {
      heading: cjk
        ? `${payload.pillars.day.stem}${payload.pillars.day.branch} · ${t.baziDayMaster}`
        : t.baziDayMaster,
      fit: null,
      body: t.personal.birthHint,
    }
  }
  if (selectedId.startsWith('dayun-')) {
    const idx = Number(selectedId.slice('dayun-'.length))
    const row = payload.dayun.find((d) => d.index === idx)
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
    return {
      heading: cjk
        ? `${row.pillar.stem}${row.pillar.branch} · ${row.startAge}–${row.endAge} · ${t.personal.fit[row.fit]}`
        : `${t.timelineDayun} · ${row.startAge}–${row.endAge} · ${t.personal.fit[row.fit]}`,
      fit: row.fit,
      body: `${t.timelineAdvice[row.fit]}${elementNote(row.reasons, row.pillar.element)}${clash}${huajie(row.reasons)}${ziweiNote(row.ziwei)}`,
    }
  }
  if (selectedId.startsWith('liuyue-')) {
    const [, y, m] = selectedId.split('-')
    const row = payload.liuyue.find((r) => r.year === Number(y) && r.month === Number(m))
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
    return {
      heading: cjk
        ? `${row.year}.${row.month} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`
        : `${row.year}.${row.month} · ${t.personal.fit[row.fit]}`,
      fit: row.fit,
      body: `${t.timelineAdvice[row.fit]}${elementNote(row.reasons, row.pillar.element)}${clash}${huajie(row.reasons)}${ziweiNote(row.ziwei)}`,
    }
  }
  const year = Number(selectedId.slice('liunian-'.length))
  // 流年 now come from each 大运's own decade (git-graph) — search those first,
  // falling back to the ±5y top-level set.
  const row =
    payload.dayun.flatMap((d) => d.liunian).find((r) => r.year === year) ??
    payload.liunian.find((r) => r.year === year)
  if (!row) return null
  const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
  return {
    heading: cjk
      ? `${row.year} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`
      : `${row.year} · ${t.personal.fit[row.fit]}`,
    fit: row.fit,
    body: `${t.timelineAdvice[row.fit]}${clash}${huajie(row.reasons)}${ziweiNote(row.ziwei)}`,
  }
}

/** 大运 lane hue by its 十神 domain vs the 日主 (matches the muted DOMAIN_COLORS). */
function domainColorFor(payload: TimelinePayload, dayunStem: string): string {
  const cat = getShiShen(
    payload.pillars.day.stem as HeavenlyStem,
    dayunStem as HeavenlyStem
  ).category
  return DOMAIN_COLORS[cat]
}

/** 吉/平/凶 dot colours — muted, on-theme (jade / slate-grey / terracotta). */
// Fit colors from the token single-source (平 = neutral grey, brand-tuned).
const FIT_COLOR = verdictColors

/** The chart's 用神 五行 (格局 + 强弱 → 取用) — the anchor for a node's 化解. */
function chartFavorableElement(payload: TimelinePayload): WuXing | null {
  const [y, m, d] = payload.birth.date.split('-').map(Number)
  if (!y || !m || !d) return null
  const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
  const pillars = getFourPillars({ year: y, month: m, day: d, hour })
  return analyzeGeJu(pillars, getFourPillarsShiShen(pillars)).favorableElement
}

interface Drill {
  dayunLabel: string
  domainColor: string
  years: DrilldownYear[]
  selectedYearIndex: number | null
  selectedYear: number | null
  liuyue: LiuyueCell[] | null
  liuyueNowMonth: number | null
  selectedMonth: number | null
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; payload: TimelinePayload; birth: BirthCtx }

export default function TimelineScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Which 大运 the drill-down shows (the selector picks it; default = the 大运
  // you're living). Replaces the old expand/collapse-all model.
  const [selectedDayunIndex, setSelectedDayunIndex] = useState(0)
  const handleSelect = useCallback((id: string) => setSelectedId(id), [])
  const onSelectDayun = useCallback(
    (i: number) => {
      if (state.kind !== 'data') return
      const dy = state.payload.dayun[i]
      if (!dy) return
      setSelectedDayunIndex(i)
      setSelectedId(`dayun-${dy.index}`)
    },
    [state]
  )
  // Derive the drill props for the SELECTED 大运: its 流年 as a git spine + (when a
  // 流年 is selected) that year's 流月 computed client-side. Lifted here so the live
  // graph and the share capture render the same drilled state.
  const drill = useMemo<Drill | null>(() => {
    if (state.kind !== 'data') return null
    const p = state.payload
    const di = Math.min(Math.max(0, selectedDayunIndex), p.dayun.length - 1)
    const dy = p.dayun[di]
    if (!dy) return null
    const favEl = chartFavorableElement(p)
    const years: DrilldownYear[] = dy.liunian.map((r) => ({
      gz: `${r.pillar.stem}${r.pillar.branch}`,
      year: r.year,
      fit: r.fit,
      isCurrent: r.isCurrent,
      age: r.age,
      element: r.pillar.element,
      shishen: getShiShen(p.pillars.day.stem as HeavenlyStem, r.pillar.stem as HeavenlyStem)
        .category,
    }))
    const yearFromId = selectedId?.startsWith('liunian-')
      ? Number(selectedId.slice('liunian-'.length))
      : selectedId?.startsWith('liuyue-')
        ? Number(selectedId.split('-')[1])
        : null
    let selectedYearIndex: number | null = null
    let selectedYear: number | null = null
    if (yearFromId != null) {
      const idx = dy.liunian.findIndex((r) => r.year === yearFromId)
      if (idx >= 0) {
        selectedYearIndex = idx
        selectedYear = yearFromId
      }
    }
    const monthRaw = selectedId?.startsWith('liuyue-') ? Number(selectedId.split('-')[2]) : null
    return {
      // zh keeps the 干支 大运 label; en/ja get the decade's age span instead —
      // universal, and short enough not to clip (the cut-off 大运 label, 2026-06).
      dayunLabel: locale.startsWith('zh')
        ? `${dy.pillar.stem}${dy.pillar.branch} 大运`
        : `${dy.startAge}–${dy.endAge}`,
      domainColor: domainColorFor(p, dy.pillar.stem),
      years,
      selectedYearIndex,
      selectedYear,
      // Forward-window only: a year outside the next-12-months drills into nothing,
      // and the current year shows this-month-forward (no foreknowledge / no past).
      liuyue: selectedYear != null ? forwardLiuyue(selectedYear, favEl) : null,
      // Lunar≈Gregorian month for the now-highlight (节气 precision is a TODO).
      liuyueNowMonth: selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : null,
      selectedMonth: monthRaw != null && Number.isFinite(monthRaw) ? monthRaw : null,
    }
  }, [state, selectedDayunIndex, selectedId, locale])
  // Image share: capture the real graph (not a server reconstruction) to a PNG.
  // Pre-warm once data lands — the Skia graph is the slow part of the capture, so
  // baking it ahead of the tap makes Share feel instant.
  const {
    shotRef,
    capturing,
    share: shareImage,
  } = useImageShare({
    prewarm: state.kind === 'data',
    // Re-warm whenever the user drills into a different node — the off-screen card
    // bakes the CURRENT graph, so a static key shared the FIRST node's image (or
    // fell back to a slow on-tap capture). selectedId encodes the full node
    // (dayun-N / liunian-YYYY / liuyue-YYYY-M); the cleanup debounces rapid taps.
    warmKey: state.kind === 'data' ? `${selectedDayunIndex}:${selectedId ?? 'root'}` : 'pending',
  })

  const load = useCallback(() => {
    setState({ kind: 'loading' })
    getAuspiceBirthInfo()
      .then((info) => {
        if (!info?.gender) {
          setState({ kind: 'no-birth' })
          return
        }
        const birthHour = shichenToHour(info.timeIndex)
        const gender = info.gender === '男' ? 'M' : 'F'
        return fetchTimeline({
          birthDate: info.solarDate,
          birthHour,
          gender,
          locale,
        }).then((payload) => {
          setSelectedId(defaultSelection(payload))
          setSelectedDayunIndex(payload.currentDayunIndex >= 0 ? payload.currentDayunIndex : 0)
          setState({
            kind: 'data',
            payload,
            birth: { birthDate: info.solarDate, birthHour, gender },
          })
        })
      })
      .catch((e: unknown) => {
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
  }, [locale])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const canvasWidth = screenWidth - spacing.xl * 2

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing['3xl'] * 2,
          gap: spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '300' }}>
            {t.timelineTitle}
          </Text>
          {/* Share the REAL graph as an image (captured on-device → instant, no
              Worker round-trip). Available to all tiers — the captured graph is
              what the user already sees, so it leaks no Pro content. The /s/
              landing URL rides along as the caption (funnel + SEO). */}
          {state.kind === 'data'
            ? (() => {
                const snap = buildTimelineSnapshot(state.payload, t)
                if (!snap) return null
                return (
                  <Pressable
                    onPress={() =>
                      shareImage(`${shareTaglineFor(locale)}\n${timelineShareUrl(snap, locale)}`)
                    }
                    hitSlop={12}
                    accessibilityRole='button'
                    accessibilityLabel='Share'
                    style={{ padding: 4 }}
                  >
                    <Share2 size={20} color={colors.secondary} strokeWidth={1.6} />
                  </Pressable>
                )
              })()
            : null}
        </View>

        {/* 你是谁 · 完整命书 — the WHO to the timeline's WHEN. The 命书 (八字+紫微
            chaptered deep-read) is the same chart read as identity; it lives here,
            beside its time-axis view, rather than competing for a Today-home CTA.
            /reading guards its own no-birth case, so this is always safe to tap. */}
        <Pressable
          onPress={() => router.push('/reading')}
          accessibilityRole='button'
          accessibilityLabel={t.personal.readingTitle}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.card,
            borderRadius: 14,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <BookOpen size={20} color={colors.accent} strokeWidth={1.6} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>
              {t.personal.readingTitle}
            </Text>
            <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 16 }}>
              {t.personal.readingHint}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.dim} strokeWidth={1.6} />
        </Pressable>

        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <MoonLoader />
          </View>
        ) : state.kind === 'no-birth' ? (
          <NoBirthCard
            colors={colors}
            spacing={spacing}
            body={t.personalEmptyBody}
            cta={t.personalEmptyCta}
            onPress={() => router.push('/me')}
          />
        ) : state.kind === 'error' ? (
          <Text style={{ color: colors.secondary }}>
            {t.loadFailed}: {state.message}
          </Text>
        ) : (
          <Body
            payload={state.payload}
            isPro={isPro}
            selectedId={selectedId}
            selectedDayunIndex={selectedDayunIndex}
            drill={drill}
            onSelect={handleSelect}
            onSelectDayun={onSelectDayun}
            onLockedTap={() => setPaywallOpen(true)}
            colors={colors}
            spacing={spacing}
            canvasWidth={canvasWidth}
            t={t}
            lang={locale}
          />
        )}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* Off-screen capture target — mounted only while capturing, then unmounted.
          Renders the real TimelineGraph on a fixed ivory palette so the PNG is
          brand-consistent regardless of the user's theme. */}
      {capturing && state.kind === 'data' && drill
        ? (() => {
            const snap = buildTimelineSnapshot(state.payload, t)
            const chrome = timelineShareChrome(locale)
            const favEl = chartFavorableElement(state.payload)
            // WYSIWYG: bake the node the user actually has selected (its highlight +
            // reading), falling back to the current 大运 so a fresh share still has a
            // takeaway. What they see on screen = what they share.
            const shareDetail =
              resolveNodeDetail(state.payload, selectedId, t, favEl, locale) ??
              (snap
                ? {
                    heading: `${snap.dayun} · ${snap.dayunAges} · ${t.personal.fit[snap.fit]}`,
                    body: snap.advice,
                    fit: snap.fit as PersonalFit | null,
                  }
                : null)
            return (
              <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents='none'>
                <ShareableCard
                  ref={shotRef}
                  width={screenWidth}
                  locale={locale}
                  eyebrow={chrome.eyebrow}
                  footer={chrome.footer}
                  footerUrl={chrome.url}
                  title={t.timelineTitle}
                  subtitle={
                    snap
                      ? `${snap.source}${locale.startsWith('zh') ? '日' : ''} · ${snap.dayun} ${snap.dayunAges}`
                      : undefined
                  }
                >
                  <TimelineYearGraph
                    width={screenWidth - 48}
                    colors={SHARE_PALETTE}
                    dayunLabel={drill.dayunLabel}
                    liunian={drill.years}
                    selectedYearIndex={drill.selectedYearIndex}
                    onSelectYear={() => {}}
                    fitColor={FIT_COLOR}
                    lang={locale}
                    isPro={isPro}
                  />
                  {/* Bake the SELECTED node's reading below the graph (no anchored
                      popover in a static card) — the share's takeaway tracks the
                      user's selection. */}
                  {shareDetail ? (
                    <ReadingBubble
                      heading={shareDetail.heading}
                      body={shareDetail.body}
                      fit={shareDetail.fit}
                      colors={SHARE_PALETTE}
                    />
                  ) : null}
                </ShareableCard>
              </View>
            )
          })()
        : null}
    </SafeAreaView>
  )
}

// ── Body ──────────────────────────────────────────────────────────────────

interface BodyColors {
  text: string
  secondary: string
  dim: string
  accent: string
  accentGhost: string
  separator: string
  bg: string
}
interface BodySpacing {
  sm: number
  md: number
  lg: number
  xl: number
  '3xl': number
}

// 印证 — pinnable life-event categories (mirrors the API's EVENT_TYPES, minus 'other'
// which has no chip). Module-level so the union types the panel's state precisely.
const PIN_CATS = ['career', 'relationship', 'health', 'travel', 'education', 'family'] as const
type PinCat = (typeof PIN_CATS)[number]

/**
 * 印证 panel — shown under a selected PAST 流年. The user pins what they lived that
 * year; the chart corroborates it via `retrodictionMatch` over the period's signals
 * (用神/忌神/冲 from the server-computed reasons + 桃花/驿马 from the 本命支). The
 * "怎么这么准" moment, built entirely on already-trusted data + the astro-core keystone.
 */
function YinzhengPanel({
  row,
  birthBranch,
  t,
  colors,
  spacing,
}: {
  row: { year: number; pillar: { branch: string }; reasons: readonly string[] }
  birthBranch: EarthlyBranch
  t: ReturnType<typeof useStrings>['t']
  colors: BodyColors
  spacing: BodySpacing
}) {
  const [cat, setCat] = useState<PinCat | null>(null)
  const line = useMemo(() => {
    if (!cat) return null
    const m = retrodictionMatch(cat, {
      favorsElement: row.reasons.includes('favorable_element_present'),
      harmsElement: row.reasons.includes('unfavorable_element_present'),
      clashesBenming: row.reasons.includes('personal_clash'),
      taohua: row.pillar.branch === getTaoHua(birthBranch),
      yima: row.pillar.branch === getYiMa(birthBranch),
    })
    if (!m.hasMatch) return t.yinzheng.noMatch
    return `${t.yinzheng.lead}${m.matched.map((k) => t.yinzheng.signals[k]).join(' · ')} — ${t.yinzheng.matchFrame}`
  }, [cat, row, birthBranch, t])

  return (
    <View
      style={{
        gap: spacing.sm,
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        paddingTop: spacing.md,
      }}
    >
      <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1 }}>
        {t.yinzheng.prompt}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {PIN_CATS.map((c) => {
          const sel = c === cat
          return (
            <Pressable
              key={c}
              onPress={() => setCat(sel ? null : c)}
              accessibilityRole='button'
              accessibilityState={{ selected: sel }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: sel ? 1 : 0.5,
                borderColor: sel ? colors.accent : colors.separator,
                backgroundColor: sel ? colors.accentGhost : 'transparent',
              }}
            >
              <Text style={{ color: sel ? colors.accent : colors.text, fontSize: 13 }}>
                {t.yinzheng.cats[c]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {line ? (
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{line}</Text>
      ) : null}
    </View>
  )
}

/** Contextual drill-in to the 八字 explainer (大运/流年 section) from the node
 *  reading — quiet education for terms the reading uses. Free, no paywall. */
function AboutLuckLink({
  t,
  colors,
}: {
  t: ReturnType<typeof useStrings>['t']
  colors: BodyColors
}) {
  const router = useRouter()
  return (
    <Pressable
      onPress={() => router.push('/festival/topic-bazi' as Parameters<typeof router.push>[0])}
      accessibilityRole='button'
      accessibilityLabel={t.timelineAboutLuck}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Text style={{ color: colors.dim, fontSize: 12 }}>{t.timelineAboutLuck}</Text>
      <Text style={{ color: colors.dim, fontSize: 12 }}>›</Text>
    </Pressable>
  )
}

/** 择吉 deep-link — opens /event with the selected future 流年's window prefilled.
 *  Uses `business` as a sensible default (a Specialized free-tier event); the user
 *  can switch event types once they land. */
function ZejiLink({
  year,
  t,
  colors,
  spacing,
}: {
  year: number
  t: ReturnType<typeof useStrings>['t']
  colors: BodyColors
  spacing: BodySpacing
}) {
  const router = useRouter()
  const from = `${year}-02-01`
  const to = `${year}-05-01`
  return (
    <Pressable
      onPress={() =>
        router.push(
          `/event?event=business&from=${from}&to=${to}` as Parameters<typeof router.push>[0]
        )
      }
      accessibilityRole='button'
      accessibilityLabel={t.timelineZejiCta.replace('{year}', String(year))}
      style={({ pressed }) => ({
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        paddingTop: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>
        {t.timelineZejiCta.replace('{year}', String(year))}
      </Text>
    </Pressable>
  )
}

function Body({
  payload,
  isPro,
  selectedId,
  selectedDayunIndex,
  drill,
  onSelect,
  onSelectDayun,
  onLockedTap,
  colors,
  spacing,
  canvasWidth,
  t,
  lang,
}: {
  payload: TimelinePayload
  isPro: boolean
  selectedId: string | null
  selectedDayunIndex: number
  drill: Drill | null
  onSelect: (id: string) => void
  onSelectDayun: (i: number) => void
  onLockedTap: () => void
  colors: BodyColors
  spacing: BodySpacing
  canvasWidth: number
  t: ReturnType<typeof useStrings>['t']
  lang: string
}) {
  const favEl = useMemo(() => chartFavorableElement(payload), [payload])
  // Which year's 流月 sub-branch is woven open (Pro). Derived-open only when it
  // equals the selected year, so selecting elsewhere collapses the weave.
  const [liuyueOpenYear, setLiuyueOpenYear] = useState<number | null>(null)
  // Resolve the selected node → a 对你而言 verdict + advice line (no card chrome).
  const detail = useMemo(
    () => resolveNodeDetail(payload, selectedId, t, favEl, lang),
    [selectedId, payload, t, favEl, lang]
  )

  // Pro per-node deep-read (LLM, server-落库). Lazy — fetched only when a
  // 大运/流年/流月 node is open. The deterministic `detail.body` renders instantly;
  // the deep-read swaps in when it returns (and only for the still-selected node).
  // Free → no fetch; the upsell under the reading carries the Pro cue.
  const [deepRead, setDeepRead] = useState<{ id: string; reading: string } | null>(null)
  useEffect(() => {
    if (!selectedId || !isPro) {
      setDeepRead(null)
      return
    }
    let nodeType: '大运' | '流年' | '流月' | null = null
    let year = 0
    let month = 0
    if (selectedId.startsWith('dayun-')) {
      const row = payload.dayun.find((d) => d.index === Number(selectedId.slice('dayun-'.length)))
      if (row) {
        nodeType = '大运'
        year = row.startYear
      }
    } else if (selectedId.startsWith('liunian-')) {
      nodeType = '流年'
      year = Number(selectedId.slice('liunian-'.length))
    } else if (selectedId.startsWith('liuyue-')) {
      const parts = selectedId.split('-')
      nodeType = '流月'
      year = Number(parts[1])
      month = Number(parts[2])
    }
    if (!nodeType || !Number.isFinite(year)) {
      setDeepRead(null)
      return
    }
    const nt = nodeType
    let cancelled = false
    void (async () => {
      const deviceId = await getAuspiceDeviceId()
      const res = await fetchTimelineExplain({
        birthDate: payload.birth.date,
        birthHour: payload.birth.hour,
        gender: payload.birth.gender,
        nodeType: nt,
        year,
        month,
        locale: lang,
        deviceId,
        isPro: true,
      }).catch(() => null)
      if (!cancelled && res?.reading) setDeepRead({ id: selectedId, reading: res.reading })
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, isPro, payload, lang])

  // 印证 — the subject's 本命支 (year branch) drives the 桃花/驿马 retrodiction check.
  const birthBranch = useMemo<EarthlyBranch | null>(() => {
    const [y, m, d] = payload.birth.date.split('-').map(Number)
    if (!y || !m || !d) return null
    const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
    return getFourPillars({ year: y, month: m, day: d, hour }).year.branch
  }, [payload.birth])

  // The selected node, when it's a PAST 流年 — the only place 印证 applies. 流年 now
  // come from each 大运's own decade, so search those.
  const pinnableRow = useMemo(() => {
    if (!selectedId?.startsWith('liunian-')) return null
    const year = Number(selectedId.slice('liunian-'.length))
    const row = payload.dayun.flatMap((d) => d.liunian).find((r) => r.year === year)
    return row && row.year < new Date().getFullYear() ? row : null
  }, [selectedId, payload.dayun])

  // 择吉 link — the selected node is a FUTURE 流年 → deep-link into /event with that
  // year's 立春-aligned window (Feb 1 → May 1, within the server's 92-day cap).
  const futureLiunianYear = useMemo<number | null>(() => {
    if (!selectedId?.startsWith('liunian-')) return null
    const year = Number(selectedId.slice('liunian-'.length))
    if (!Number.isFinite(year) || year <= new Date().getFullYear()) return null
    return payload.dayun.flatMap((d) => d.liunian).some((r) => r.year === year) ? year : null
  }, [selectedId, payload])
  const curIdx = payload.currentDayunIndex

  return (
    <View style={{ gap: spacing.xl }}>
      {!isPro ? (
        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
          {t.timelineFreePreviewNote}
        </Text>
      ) : null}

      {/* 大运 selector — pick a decade to drill into (the whole-life view read long
          + unfocused). Free unlocks only the 大运 you're living; others → paywall. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
      >
        {payload.dayun.map((d, i) => {
          const sel = i === selectedDayunIndex
          const locked = !isPro && i !== curIdx
          return (
            <Pressable
              key={d.index}
              onPress={() => (locked ? onLockedTap() : onSelectDayun(i))}
              accessibilityRole='button'
              accessibilityState={{ selected: sel }}
              style={{
                width: 50,
                paddingVertical: spacing.sm,
                borderRadius: 11,
                borderWidth: 0.5,
                borderColor: sel ? colors.accent : colors.separator,
                backgroundColor: sel ? colors.accent : 'transparent',
                alignItems: 'center',
                opacity: locked ? 0.45 : 1,
              }}
            >
              {/* Age leads (universal); 干支 demoted to a muted zh-only second line
                  — raw 干支 reads as jargon outside Chinese (2026-06 feedback). */}
              <Text style={{ color: sel ? '#fff' : colors.text, fontSize: 16, fontWeight: '500' }}>
                {`${d.startAge}+`}
              </Text>
              {lang.startsWith('zh') ? (
                <Text style={{ color: sel ? '#fff' : colors.dim, fontSize: 10, marginTop: 1 }}>
                  {`${d.pillar.stem}${d.pillar.branch}`}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>

      {/* The selected 大运 → its 流年 git spine → tap a 流年 → its 流月 sub-lane
          (月相-linked, drawn in). */}
      {drill ? (
        <TimelineYearGraph
          width={canvasWidth}
          colors={colors}
          dayunLabel={drill.dayunLabel}
          liunian={drill.years}
          selectedYearIndex={drill.selectedYearIndex}
          onSelectYear={(idx) => {
            const r = drill.years[idx]
            if (!r) return
            onSelect(`liunian-${r.year}`)
            // 流月 only for THIS year + ahead — past months aren't actionable, so we
            // don't weave them (2026-06 feedback). Pro: tapping opens it (re-tap
            // closes); Free: stays locked → the upsell under the reading.
            const past = r.year < new Date().getFullYear()
            if (isPro && !past) setLiuyueOpenYear((c) => (c === r.year ? null : r.year))
          }}
          fitColor={FIT_COLOR}
          lang={lang}
          isPro={isPro}
          liuyue={drill.liuyue}
          liuyueOpen={drill.selectedYear != null && liuyueOpenYear === drill.selectedYear}
          selectedMonth={drill.selectedMonth}
          onSelectMonth={(mo) => {
            if (drill.selectedYear != null) onSelect(`liuyue-${drill.selectedYear}-${mo}`)
          }}
        />
      ) : null}

      {/* 对你而言 reading for the selected 大运 / 流年 / 流月. */}
      {detail ? (
        <ReadingBubble
          heading={detail.heading}
          body={deepRead?.id === selectedId ? deepRead.reading : detail.body}
          fit={detail.fit}
          colors={colors}
        />
      ) : null}

      {/* Contextual education — the reading speaks of 大运/流年; a quiet drill-in
          to the 八字 explainer answers what they are. Free; no paywall. */}
      {detail ? <AboutLuckLink t={t} colors={colors} /> : null}

      {/* Free: advertise the Pro 流月 (monthly) weave under the reading, for THIS
          year + ahead — restores the value cue the removed popover used to carry,
          without blocking the year column (2026-06 feedback). */}
      {!isPro && drill?.selectedYear != null && drill.selectedYear >= new Date().getFullYear() ? (
        <Pressable
          onPress={onLockedTap}
          accessibilityRole='button'
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
            {t.timelineLiuyueUpsell}
          </Text>
        </Pressable>
      ) : null}

      {/* 印证 — pin a real event on a past 流年 and let the chart corroborate it. */}
      {isPro && pinnableRow && birthBranch ? (
        <YinzhengPanel
          key={pinnableRow.year}
          row={pinnableRow}
          birthBranch={birthBranch}
          t={t}
          colors={colors}
          spacing={spacing}
        />
      ) : null}

      {/* 择吉 deep-link — when a FUTURE 流年 is selected, jump into /event prefilled
          with that year's window (立春-aligned, within the server's 92-day cap). */}
      {futureLiunianYear ? (
        <ZejiLink year={futureLiunianYear} t={t} colors={colors} spacing={spacing} />
      ) : null}

      {/* ONE unlock — the only paywall on the page. */}
      {!isPro ? (
        <Pressable
          onPress={onLockedTap}
          accessibilityRole='button'
          accessibilityLabel={t.timelineProLocked}
          style={({ pressed }) => ({
            marginTop: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>
            {t.timelineProLocked}
          </Text>
          <ChevronRightIcon size={16} color={colors.accent} strokeWidth={1.4} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** No-birth prompt — a single fit-colored rule that routes to the birth form. */
function NoBirthCard({
  colors,
  spacing,
  body,
  cta,
  onPress,
}: {
  colors: BodyColors
  spacing: BodySpacing
  body: string
  cta: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={cta}
      style={({ pressed }) => ({
        borderLeftWidth: 2.5,
        borderLeftColor: colors.accent,
        paddingLeft: spacing.lg,
        gap: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>{body}</Text>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
        {cta}
      </Text>
    </Pressable>
  )
}
