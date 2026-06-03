/**
 * fate-app i18n — live, in-app locale switching across 简/繁/日/EN.
 *
 * Design:
 *   • Messages live in `messages/{locale}.json` (one file per AppLocale) so
 *     translators can edit JSON without touching code. `StringKey` is derived
 *     from `messages/en.json` (the canonical locale) — a key missing in any
 *     other locale is a runtime undefined, not a compile error. Run
 *     `scripts/check-locale-coverage.ts` (or similar) before release.
 *   • {var} interpolation via t(key, vars).
 *   • Data-atom helpers (element / strength / gender / shichen / day-master /
 *     palace / star archetype) localise the BaZi+Ziwei values we DO translate.
 *     We deliberately keep 干支 / 格局 / 纳音 / 大运 prose as canonical CJK —
 *     astro-core has no i18n and iztro's en-US output is low quality, so
 *     transliterating them piecemeal would read worse than the source. The one
 *     exception is 紫微 star names: unreadable in Latin script, so for `en` we
 *     swap them for established archetype words (see starArchetypeLabel).
 *
 * NOTE (ja): Japanese strings are first-pass and flagged for human review
 * before any ja launch — see docs/local-manual-checklist.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GeJuAnalysis, HeavenlyStem, WuXing } from '@zhop/astro-core'
import { saveUserPreferences } from '@zhop/satellite-runtime'
import { getLocales } from 'expo-localization'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type AppLocale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

export const ALL_LOCALES: AppLocale[] = ['zh-Hans', 'zh-Hant', 'ja', 'en']

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  en: 'English',
}

const LOCALE_KEY = 'fate.locale'

export function resolveSystemLocale(): AppLocale {
  const tag = getLocales()[0]?.languageTag ?? 'en'
  if (tag.startsWith('zh-Hant') || tag.startsWith('zh-TW') || tag.startsWith('zh-HK'))
    return 'zh-Hant'
  if (tag.startsWith('zh')) return 'zh-Hans'
  if (tag.startsWith('ja')) return 'ja'
  return 'en'
}

/* ──────────────────────────────────────────────────────────────────────────
 * UI strings — source of truth is messages/*.json so translators can edit
 * without touching code. `StringKey` is derived from the en bundle so any
 * key drift across locales is a compile error.
 * Metaphysics proper nouns (干支/格局/星曜) are NOT here — they stay canonical
 * via the data-atom maps further down.
 * ────────────────────────────────────────────────────────────────────────── */

import messagesEn from '@/messages/en.json'
import messagesJa from '@/messages/ja.json'
import messagesZhHans from '@/messages/zh-Hans.json'
import messagesZhHant from '@/messages/zh-Hant.json'

const MESSAGES = {
  en: messagesEn,
  ja: messagesJa,
  'zh-Hans': messagesZhHans,
  'zh-Hant': messagesZhHant,
} as const satisfies Record<AppLocale, Record<string, string>>

export type StringKey = keyof typeof messagesEn

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/* ──────────────────────────────────────────────────────────────────────────
 * Data-atom maps — the BaZi/Ziwei values we DO localise.
 * ────────────────────────────────────────────────────────────────────────── */

const ELEMENT_EN: Record<WuXing, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}

const STRENGTH: Record<GeJuAnalysis['dayMasterStrength'], Record<AppLocale, string>> = {
  极强: { 'zh-Hans': '极强', 'zh-Hant': '極強', ja: '極強', en: 'Very Strong' },
  偏强: { 'zh-Hans': '偏强', 'zh-Hant': '偏強', ja: 'やや強', en: 'Strong' },
  中和: { 'zh-Hans': '中和', 'zh-Hant': '中和', ja: '中和', en: 'Balanced' },
  偏弱: { 'zh-Hans': '偏弱', 'zh-Hant': '偏弱', ja: 'やや弱', en: 'Weak' },
  极弱: { 'zh-Hans': '极弱', 'zh-Hant': '極弱', ja: '極弱', en: 'Very Weak' },
}

const GENDER: Record<'男' | '女', Record<AppLocale, string>> = {
  男: { 'zh-Hans': '男', 'zh-Hant': '男', ja: '男性', en: 'Male' },
  女: { 'zh-Hans': '女', 'zh-Hant': '女', ja: '女性', en: 'Female' },
}

export function elementLabel(e: WuXing, locale: AppLocale): string {
  return locale === 'en' ? ELEMENT_EN[e] : e
}

export function strengthLabel(s: GeJuAnalysis['dayMasterStrength'], locale: AppLocale): string {
  return STRENGTH[s][locale]
}

export function genderLabel(g: '男' | '女', locale: AppLocale): string {
  return GENDER[g][locale]
}

/** Day master as a unit: zh keeps "甲木"; en parenthesises "甲 (Wood)". */
export function dayMasterLabel(stem: HeavenlyStem, element: WuXing, locale: AppLocale): string {
  return locale === 'en' ? `${stem} (${ELEMENT_EN[element]})` : `${stem}${element}`
}

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 时辰 index → localised "子时" / "子時" / "子 hour". The branch char stays canonical. */
export function shichenLabel(timeIndex: number, locale: AppLocale): string {
  const branch = SHICHEN[((timeIndex % 12) + 12) % 12] ?? '子'
  if (locale === 'en') return `${branch} hour`
  if (locale === 'zh-Hans') return `${branch}时`
  return `${branch}時`
}

/**
 * 紫微 palace names. Keyed by iztro's zh-CN output (note: only 命宫 carries the
 * 宫 suffix; the rest are bare). palaceLabel falls back to the raw name so an
 * unmapped or variant palace (e.g. 交友 vs 仆役) still renders.
 */
const PALACE: Record<string, Record<AppLocale, string>> = {
  命宫: { 'zh-Hans': '命宫', 'zh-Hant': '命宮', ja: '命宮', en: 'Soul' },
  兄弟: { 'zh-Hans': '兄弟', 'zh-Hant': '兄弟', ja: '兄弟', en: 'Siblings' },
  夫妻: { 'zh-Hans': '夫妻', 'zh-Hant': '夫妻', ja: '夫妻', en: 'Spouse' },
  子女: { 'zh-Hans': '子女', 'zh-Hant': '子女', ja: '子女', en: 'Children' },
  财帛: { 'zh-Hans': '财帛', 'zh-Hant': '財帛', ja: '財帛', en: 'Wealth' },
  疾厄: { 'zh-Hans': '疾厄', 'zh-Hant': '疾厄', ja: '疾厄', en: 'Health' },
  迁移: { 'zh-Hans': '迁移', 'zh-Hant': '遷移', ja: '遷移', en: 'Travel' },
  仆役: { 'zh-Hans': '仆役', 'zh-Hant': '僕役', ja: '奴僕', en: 'Friends' },
  官禄: { 'zh-Hans': '官禄', 'zh-Hant': '官祿', ja: '官禄', en: 'Career' },
  田宅: { 'zh-Hans': '田宅', 'zh-Hant': '田宅', ja: '田宅', en: 'Property' },
  福德: { 'zh-Hans': '福德', 'zh-Hant': '福德', ja: '福徳', en: 'Wellbeing' },
  父母: { 'zh-Hans': '父母', 'zh-Hant': '父母', ja: '父母', en: 'Parents' },
}

export function palaceLabel(name: string, locale: AppLocale): string {
  return PALACE[name]?.[locale] ?? name
}

/**
 * 紫微 major-star archetypes. The 14 主星 names are unreadable in Latin script,
 * so for `en` we substitute a one-word personality archetype (the standard
 * 紫微斗数 reading). zh-Hans/zh-Hant/ja keep the canonical name — Japanese
 * 紫微斗数 uses the identical kanji, so only the Latin locale needs the swap.
 */
const STAR_ARCHETYPE_EN: Record<string, string> = {
  紫微: 'Sovereign',
  天机: 'Strategist',
  太阳: 'Radiant',
  武曲: 'General',
  天同: 'Harmonizer',
  廉贞: 'Maverick',
  天府: 'Steward',
  太阴: 'Nurturer',
  贪狼: 'Seeker',
  巨门: 'Orator',
  天相: 'Diplomat',
  天梁: 'Guardian',
  七杀: 'Warrior',
  破军: 'Pioneer',
}

/** 五行局 (e.g. 水二局) → compact English label. */
const FIVE_EL_CLASS_EN: Record<string, string> = {
  水二局: 'Water · II',
  木三局: 'Wood · III',
  金四局: 'Metal · IV',
  土五局: 'Earth · V',
  火六局: 'Fire · VI',
}

/**
 * Whether 紫微 surfaces should swap canonical star names for translated
 * archetypes. English only — the other three locales read the CJK names.
 */
export function usesStarArchetype(locale: AppLocale): boolean {
  return locale === 'en'
}

/** Major-star name → archetype (en) or canonical name (zh/ja). */
export function starArchetypeLabel(name: string, locale: AppLocale): string {
  return locale === 'en' ? (STAR_ARCHETYPE_EN[name] ?? name) : name
}

/** 五行局 → compact English label (en) or canonical CJK (zh/ja). */
export function fiveElementsClassLabel(cls: string, locale: AppLocale): string {
  return locale === 'en' ? (FIVE_EL_CLASS_EN[cls] ?? cls) : cls
}

/* ──────────────────────────────────────────────────────────────────────────
 * Context
 * ────────────────────────────────────────────────────────────────────────── */

interface I18nValue {
  locale: AppLocale
  setLocale: (next: AppLocale) => void
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveSystemLocale)

  // Mount: resolve final locale (AsyncStorage > system default) AND push it to
  // the server so the public web profile (`/u/[username]`) mirrors it. Without
  // this push, the initial system-detected locale never reaches the server —
  // it only fires through `setLocale` on an explicit in-app switch.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null)
      if (cancelled) return
      let active: AppLocale = resolveSystemLocale()
      if (stored && (ALL_LOCALES as string[]).includes(stored)) {
        active = stored as AppLocale
        setLocaleState(active)
      }
      void saveUserPreferences({ locale: active })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    void AsyncStorage.setItem(LOCALE_KEY, next).catch(() => {})
    // Best-effort server sync so the public web profile (`/u/[username]`)
    // mirrors the user's current language. No-ops when unsigned-in or
    // device secret is missing — AsyncStorage is the local source of truth.
    void saveUserPreferences({ locale: next })
  }, [])

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) =>
      interpolate(MESSAGES[locale][key] as string, vars),
    [locale]
  )

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
