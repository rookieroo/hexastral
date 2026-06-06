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
  getJiangXing,
  getJieSha,
  getTaoHua,
  getTianYiGuiRen,
  getWenChangGuiRen,
  getYiMa,
  retrodictionMatch,
  type WuXing,
} from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { Share2 } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { SHARE_PALETTE, ShareableCard } from '@/components/ShareableCard'
import {
  LiuyueStrip,
  ReadingBubble,
  type ShenShaBranches,
  TimelineGraph,
} from '@/components/TimelineGraph'
import { fetchTimeline, type PersonalFit, type TimelinePayload } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
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
function resolveNodeDetail(
  payload: TimelinePayload,
  selectedId: string | null,
  t: ReturnType<typeof useStrings>['t'],
  /** Chart 用神 五行 — appended as a 化解 ("支线解法") on conflict / 忌神 nodes. */
  favorableEl?: WuXing | null
): NodeDetail | null {
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
  if (!selectedId) return null
  if (selectedId === 'source') {
    return {
      heading: `${payload.pillars.day.stem}${payload.pillars.day.branch} · ${t.baziDayMaster}`,
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
      heading: `${row.pillar.stem}${row.pillar.branch} · ${row.startAge}–${row.endAge} · ${t.personal.fit[row.fit]}`,
      fit: row.fit,
      body: `${t.timelineAdvice[row.fit]}${elementNote(row.reasons, row.pillar.element)}${clash}${huajie(row.reasons)}`,
    }
  }
  if (selectedId.startsWith('liuyue-')) {
    const [, y, m] = selectedId.split('-')
    const row = payload.liuyue.find((r) => r.year === Number(y) && r.month === Number(m))
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
    return {
      heading: `${row.year}.${row.month} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`,
      fit: row.fit,
      body: `${t.timelineAdvice[row.fit]}${elementNote(row.reasons, row.pillar.element)}${clash}${huajie(row.reasons)}`,
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
    heading: `${row.year} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`,
    fit: row.fit,
    body: `${t.timelineAdvice[row.fit]}${clash}${huajie(row.reasons)}`,
  }
}

/** 本命-derived 神煞 branches (日干 → 贵人/文昌; 本命支 → 桃花/驿马/将星/劫煞) — the
 *  per-node "event flavor" chips. */
function birthShenSha(payload: TimelinePayload): ShenShaBranches {
  const [y, m, d] = payload.birth.date.split('-').map(Number)
  if (!y || !m || !d) return {}
  const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
  const pillars = getFourPillars({ year: y, month: m, day: d, hour })
  const dayStem = pillars.day.stem
  const branch = pillars.year.branch
  return {
    taohua: getTaoHua(branch),
    yima: getYiMa(branch),
    guiren: getTianYiGuiRen(dayStem),
    wenchang: getWenChangGuiRen(dayStem),
    jiangxing: getJiangXing(branch),
    jiesha: getJieSha(branch),
  }
}

/** The chart's 用神 五行 (格局 + 强弱 → 取用) — the anchor for a node's 化解. */
function chartFavorableElement(payload: TimelinePayload): WuXing | null {
  const [y, m, d] = payload.birth.date.split('-').map(Number)
  if (!y || !m || !d) return null
  const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
  const pillars = getFourPillars({ year: y, month: m, day: d, hour })
  return analyzeGeJu(pillars, getFourPillarsShiShen(pillars)).favorableElement
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
  // Per-大运 user toggles — a SET of array indices that XOR with the default-
  // expanded set (current + next-10y). Default is empty: the user hasn't
  // toggled anything, so the display follows the auto-rule. Tapping a 大运 head
  // flips that decade's expansion state — both directions (collapse a default-
  // open decade, expand a default-closed one).
  const [userToggled, setUserToggled] = useState<ReadonlySet<number>>(() => new Set())
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      if (!id.startsWith('dayun-')) return
      setUserToggled((prev) => {
        if (state.kind !== 'data') return prev
        const di = Number(id.slice('dayun-'.length))
        const arrIdx = state.payload.dayun.findIndex((d) => d.index === di)
        if (arrIdx < 0) return prev
        const next = new Set(prev)
        if (next.has(arrIdx)) next.delete(arrIdx)
        else next.add(arrIdx)
        return next
      })
    },
    [state]
  )
  // Default-expanded set — current 大运 + any future 大运 whose decade starts
  // within ~10y. The user's `userToggled` XORs this for the final visible set.
  const expandedDayun = useMemo<ReadonlySet<number>>(() => {
    if (state.kind !== 'data') return new Set()
    const cur = state.payload.currentDayunIndex
    const thisYear = new Date().getFullYear()
    const tenYearsOut = thisYear + 10
    const defaultSet = new Set<number>()
    if (cur >= 0) defaultSet.add(cur)
    state.payload.dayun.forEach((d, i) => {
      if (i === cur) return
      // "Within 10 years" = the decade starts before now+10y AND ends after now,
      // i.e. it overlaps the [now, now+10y] window the user can actually plan for.
      if (d.startYear <= tenYearsOut && d.endYear >= thisYear) defaultSet.add(i)
    })
    // XOR userToggled with defaults — tapping a default-open decade collapses it,
    // tapping a default-closed one expands it.
    const final = new Set<number>(defaultSet)
    userToggled.forEach((i) => {
      if (final.has(i)) final.delete(i)
      else final.add(i)
    })
    return final
  }, [state, userToggled])
  // Image share: capture the real graph (not a server reconstruction) to a PNG.
  // Pre-warm once data lands — the Skia graph is the slow part of the capture, so
  // baking it ahead of the tap makes Share feel instant.
  const {
    shotRef,
    capturing,
    share: shareImage,
  } = useImageShare({
    prewarm: state.kind === 'data',
    warmKey: state.kind === 'data' ? 'ready' : 'pending',
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

        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
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
            onSelect={handleSelect}
            expandedDayun={expandedDayun}
            onLockedTap={() => setPaywallOpen(true)}
            colors={colors}
            spacing={spacing}
            canvasWidth={canvasWidth}
            t={t}
          />
        )}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* Off-screen capture target — mounted only while capturing, then unmounted.
          Renders the real TimelineGraph on a fixed ivory palette so the PNG is
          brand-consistent regardless of the user's theme. */}
      {capturing && state.kind === 'data'
        ? (() => {
            const snap = buildTimelineSnapshot(state.payload, t)
            const chrome = timelineShareChrome(locale)
            const shensha = birthShenSha(state.payload)
            const favEl = chartFavorableElement(state.payload)
            // WYSIWYG: bake the node the user actually has selected (its highlight +
            // reading), falling back to the current 大运 so a fresh share still has a
            // takeaway. What they see on screen = what they share.
            const shareDetail =
              resolveNodeDetail(state.payload, selectedId, t, favEl) ??
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
                  <TimelineGraph
                    payload={state.payload}
                    isPro={isPro}
                    selectedId={selectedId}
                    onSelect={() => {}}
                    onLockedTap={() => {}}
                    colors={SHARE_PALETTE}
                    width={screenWidth - 48}
                    detail={null}
                    fitLabels={t.personal.fit}
                    reasonLabels={t.yinzheng.signals}
                    shensha={shensha}
                    domainLabels={t.timelineDomain}
                    expandedDayunIndices={expandedDayun}
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
  onSelect,
  expandedDayun,
  onLockedTap,
  colors,
  spacing,
  canvasWidth,
  t,
}: {
  payload: TimelinePayload
  isPro: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  expandedDayun: ReadonlySet<number>
  onLockedTap: () => void
  colors: BodyColors
  spacing: BodySpacing
  canvasWidth: number
  t: ReturnType<typeof useStrings>['t']
}) {
  const favEl = useMemo(() => chartFavorableElement(payload), [payload])
  // Resolve the selected node → a 对你而言 verdict + advice line (no card chrome).
  const detail = useMemo(
    () => resolveNodeDetail(payload, selectedId, t, favEl),
    [selectedId, payload, t, favEl]
  )
  const shensha = useMemo(() => birthShenSha(payload), [payload])

  // 印证 — the subject's 本命支 (year branch) drives the 桃花/驿马 retrodiction check.
  const birthBranch = useMemo<EarthlyBranch | null>(() => {
    const [y, m, d] = payload.birth.date.split('-').map(Number)
    if (!y || !m || !d) return null
    const hour = payload.birth.hour < 0 ? 12 : payload.birth.hour
    return getFourPillars({ year: y, month: m, day: d, hour }).year.branch
  }, [payload.birth])

  // The selected node, when it's a PAST 流年 — the only place 印证 applies.
  const pinnableRow = useMemo(() => {
    if (!selectedId?.startsWith('liunian-')) return null
    const year = Number(selectedId.slice('liunian-'.length))
    const row = payload.liunian.find((r) => r.year === year)
    return row && row.year < new Date().getFullYear() ? row : null
  }, [selectedId, payload.liunian])

  // 择吉 link — the selected node is a FUTURE 流年, so we can offer a deep-link
  // into /event with a 92-day window inside that year. Picking 立春-aligned
  // Feb 1 → May 1 keeps it within the server's 92-day cap and lands inside the
  // 流年's "current year" by 命理 reckoning. Pro can pick any sub-window.
  const futureLiunianYear = useMemo<number | null>(() => {
    if (!selectedId?.startsWith('liunian-')) return null
    const year = Number(selectedId.slice('liunian-'.length))
    if (!Number.isFinite(year) || year <= new Date().getFullYear()) return null
    const inPayload =
      payload.dayun.flatMap((d) => d.liunian).some((r) => r.year === year) ||
      payload.liunian.some((r) => r.year === year)
    return inPayload ? year : null
  }, [selectedId, payload])

  return (
    <View style={{ gap: spacing.xl }}>
      {!isPro ? (
        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
          {t.timelineFreePreviewNote}
        </Text>
      ) : null}

      {/* The life as a git graph — the selected-node reading now pops up anchored
          TO the tapped node (long graphs scrolled the old top panel out of view). */}
      <TimelineGraph
        payload={payload}
        isPro={isPro}
        selectedId={selectedId}
        onSelect={onSelect}
        onLockedTap={onLockedTap}
        colors={colors}
        width={canvasWidth}
        detail={selectedId?.startsWith('liuyue-') ? null : detail}
        fitLabels={t.personal.fit}
        reasonLabels={t.yinzheng.signals}
        shensha={shensha}
        domainLabels={t.timelineDomain}
        expandedDayunIndices={expandedDayun}
      />

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
          with that year's window (Feb 1 → May 1, 立春-aligned, within the server's
          92-day cap). Available to all tiers; the /event screen still gates the
          window expansion for Free. The deterministic 命理 engine meets actionable
          date-picking. */}
      {futureLiunianYear ? (
        <ZejiLink year={futureLiunianYear} t={t} colors={colors} spacing={spacing} />
      ) : null}

      {/* 流月 — the finest commits; each is tappable for its own reading. */}
      {payload.liuyue.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <LiuyueStrip
            liuyue={payload.liuyue}
            isPro={isPro}
            colors={colors}
            label={t.timelineLiuyue}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          {selectedId?.startsWith('liuyue-') && detail ? (
            <ReadingBubble
              heading={detail.heading}
              body={detail.body}
              fit={detail.fit}
              colors={colors}
            />
          ) : null}
          {/* Only this year's 流月 is shown by design — full data isn't dumped;
              key-moment reminders are opt-in push (DAU lever). */}
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
            {t.timelineLiuyueNote}
          </Text>
        </View>
      ) : null}

      {/* make-if 假如 now lives on its own /makeif screen (entered from the Today
          banner) — keeps this page short. */}

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
