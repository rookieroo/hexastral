/**
 * DailyCard — the home 黄历 hero (`full`) + the watch/widget tiers, from one
 * shared model. The watch face has configurable TEMPLATES (2026-06):
 *
 *   - `modern`  — minimal, any locale: time · date · 月相 · 干支 意象. (Free)
 *   - `almanac` — CN 黄历: time + 时辰, date + 干支日, 农历, 值神·二十八宿·冲, 宜忌. (Pro)
 *   - `ancient` — 古风 黄历, 繁體-only: 時辰 as the time, 干支紀日, 農曆 + 干支年, 節氣,
 *                 黃曆 宜忌, 古铜 ink frame. An "ancient almanac on a wrist". (Pro)
 *
 * 月相 (clean Skia, 阴历-driven, skin-configurable) is the ambient hero. Detail is
 * on-demand: TAP cross-fades the lower slot — at rest the 对你而言 verdict (or 节气);
 * tapped, 宜 / 忌 on two short lines (no ellipsis, fits en). NO 吉凶 "score" dots
 * on the face (energy-rating read = review + psych risk). Time is HH:MM (no
 * seconds) by design so 时辰 has room. `phaseOverride` = DEV moon-phase mock.
 */

import { useTheme } from '@zhop/core-ui'
import * as Haptics from 'expo-haptics'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import type { AuspiceDay, AuspicePersonalization, PersonalFit } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { ELEMENT_COLORS } from '@/lib/shichen-content'
import type { MoonSkinId, WatchTemplate } from '@/lib/widget-config'
import { dailyWidgetTip } from '@/lib/culture/daily-widget-tips'
import { localizeYijiVerb } from '@/lib/yiji-vocab'
import { PhaseLogo } from './PhaseLogo'

type Strings = ReturnType<typeof useStrings>['t']

export type DailyCardTier = 'glance' | 'compact' | 'full'

export interface DailyCardModel {
  date: string
  ganZhi: string
  /** `${值神label} · ${officer}` — already localized (home card). */
  officerLabel: string
  /** 值神 (建除十二神) char, e.g. "建". */
  officer: string
  /** 二十八宿, e.g. "角木蛟". */
  mansion: string
  /** The day's 冲 生肖 (always present), e.g. "鼠". */
  clashShengxiao: string
  /** 0-5 吉凶 rating (home card only). */
  rating: number
  yearChip: string | null
  /** 干支纪年 only, e.g. "丙午年", or null. */
  ganzhiYear: string | null
  benming: boolean
  /** `${农历label} ${monthName}${dayName}`, or null (home card). */
  lunarLabel: string | null
  /** Bare 农历 month+day, e.g. "六月十五" (繁简-neutral). */
  lunarMonthDay: string
  lunarStrong: boolean
  solarTermLabel: string
  /** Bare 节气 name, e.g. "立秋". */
  solarTermName: string
  /** Raw 宜 verbs (CJK source) — faces localize per their own locale. */
  goodForRaw: string[]
  /** Raw 忌 verbs. */
  avoidRaw: string[]
  /** 月相 phase 0-1, from the 农历 day. */
  moonPhase: number
  /** 干支日 stem → 五行 element colour — the 意象 for 干支. */
  dayElementColor: string
  clashAnimal: string | null
  fit: PersonalFit | null
  fitLabel: string | null
  /** One-line For you summary when `fit` is set. */
  fitSummary: string | null
  /** Preset daily tip for large widget when For you is unavailable. */
  dayTip: string
}

const BRANCH_TO_ANIMAL: Record<string, string> = {
  子: '鼠',
  丑: '牛',
  寅: '虎',
  卯: '兔',
  辰: '龙',
  巳: '蛇',
  午: '马',
  未: '羊',
  申: '猴',
  酉: '鸡',
  戌: '狗',
  亥: '猪',
}

// Canonical 五行 palette lives in shichen-content.ts (ELEMENT_COLORS) — same
// values feed the 时辰 wheel, glossary grid, calendar dots, and timeline rows.
// 天干 → 五行 → color so 干支日 ink matches everywhere.
const STEM_ELEMENT_COLOR: Record<string, string> = {
  甲: ELEMENT_COLORS['木'],
  乙: ELEMENT_COLORS['木'],
  丙: ELEMENT_COLORS['火'],
  丁: ELEMENT_COLORS['火'],
  戊: ELEMENT_COLORS['土'],
  己: ELEMENT_COLORS['土'],
  庚: ELEMENT_COLORS['金'],
  辛: ELEMENT_COLORS['金'],
  壬: ELEMENT_COLORS['水'],
  癸: ELEMENT_COLORS['水'],
}

/** 天干 → 五行 (English), for the en 干支纪年 ("Fire Horse"). */
const ELEMENT_EN: Record<string, string> = {
  甲: 'Wood',
  乙: 'Wood',
  丙: 'Fire',
  丁: 'Fire',
  戊: 'Earth',
  己: 'Earth',
  庚: 'Metal',
  辛: 'Metal',
  壬: 'Water',
  癸: 'Water',
}
/** 地支 → 生肖 (English). */
const ANIMAL_EN: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
}

const WEEKDAYS: Record<Locale, readonly string[]> = {
  'zh-Hans': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  'zh-Hant': ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

const SHICHEN_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 古铜 ink accent for the ancient template. */
const COPPER = 'rgba(196,168,130,0.8)'
const COPPER_DIM = 'rgba(196,168,130,0.5)'
const MOON_CREAM = '#E7E0D0'

export function formatWatchDate(isoDate: string, locale: Locale): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  const wd = WEEKDAYS[locale]?.[d.getDay()] ?? ''
  const day = d.getDate()
  const month = d.getMonth() + 1
  // Widget/watch: keep dates numeric — never "Chinese calendar" / long English months.
  if (locale === 'en') return `${wd} ${month}/${day}`
  if (locale === 'ja') return `${month}月${day}日（${wd}）`
  return `${month}月${day}日 ${wd}`
}

/** Join 宜/忌 verbs for widget/watch — always source CJK (never long English glosses). */
export function compactVerbs(raw: string[], n: number): string {
  if (!raw.length) return '—'
  return raw.slice(0, n).join('·')
}

/** Chrome labels for widget + watch faces — short glyphs, no long English. */
export function compactChrome(locale: Locale): {
  yi: string
  ji: string
  forYou: string
  tip: string
} {
  if (locale === 'ja') {
    return { yi: '宜', ji: '忌', forYou: 'あなたへ', tip: '一言' }
  }
  if (locale === 'zh-Hant') {
    return { yi: '宜', ji: '忌', forYou: '對你', tip: '日籤' }
  }
  // en + zh-Hans: keep 宜忌 / 对你 — widgets have no room for "Good for" / "For you".
  return { yi: '宜', ji: '忌', forYou: '对你', tip: '日签' }
}

/** Current HH:MM (live; HH:MM only — no seconds, so 时辰 has room). */
function currentClock(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Current wall-clock 时辰 (子时 spans 23:00); `hant` → 時. */
function currentShichen(hant: boolean): string {
  const h = new Date().getHours()
  const idx = h === 23 ? 0 : Math.floor((h + 1) / 2)
  return `${SHICHEN_BRANCHES[idx] ?? '子'}${hant ? '時' : '时'}`
}

/** Localize the top-`n` 宜/忌 verbs and join. Shared with WidgetCard. */
export function topVerbs(raw: string[], locale: Locale, n: number): string {
  if (!raw.length) return '—'
  return raw
    .slice(0, n)
    .map((v) => localizeYijiVerb(v, locale))
    .join('·')
}

export function moonPhaseFromLunarDay(day: number | undefined): number {
  // 农历日 → synodic fraction. 初一 ≈ 朔 (0), 十五 ≈ 望 (~0.47).
  // 29.53 ≈ mean synodic month; clamp below 1 so day 30 doesn't wrap to new.
  if (!day || day < 1) return 0
  return Math.max(0, Math.min(0.999, (day - 1) / 29.53))
}

function fitColorOnDark(fit: PersonalFit | null): string {
  // Dark-bg context — use 400-level (lighter) green/red so they pop against
  // black, matching the dark-mode 吉/凶 tokens in hexastral-tokens/palette.ts.
  return fit === '吉' ? '#4ADE80' : fit === '凶' ? '#F87171' : 'rgba(255,255,255,0.75)'
}

function resolveClashAnimal(clash: AuspiceDay['clash']): string {
  if (clash.clashAnimal) return clash.clashAnimal
  const legacy = (clash as unknown as { zodiac?: string }).zodiac
  if (legacy) return legacy
  return BRANCH_TO_ANIMAL[clash.branch] ?? clash.branch
}

export function buildDailyCardModel(
  date: string,
  day: AuspiceDay,
  personalization: AuspicePersonalization | null | undefined,
  t: Strings,
  locale: Locale
): DailyCardModel {
  const fit = personalization?.fit ?? null
  const en = locale === 'en'
  const yg = day.yearGanZhi
  const ld = day.lunarDate
  return {
    date,
    ganZhi: day.ganZhi,
    officerLabel: `${t.dayOfficerLabel} · ${t.officers[day.dayOfficer]}`,
    // Always the 建除 glyph — widgets/watch must not show "Establish" / "Success".
    officer: day.dayOfficer,
    mansion: `${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}`,
    clashShengxiao: resolveClashAnimal(day.clash),
    rating: day.overallRating,
    // 干支纪年 reads as CJK for zh/ja; en gets the 五行+生肖 ("Fire Horse").
    yearChip: yg
      ? en
        ? `${ELEMENT_EN[yg.stem] ?? ''} ${ANIMAL_EN[yg.branch] ?? yg.animal}`.trim()
        : `${yg.stem}${yg.branch}年 · ${yg.animal}`
      : null,
    ganzhiYear: yg ? `${yg.stem}${yg.branch}年` : null,
    benming: personalization?.benming === true,
    // Never prefix with "Chinese calendar" / "Lunar" — month/day (or 六月十五) only.
    lunarLabel: ld
      ? en
        ? `${ld.month}/${ld.day}`
        : `${t.lunarLabel} ${ld.monthName}${ld.dayName}`
      : null,
    lunarMonthDay: ld
      ? en
        ? `${ld.month}/${ld.day}`
        : `${ld.monthName}${ld.dayName}`
      : '',
    lunarStrong: ld?.isFirst === true || ld?.isFifteenth === true,
    solarTermLabel: `${t.solarTerm} ${localizeSolarTermName(day.solarTerm.prev.name, locale)}`,
    // Widget/watch use CJK 节气 name (大暑) — en glosses like "Dashu (Greater Heat)" overflow.
    solarTermName: day.solarTerm.prev.name,
    goodForRaw: day.goodFor,
    avoidRaw: day.avoid,
    moonPhase: moonPhaseFromLunarDay(ld?.day),
    dayElementColor: STEM_ELEMENT_COLOR[day.ganZhi[0] ?? ''] ?? '#A0845C',
    clashAnimal: personalization?.personalClash ? resolveClashAnimal(day.clash) : null,
    fit,
    // Widget/watch: always the 吉/平/凶 glyph — never "Favorable" / "Caution".
    fitLabel: fit,
    // Skip long English summaries on compact surfaces (en → tip bank instead).
    fitSummary: fit && !en ? t.personal.summary[fit] : null,
    // en widgets: use zh-Hans tip bank (short CJK) — English tip sentences overflow.
    dayTip: dailyWidgetTip(date, en ? 'zh-Hans' : locale),
  }
}

export function DailyCard({
  date,
  day,
  personalization,
  tier = 'full',
  template = 'modern',
  phaseOverride,
}: {
  date: string
  day: AuspiceDay
  personalization?: AuspicePersonalization | null
  tier?: DailyCardTier
  /** @deprecated Ignored — PhaseLogo has no water-ink skins. */
  moonSkinId?: MoonSkinId
  /** Watch face template (compact tier). `almanac` / `ancient` are the Pro faces. */
  template?: WatchTemplate
  phaseOverride?: number
}) {
  const { t, locale } = useStrings()
  const model = useMemo(
    () => buildDailyCardModel(date, day, personalization, t, locale),
    [date, day, personalization, t, locale]
  )
  if (tier === 'glance') {
    return <GlanceTier model={model} phaseOverride={phaseOverride} />
  }
  if (tier === 'compact') {
    if (template === 'ancient') {
      return <AncientFace model={model} phaseOverride={phaseOverride} />
    }
    if (template === 'almanac') {
      return <AlmanacFace model={model} phaseOverride={phaseOverride} />
    }
    if (template === 'lunar') {
      return <LunarFace model={model} phaseOverride={phaseOverride} />
    }
    return <ModernFace model={model} phaseOverride={phaseOverride} />
  }
  return <FullTier model={model} />
}

// ── reveal helper ───────────────────────────────────────────────────────────

function useReveal() {
  const v = useSharedValue(0)
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - v.value }))
  const revealStyle = useAnimatedStyle(() => ({ opacity: v.value }))
  const toggle = () => {
    v.value = withTiming(v.value > 0.5 ? 0 : 1, { duration: 200 })
    Haptics.selectionAsync().catch(() => {})
  }
  return { restStyle, revealStyle, toggle }
}

type FaceProps = { model: DailyCardModel; phaseOverride?: number }

function useFaceChrome() {
  const { mode } = useTheme()
  const light = mode === 'light'
  return {
    bg: light ? '#F5F0E8' : '#0B0B0C',
    text: light ? '#09090B' : '#FAFAFA',
    dim: light ? '#71717A' : '#A1A1AA',
    faint: light ? '#A1A1AA' : '#71717A',
    separator: light ? 'rgba(9,9,11,0.08)' : 'rgba(250,250,250,0.08)',
    rule: light ? 'rgba(9,9,11,0.12)' : 'rgba(250,250,250,0.12)',
  }
}

function facePad(bg: string) {
  return {
    flex: 1 as const,
    backgroundColor: bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  }
}

// ── glance — complication ───────────────────────────────────────────────────

function GlanceTier({ model, phaseOverride }: FaceProps) {
  const c = useFaceChrome()
  return (
    <View style={{ ...facePad(c.bg), alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <PhaseLogo phase={phaseOverride ?? model.moonPhase} size={44} />
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '500', letterSpacing: 2 }}>
        {model.ganZhi}
      </Text>
    </View>
  )
}

// ── modern — time-first, any locale ─────────────────────────────────────────

function ModernFace({ model, phaseOverride }: FaceProps) {
  const { locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const c = useFaceChrome()
  const L = compactChrome(locale)
  const restText = model.fitLabel ? `${L.forYou} · ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : c.dim

  return (
    <Pressable onPress={toggle} accessibilityRole='button' style={facePad(c.bg)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text style={{ color: c.dim, fontSize: 11, letterSpacing: 0.5 }} numberOfLines={1}>
          {formatWatchDate(model.date, locale)}
        </Text>
        <PhaseLogo phase={phaseOverride ?? model.moonPhase} size={28} />
      </View>

      <Text style={{ color: c.text, fontSize: 44, fontWeight: '200', letterSpacing: 1 }}>
        {currentClock()}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '400', letterSpacing: 2 }}>
          {model.ganZhi}
        </Text>
        {model.lunarMonthDay ? (
          <Text style={{ color: c.faint, fontSize: 12 }} numberOfLines={1}>
            {model.lunarMonthDay}
          </Text>
        ) : null}
      </View>

      <View style={{ height: 0.5, backgroundColor: c.rule, marginBottom: 10 }} />

      <RevealSlot
        restStyle={restStyle}
        revealStyle={revealStyle}
        restText={restText || '—'}
        restColor={restColor}
        yiLine={`${L.yi} ${compactVerbs(model.goodForRaw, 2)}`}
        jiLine={`${L.ji} ${compactVerbs(model.avoidRaw, 2)}`}
        yiColor={c.text}
        jiColor={c.dim}
        marginTop={0}
      />
    </Pressable>
  )
}

// ── lunar — moon-hero ───────────────────────────────────────────────────────

function LunarFace({ model, phaseOverride }: FaceProps) {
  const { locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const c = useFaceChrome()
  const L = compactChrome(locale)
  const restText = model.fitLabel ? `${L.forYou} · ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : c.dim

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole='button'
      style={{ ...facePad(c.bg), alignItems: 'center' }}
    >
      <PhaseLogo phase={phaseOverride ?? model.moonPhase} size={64} />
      <Text
        style={{
          color: c.text,
          fontSize: 36,
          fontWeight: '200',
          letterSpacing: 1,
          marginTop: 12,
        }}
      >
        {currentClock()}
      </Text>
      <Text
        style={{ color: c.text, fontSize: 16, fontWeight: '400', letterSpacing: 3, marginTop: 6 }}
      >
        {model.ganZhi}
      </Text>
      <Text style={{ color: c.faint, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
        {model.lunarMonthDay || formatWatchDate(model.date, locale)}
      </Text>

      <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
        <View style={{ height: 0.5, backgroundColor: c.rule, marginBottom: 10 }} />
        <RevealSlot
          restStyle={restStyle}
          revealStyle={revealStyle}
          restText={restText || '—'}
          restColor={restColor}
          yiLine={`${L.yi} ${compactVerbs(model.goodForRaw, 2)}`}
          jiLine={`${L.ji} ${compactVerbs(model.avoidRaw, 2)}`}
          yiColor={c.text}
          jiColor={c.dim}
          marginTop={0}
        />
      </View>
    </Pressable>
  )
}

// ── almanac — structured 黄历 ───────────────────────────────────────────────

function AlmanacFace({ model, phaseOverride }: FaceProps) {
  const { locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const c = useFaceChrome()
  const L = compactChrome(locale)
  const restText = model.fitLabel ? `${L.forYou} · ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : c.dim
  const hant = locale === 'zh-Hant'

  return (
    <Pressable onPress={toggle} accessibilityRole='button' style={facePad(c.bg)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2, paddingRight: 8 }}>
          <Text style={{ color: c.dim, fontSize: 11 }} numberOfLines={1}>
            {formatWatchDate(model.date, locale)}
          </Text>
          {model.lunarMonthDay ? (
            <Text style={{ color: c.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
              {model.lunarMonthDay}
              {model.solarTermName ? ` · ${model.solarTermName}` : ''}
            </Text>
          ) : null}
        </View>
        <PhaseLogo phase={phaseOverride ?? model.moonPhase} size={30} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
        <Text style={{ color: c.text, fontSize: 36, fontWeight: '200', letterSpacing: 1 }}>
          {currentClock()}
        </Text>
        <Text style={{ color: c.dim, fontSize: 13, paddingBottom: 4 }}>
          {currentShichen(hant)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '400', letterSpacing: 2 }}>
          {model.ganZhi}
        </Text>
        <Text style={{ color: c.faint, fontSize: 12 }}>{`${model.officer}日`}</Text>
      </View>

      <Text style={{ color: c.faint, fontSize: 11, marginBottom: 10 }} numberOfLines={1}>
        {`${model.mansion} · 冲${model.clashShengxiao}`}
      </Text>

      <View style={{ height: 0.5, backgroundColor: c.rule, marginBottom: 10 }} />

      <RevealSlot
        restStyle={restStyle}
        revealStyle={revealStyle}
        restText={restText || '—'}
        restColor={restColor}
        yiLine={`${L.yi} ${compactVerbs(model.goodForRaw, 2)}`}
        jiLine={`${L.ji} ${compactVerbs(model.avoidRaw, 2)}`}
        yiColor={c.text}
        jiColor={c.dim}
        marginTop={0}
      />
    </Pressable>
  )
}

// ── ancient — 古风 (繁體 ink) ───────────────────────────────────────────────

function AncientFace({ model, phaseOverride }: FaceProps) {
  const { restStyle, revealStyle, toggle } = useReveal()
  const c = useFaceChrome()

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole='button'
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: COPPER, fontSize: 11, letterSpacing: 3 }} numberOfLines={1}>
          {model.solarTermName ? `節氣 · ${model.solarTermName}` : '黃曆'}
        </Text>
        <PhaseLogo phase={phaseOverride ?? model.moonPhase} size={26} />
      </View>

      <Text style={{ color: MOON_CREAM, fontSize: 32, fontWeight: '300', letterSpacing: 6 }}>
        {currentShichen(true)}
      </Text>
      <Text
        style={{
          color: 'rgba(231,224,208,0.45)',
          fontSize: 12,
          marginTop: 2,
          marginBottom: 10,
        }}
      >
        {currentClock()}
      </Text>

      <Text
        style={{
          color: model.dayElementColor,
          fontSize: 26,
          fontWeight: '400',
          letterSpacing: 6,
          marginBottom: 4,
        }}
      >
        {model.ganZhi}
      </Text>
      <Text style={{ color: COPPER_DIM, fontSize: 12, letterSpacing: 1 }} numberOfLines={1}>
        {model.lunarMonthDay}
        {model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}
      </Text>

      <View style={{ height: 0.5, backgroundColor: 'rgba(196,168,130,0.25)', marginVertical: 12 }} />

      <View style={{ height: 34 }}>
        <Animated.View style={[StyleSheet.absoluteFill, restStyle, { justifyContent: 'center' }]}>
          <Text style={{ color: COPPER_DIM, fontSize: 11, letterSpacing: 3 }}>輕觸 · 宜忌</Text>
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, revealStyle, { justifyContent: 'center', gap: 2 }]}
        >
          <Text style={{ color: 'rgba(231,224,208,0.9)', fontSize: 12 }} numberOfLines={1}>
            {`宜 ${topVerbs(model.goodForRaw, 'zh-Hant', 2)}`}
          </Text>
          <Text style={{ color: 'rgba(231,224,208,0.5)', fontSize: 12 }} numberOfLines={1}>
            {`忌 ${topVerbs(model.avoidRaw, 'zh-Hant', 2)}`}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}

// ── shared reveal slot (rest line ⇄ 宜/忌) ────────────────────────────────────

function RevealSlot({
  restStyle,
  revealStyle,
  restText,
  restColor,
  yiLine,
  jiLine,
  yiColor = 'rgba(255,255,255,0.85)',
  jiColor = 'rgba(255,255,255,0.55)',
  marginTop = 6,
}: {
  restStyle: { opacity: number }
  revealStyle: { opacity: number }
  restText: string
  restColor: string
  yiLine: string
  jiLine: string
  yiColor?: string
  jiColor?: string
  marginTop?: number
}) {
  return (
    <View style={{ height: 36, marginTop }}>
      <Animated.View style={[StyleSheet.absoluteFill, restStyle, { justifyContent: 'center' }]}>
        <Text style={{ color: restColor, fontSize: 12, letterSpacing: 0.5 }} numberOfLines={1}>
          {restText}
        </Text>
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, revealStyle, { justifyContent: 'center', gap: 2 }]}
      >
        <Text style={{ color: yiColor, fontSize: 12 }} numberOfLines={1}>
          {yiLine}
        </Text>
        <Text style={{ color: jiColor, fontSize: 12 }} numberOfLines={1}>
          {jiLine}
        </Text>
      </Animated.View>
    </View>
  )
}

// ── full — home 黄历 hero (月相-led, 干支 in 五行 ink; respects light/dark) ──────

function FullTier({ model }: { model: DailyCardModel }) {
  const { colors } = useTheme()
  const { t, locale } = useStrings()
  const lunar = model.lunarMonthDay || model.lunarLabel
  // No accent frame, no 吉凶 score dots (review + psych risk). Card surface
  // follows the system theme — paper in light, near-black in dark.
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingVertical: 18,
        gap: 14,
      }}
    >
      {/* date · 干支年 / 本命年 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text
          style={{ color: colors.secondary, fontSize: 13, letterSpacing: 1, flexShrink: 1 }}
          numberOfLines={1}
        >
          {formatWatchDate(model.date, locale)}
        </Text>
        {model.yearChip ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: model.benming ? colors.accent : colors.separator,
              backgroundColor: model.benming ? colors.accentGhost : 'transparent',
            }}
            accessibilityLabel={model.benming ? `${model.yearChip} · ${t.benming}` : model.yearChip}
          >
            <Text
              style={{
                color: model.benming ? colors.accent : colors.text,
                fontSize: 12,
                letterSpacing: 1,
                fontWeight: model.benming ? '600' : '500',
              }}
            >
              {model.yearChip}
            </Text>
            {model.benming ? (
              <Text
                style={{ color: colors.accent, fontSize: 10, letterSpacing: 1, fontWeight: '700' }}
              >
                {t.benming}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* 月相 + 干支日 (五行 意象) + 值神 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PhaseLogo phase={model.moonPhase} size={46} />
        <Text
          style={{
            color: model.dayElementColor,
            fontSize: 46,
            fontWeight: '300',
            letterSpacing: 2,
          }}
        >
          {model.ganZhi}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.secondary, fontSize: 14, textAlign: 'right' }}>
          {model.officerLabel}
        </Text>
      </View>

      {/* 农历 · 节气 · 二十八宿 */}
      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
        {lunar ? (
          <Text
            style={
              model.lunarStrong
                ? { color: colors.accent, fontWeight: '600' }
                : { color: colors.dim }
            }
          >
            {lunar}
            {' · '}
          </Text>
        ) : null}
        {model.solarTermLabel}
        {locale !== 'en' && model.mansion ? ` · ${model.mansion}` : ''}
      </Text>

      {model.clashAnimal ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityLabel={`${t.personalClashLabel} · ${model.clashAnimal}`}
        >
          <Text
            style={{
              color: ELEMENT_COLORS['火'],
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
            }}
          >
            {t.personalClashLabel}
          </Text>
          <Text style={{ color: colors.dim, fontSize: 12 }}>·</Text>
          <Text style={{ color: colors.secondary, fontSize: 12 }}>{model.clashAnimal}</Text>
        </View>
      ) : null}
    </View>
  )
}
