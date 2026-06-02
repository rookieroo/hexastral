/**
 * Shared funnel constants + locale-aware default labels for the satellite →
 * flagship CTA.
 *
 * Schemes match each flagship's `app.config.cjs` / `app.json` `scheme` field:
 *   hexastral://onboard?from=<satellite>&signal=<questionType>&ddl=<token>
 *   yuan://onboard?from=...
 *   feng://onboard?from=...
 *
 * App Store IDs below are placeholders — replace after the flagships are
 * submitted (see docs/setup/satellite-funnel-wiring.md §2).
 */

import type { FlagshipKey, QuestionType } from '@zhop/portfolio-client'
import type { SatelliteFlagshipUpsellLabels } from './SatelliteFlagshipUpsellCard'
import type { SatelliteQuestionTypePickerLabels } from './SatelliteQuestionTypePicker'

const FLAGSHIP_SCHEME: Record<FlagshipKey, string> = {
  hexastral: 'hexastral',
  kindred: 'kindred',
  feng: 'feng',
  auspice: 'auspice',
}

const FLAGSHIP_APP_STORE_ID: Record<FlagshipKey, string> = {
  hexastral: 'id0000000001',
  kindred: 'id0000000002',
  feng: 'id0000000003',
  auspice: 'id0000000004',
}

export interface BuildFlagshipDeepLinkArgs {
  flagship: FlagshipKey
  fromSlug: string
  signal?: QuestionType | null
  ddlToken?: string | null
}

export function buildFlagshipDeepLink(args: BuildFlagshipDeepLinkArgs): string {
  const params = new URLSearchParams({ from: args.fromSlug })
  if (args.signal) params.set('signal', args.signal)
  if (args.ddlToken) params.set('ddl', args.ddlToken)
  return `${FLAGSHIP_SCHEME[args.flagship]}://onboard?${params.toString()}`
}

export function flagshipAppStoreUrl(flagship: FlagshipKey): string {
  return `https://apps.apple.com/app/${FLAGSHIP_APP_STORE_ID[flagship]}`
}

type FunnelLocale = 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'es' | 'vi' | 'th'

const SUPPORTED_LOCALES: ReadonlySet<FunnelLocale> = new Set<FunnelLocale>([
  'en',
  'zh',
  'zh-Hant',
  'ja',
  'ko',
  'de',
  'es',
  'vi',
  'th',
])

function pickLocale(raw: string | null | undefined): FunnelLocale {
  if (!raw) return 'en'
  if (SUPPORTED_LOCALES.has(raw as FunnelLocale)) return raw as FunnelLocale
  const base = raw.split('-')[0]
  if (base && SUPPORTED_LOCALES.has(base as FunnelLocale)) return base as FunnelLocale
  return 'en'
}

// ── Flagship upsell labels ────────────────────────────────────────────────

const FLAGSHIP_LABELS_EN: Record<FlagshipKey, SatelliteFlagshipUpsellLabels> = {
  hexastral: {
    kicker: 'CONTINUE IN HEXASTRAL',
    title: 'See your full life chart',
    body: 'Save this reading and unlock daily signals, BaZi & ZiWei depth in HexAstral.',
    cta: 'Install HexAstral',
    installedCta: 'Open in HexAstral',
    installedBody: 'Pick up your full chart and daily signals where you left off.',
  },
  kindred: {
    kicker: 'CONTINUE IN KINDRED',
    title: 'Read your relationship in depth',
    body: 'Bring a partner. Kindred compares two charts and writes a synastry chapter you can share.',
    cta: 'Install Kindred',
    installedCta: 'Open in Kindred',
    installedBody: 'Add a partner and weave this thread into a full synastry chapter.',
  },
  feng: {
    kicker: 'CONTINUE IN FĒNG',
    title: 'Map your space',
    body: 'Fēng turns a single photo of your room into a full feng-shui consultation.',
    cta: 'Install Fēng',
    installedCta: 'Open in Fēng',
    installedBody: 'Anchor this bearing to a Fēng site reading.',
  },
  auspice: {
    kicker: 'CONTINUE IN AUSPICE',
    title: 'Plan your days with your chart',
    body: "Auspice maps today's almanac to your chart, so you can see which days favor action, rest, or delay.",
    cta: 'Install Auspice',
    installedCta: 'Open in Auspice',
    installedBody: 'Pick up your personalized day planning where you left off.',
  },
}

const FLAGSHIP_LABELS_ZH: Record<FlagshipKey, SatelliteFlagshipUpsellLabels> = {
  hexastral: {
    kicker: '继续使用 HEXASTRAL',
    title: '查看完整命盘',
    body: '保存此次解读，在 HexAstral 解锁每日运势、八字与紫微深度分析。',
    cta: '安装 HexAstral',
    installedCta: '在 HexAstral 中打开',
    installedBody: '接着看完整命盘与每日运势。',
  },
  kindred: {
    kicker: '继续使用 KINDRED',
    title: '深入解读你的这段关系',
    body: '加入伴侣信息，Kindred 比对双方命盘并生成可分享的合婚章节。',
    cta: '安装 Kindred',
    installedCta: '在 Kindred 中打开',
    installedBody: '加入伴侣信息，让这条丝线织成完整的合婚章节。',
  },
  feng: {
    kicker: '继续使用 FĒNG',
    title: '让你的空间成为你的助力',
    body: 'Fēng 通过一张房间照片为你生成一份完整的风水建议。',
    cta: '安装 Fēng',
    installedCta: '在 Fēng 中打开',
    installedBody: '把这个方位带入 Fēng 的现场解读。',
  },
  auspice: {
    kicker: '继续使用 AUSPICE',
    title: '用你的命盘规划每一天',
    body: 'Auspice 将每日黄历对应到你的命盘，让你看清哪些日子宜行动、宜休整、宜等待。',
    cta: '安装 Auspice',
    installedCta: '在 Auspice 中打开',
    installedBody: '接着看为你定制的每日择日。',
  },
}

const FLAGSHIP_LABELS_ZH_HANT: Record<FlagshipKey, SatelliteFlagshipUpsellLabels> = {
  hexastral: {
    kicker: '繼續使用 HEXASTRAL',
    title: '查看完整命盤',
    body: '保存此次解讀，在 HexAstral 解鎖每日運勢、八字與紫微深度分析。',
    cta: '安裝 HexAstral',
    installedCta: '在 HexAstral 中打開',
    installedBody: '接著看完整命盤與每日運勢。',
  },
  kindred: {
    kicker: '繼續使用 KINDRED',
    title: '深入解讀你的這段關係',
    body: '加入伴侶資訊，Kindred 比對雙方命盤並生成可分享的合婚章節。',
    cta: '安裝 Kindred',
    installedCta: '在 Kindred 中打開',
    installedBody: '加入伴侶資訊，讓這條絲線織成完整的合婚章節。',
  },
  feng: {
    kicker: '繼續使用 FĒNG',
    title: '讓你的空間成為你的助力',
    body: 'Fēng 透過一張房間照片為你生成一份完整的風水建議。',
    cta: '安裝 Fēng',
    installedCta: '在 Fēng 中打開',
    installedBody: '把這個方位帶入 Fēng 的現場解讀。',
  },
  auspice: {
    kicker: '繼續使用 AUSPICE',
    title: '用你的命盤規劃每一天',
    body: 'Auspice 將每日黃曆對應到你的命盤，讓你看清哪些日子宜行動、宜休整、宜等待。',
    cta: '安裝 Auspice',
    installedCta: '在 Auspice 中打開',
    installedBody: '接著看為你定制的每日擇日。',
  },
}

const FLAGSHIP_LABELS_JA: Record<FlagshipKey, SatelliteFlagshipUpsellLabels> = {
  hexastral: {
    kicker: 'HEXASTRAL で続ける',
    title: '完全な命盤を見る',
    body: 'この鑑定を保存して、HexAstral で日々の運気・八字・紫微の深い解読を解放。',
    cta: 'HexAstral をインストール',
    installedCta: 'HexAstral で開く',
    installedBody: '完全な命盤と日々の運気を、続きから。',
  },
  kindred: {
    kicker: 'KINDRED で続ける',
    title: '関係をより深く読む',
    body: 'パートナーの情報を加えて、Kindred が二人の命盤を比較し、共有できる相性章を生成。',
    cta: 'Kindred をインストール',
    installedCta: 'Kindred で開く',
    installedBody: 'パートナーの情報を加えて、完全な相性章へ。',
  },
  feng: {
    kicker: 'FĒNG で続ける',
    title: 'あなたの空間を味方に',
    body: 'Fēng は部屋の一枚の写真から本格的な風水アドバイスを生成します。',
    cta: 'Fēng をインストール',
    installedCta: 'Fēng で開く',
    installedBody: 'この方位を Fēng の現地鑑定に取り込む。',
  },
  auspice: {
    kicker: 'AUSPICE で続ける',
    title: '命盤で毎日を計画する',
    body: 'Auspice は今日の暦をあなたの命盤に重ね、行動・休息・見送りに向く日を可視化します。',
    cta: 'Auspice をインストール',
    installedCta: 'Auspice で開く',
    installedBody: 'あなた専用の日取り計画を続きから。',
  },
}

const FLAGSHIP_LABELS_BY_LOCALE: Partial<
  Record<FunnelLocale, Record<FlagshipKey, SatelliteFlagshipUpsellLabels>>
> = {
  en: FLAGSHIP_LABELS_EN,
  zh: FLAGSHIP_LABELS_ZH,
  'zh-Hant': FLAGSHIP_LABELS_ZH_HANT,
  ja: FLAGSHIP_LABELS_JA,
}

/**
 * Returns 3 flagship label sets for the given locale, with English fallback
 * for locales that haven't been translated yet (ko / de / es / vi / th).
 * Production should translate the remaining 5 — file a follow-up.
 */
export function defaultFlagshipUpsellLabels(
  localeRaw: string | null | undefined
): Record<FlagshipKey, SatelliteFlagshipUpsellLabels> {
  const locale = pickLocale(localeRaw)
  return FLAGSHIP_LABELS_BY_LOCALE[locale] ?? FLAGSHIP_LABELS_EN
}

// ── Question-type picker labels ───────────────────────────────────────────

const QUESTION_LABELS_EN: SatelliteQuestionTypePickerLabels = {
  prompt: 'What brought you here today?',
  relationship: 'A relationship in my life',
  home_office: 'My home or workspace',
  career_wealth: 'Career, money, health',
  self_daily: 'Just myself / daily insight',
}

const QUESTION_LABELS_ZH: SatelliteQuestionTypePickerLabels = {
  prompt: '今天因为什么来到这里？',
  relationship: '一段关系',
  home_office: '家或办公室',
  career_wealth: '事业 / 财运 / 健康',
  self_daily: '只是我自己 / 每日提示',
}

const QUESTION_LABELS_ZH_HANT: SatelliteQuestionTypePickerLabels = {
  prompt: '今天因為什麼來到這裡？',
  relationship: '一段關係',
  home_office: '家或辦公室',
  career_wealth: '事業 / 財運 / 健康',
  self_daily: '只是我自己 / 每日提示',
}

const QUESTION_LABELS_JA: SatelliteQuestionTypePickerLabels = {
  prompt: '今日はどんなご相談で？',
  relationship: '人間関係について',
  home_office: '住まいや職場について',
  career_wealth: '仕事・お金・健康について',
  self_daily: '自分自身のこと / 毎日の運勢',
}

const QUESTION_LABELS_BY_LOCALE: Partial<Record<FunnelLocale, SatelliteQuestionTypePickerLabels>> =
  {
    en: QUESTION_LABELS_EN,
    zh: QUESTION_LABELS_ZH,
    'zh-Hant': QUESTION_LABELS_ZH_HANT,
    ja: QUESTION_LABELS_JA,
  }

export function defaultQuestionTypeLabels(
  localeRaw: string | null | undefined
): SatelliteQuestionTypePickerLabels {
  const locale = pickLocale(localeRaw)
  return QUESTION_LABELS_BY_LOCALE[locale] ?? QUESTION_LABELS_EN
}
