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
import { localizeYijiVerb } from '@/lib/yiji-vocab'
import { StaticMoon } from './StaticMoon'

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
const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

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
  if (locale === 'en') return `${wd}, ${EN_MONTHS[d.getMonth()]} ${day}`
  if (locale === 'ja') return `${d.getMonth() + 1}月${day}日（${wd}）`
  return `${d.getMonth() + 1}月${day}日 ${wd}`
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

function moonPhaseFromLunarDay(day: number | undefined): number {
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
    officer: t.officers[day.dayOfficer],
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
    lunarLabel: ld
      ? en
        ? `${t.lunarLabel} ${ld.month}/${ld.day}`
        : `${t.lunarLabel} ${ld.monthName}${ld.dayName}`
      : null,
    lunarMonthDay: ld
      ? en
        ? `${t.lunarLabel} ${ld.month}/${ld.day}`
        : `${ld.monthName}${ld.dayName}`
      : '',
    lunarStrong: ld?.isFirst === true || ld?.isFifteenth === true,
    solarTermLabel: `${t.solarTerm} ${localizeSolarTermName(day.solarTerm.prev.name, locale)}`,
    solarTermName: localizeSolarTermName(day.solarTerm.prev.name, locale),
    goodForRaw: day.goodFor,
    avoidRaw: day.avoid,
    moonPhase: moonPhaseFromLunarDay(ld?.day),
    dayElementColor: STEM_ELEMENT_COLOR[day.ganZhi[0] ?? ''] ?? '#A0845C',
    clashAnimal: personalization?.personalClash ? resolveClashAnimal(day.clash) : null,
    fit,
    fitLabel: fit ? t.personal.fit[fit] : null,
  }
}

export function DailyCard({
  date,
  day,
  personalization,
  tier = 'full',
  moonSkinId,
  template = 'modern',
  phaseOverride,
}: {
  date: string
  day: AuspiceDay
  personalization?: AuspicePersonalization | null
  tier?: DailyCardTier
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
    return <GlanceTier model={model} moonSkinId={moonSkinId} phaseOverride={phaseOverride} />
  }
  if (tier === 'compact') {
    if (template === 'ancient') {
      return <AncientFace model={model} moonSkinId={moonSkinId} phaseOverride={phaseOverride} />
    }
    if (template === 'almanac') {
      return <AlmanacFace model={model} moonSkinId={moonSkinId} phaseOverride={phaseOverride} />
    }
    if (template === 'lunar') {
      return <LunarFace model={model} moonSkinId={moonSkinId} phaseOverride={phaseOverride} />
    }
    return <ModernFace model={model} moonSkinId={moonSkinId} phaseOverride={phaseOverride} />
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

type FaceProps = { model: DailyCardModel; moonSkinId?: MoonSkinId; phaseOverride?: number }

const FACE_BASE = {
  flex: 1,
  backgroundColor: '#000',
  paddingHorizontal: 18,
  paddingVertical: 14,
  justifyContent: 'center',
} as const

// ── glance — complication ───────────────────────────────────────────────────

function GlanceTier({ model, moonSkinId, phaseOverride }: FaceProps) {
  return (
    <View style={{ ...FACE_BASE, alignItems: 'center', gap: 4 }}>
      <StaticMoon phase={phaseOverride ?? model.moonPhase} size={42} skinId={moonSkinId} />
      <Text
        style={{ color: model.dayElementColor, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}
      >
        {model.ganZhi}
      </Text>
    </View>
  )
}

// ── modern — minimal, any locale ────────────────────────────────────────────

function ModernFace({ model, moonSkinId, phaseOverride }: FaceProps) {
  const { t, locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const restText = model.fitLabel ? `${t.personal.forYou} ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : 'rgba(255,255,255,0.4)'

  return (
    <Pressable onPress={toggle} accessibilityRole='button' style={FACE_BASE}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <StaticMoon phase={phaseOverride ?? model.moonPhase} size={30} skinId={moonSkinId} />
        <Text
          style={{
            color: model.dayElementColor,
            fontSize: 15,
            fontWeight: '500',
            letterSpacing: 1,
          }}
        >
          {model.ganZhi}
        </Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 42, fontWeight: '200', letterSpacing: 1 }}>
        {currentClock()}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }} numberOfLines={1}>
        {formatWatchDate(model.date, locale)}
      </Text>
      <RevealSlot
        restStyle={restStyle}
        revealStyle={revealStyle}
        restText={restText}
        restColor={restColor}
        yiLine={`${t.suitable} ${topVerbs(model.goodForRaw, locale, 1)}`}
        jiLine={`${t.avoid} ${topVerbs(model.avoidRaw, locale, 1)}`}
      />
    </Pressable>
  )
}

// ── lunar — moon-hero, minimal (Free) ───────────────────────────────────────

function LunarFace({ model, moonSkinId, phaseOverride }: FaceProps) {
  const { t, locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const restText = model.fitLabel ? `${t.personal.forYou} ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : 'rgba(255,255,255,0.4)'

  // Moon-hero, vertical: the moon sits on top, the time gets the FULL width below
  // it (the earlier side-by-side layout clipped the time — see 2026-06 feedback).
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole='button'
      style={{ ...FACE_BASE, alignItems: 'center' }}
    >
      <StaticMoon phase={phaseOverride ?? model.moonPhase} size={52} skinId={moonSkinId} />
      <Text
        style={{ color: '#fff', fontSize: 40, fontWeight: '200', letterSpacing: 1, marginTop: 4 }}
      >
        {currentClock()}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} numberOfLines={1}>
        {formatWatchDate(model.date, locale)}
      </Text>
      <Text
        style={{ color: model.dayElementColor, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}
      >
        {model.ganZhi}
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <RevealSlot
          restStyle={restStyle}
          revealStyle={revealStyle}
          restText={restText}
          restColor={restColor}
          yiLine={`${t.suitable} ${topVerbs(model.goodForRaw, locale, 1)}`}
          jiLine={`${t.avoid} ${topVerbs(model.avoidRaw, locale, 1)}`}
        />
      </View>
    </Pressable>
  )
}

// ── almanac — CN 黄历 (Pro) ──────────────────────────────────────────────────

function AlmanacFace({ model, moonSkinId, phaseOverride }: FaceProps) {
  const { t, locale } = useStrings()
  const { restStyle, revealStyle, toggle } = useReveal()
  const restText = model.fitLabel ? `${t.personal.forYou} ${model.fitLabel}` : model.solarTermName
  const restColor = model.fitLabel ? fitColorOnDark(model.fit) : 'rgba(255,255,255,0.4)'
  const hant = locale === 'zh-Hant'

  return (
    <Pressable onPress={toggle} accessibilityRole='button' style={FACE_BASE}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <StaticMoon phase={phaseOverride ?? model.moonPhase} size={28} skinId={moonSkinId} />
        {model.lunarLabel ? (
          <Text
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 1 }}
            numberOfLines={1}
          >
            {model.lunarLabel}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 38, fontWeight: '200', letterSpacing: 1 }}>
          {currentClock()}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, paddingBottom: 5 }}>
          {currentShichen(hant)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }} numberOfLines={1}>
          {formatWatchDate(model.date, locale)}
        </Text>
        <Text style={{ color: model.dayElementColor, fontSize: 14, fontWeight: '600' }}>
          {model.ganZhi}
        </Text>
      </View>
      <Text
        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.5, marginTop: 3 }}
        numberOfLines={1}
      >
        {`${model.officer} · ${model.mansion} · 冲${model.clashShengxiao}`}
      </Text>
      <RevealSlot
        restStyle={restStyle}
        revealStyle={revealStyle}
        restText={restText}
        restColor={restColor}
        yiLine={`${t.suitable} ${topVerbs(model.goodForRaw, locale, 2)}`}
        jiLine={`${t.avoid} ${topVerbs(model.avoidRaw, locale, 2)}`}
        marginTop={2}
      />
    </Pressable>
  )
}

// ── ancient — 古风 黄历, 繁體-only (Pro) ──────────────────────────────────────

function AncientFace({ model, moonSkinId, phaseOverride }: FaceProps) {
  const { restStyle, revealStyle, toggle } = useReveal()

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole='button'
      // No inner border — the parent watch-preview wrapper clips with a
      // ~42pt borderRadius + overflow:hidden, so a rectangular inner border
      // gets sliced into 4 disconnected edge segments. The dark canvas +
      // copper text alone carry the 古风 aesthetic.
      style={{
        flex: 1,
        backgroundColor: '#0A0908',
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
      }}
    >
      {/* 節氣 + 月相 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ color: COPPER, fontSize: 12, letterSpacing: 3 }}>
          {`節氣 ${model.solarTermName}`}
        </Text>
        <StaticMoon phase={phaseOverride ?? model.moonPhase} size={26} skinId={moonSkinId} />
      </View>
      {/* 時辰 (the ancient time) + small modern clock */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Text style={{ color: MOON_CREAM, fontSize: 34, fontWeight: '400', letterSpacing: 4 }}>
          {currentShichen(true)}
        </Text>
        <Text style={{ color: 'rgba(231,224,208,0.5)', fontSize: 14, paddingBottom: 5 }}>
          {currentClock()}
        </Text>
      </View>
      {/* 干支紀日 + 農曆 + 干支年 */}
      <Text
        style={{ color: model.dayElementColor, fontSize: 22, fontWeight: '500', letterSpacing: 4 }}
      >
        {model.ganZhi}
      </Text>
      <Text style={{ color: COPPER_DIM, fontSize: 12, letterSpacing: 1 }} numberOfLines={1}>
        {`農曆 ${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`}
      </Text>
      {/* 黃曆 宜忌 (繁體) */}
      <View style={{ height: 34, marginTop: 4 }}>
        <Animated.View style={[StyleSheet.absoluteFill, restStyle, { justifyContent: 'center' }]}>
          <Text style={{ color: COPPER_DIM, fontSize: 12, letterSpacing: 4 }}>黃曆 · 輕觸</Text>
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, revealStyle, { justifyContent: 'center', gap: 1 }]}
        >
          <Text style={{ color: 'rgba(231,224,208,0.85)', fontSize: 12 }} numberOfLines={1}>
            {`宜 ${topVerbs(model.goodForRaw, 'zh-Hant', 2)}`}
          </Text>
          <Text style={{ color: 'rgba(231,224,208,0.55)', fontSize: 12 }} numberOfLines={1}>
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
  marginTop = 6,
}: {
  restStyle: { opacity: number }
  revealStyle: { opacity: number }
  restText: string
  restColor: string
  yiLine: string
  jiLine: string
  marginTop?: number
}) {
  return (
    <View style={{ height: 34, marginTop }}>
      <Animated.View style={[StyleSheet.absoluteFill, restStyle, { justifyContent: 'center' }]}>
        <Text style={{ color: restColor, fontSize: 12, letterSpacing: 1 }} numberOfLines={1}>
          {restText}
        </Text>
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, revealStyle, { justifyContent: 'center', gap: 1 }]}
      >
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }} numberOfLines={1}>
          {yiLine}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }} numberOfLines={1}>
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
        <StaticMoon phase={model.moonPhase} size={46} />
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
