/**
 * Deterministic fate signature for public web profiles — mirrors iOS
 * `useFateSignature` when `users.fate_signature` is empty.
 */

import {
  type DayMasterStrength,
  type Locale,
  type Stem,
  signature,
  type ZiweiMainStar,
} from '@zhop/astro-i18n'

const STEM_SET: ReadonlySet<string> = new Set([
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
])
const STRENGTH_SET: ReadonlySet<string> = new Set(['极强', '偏强', '中和', '偏弱', '极弱'])
const ZIWEI_STAR_SET: ReadonlySet<string> = new Set([
  '紫微',
  '天机',
  '太阳',
  '武曲',
  '天同',
  '廉贞',
  '天府',
  '太阴',
  '贪狼',
  '巨门',
  '天相',
  '天梁',
  '七杀',
  '破军',
  '空宫',
])

export function normalizePublicLocale(raw: string | null | undefined): Locale {
  const r = (raw ?? 'en').toLowerCase()
  if (r.startsWith('zh-hant') || r === 'zh-tw' || r === 'zh-hk') return 'zh-Hant'
  if (r.startsWith('zh')) return 'zh'
  if (r.startsWith('ja')) return 'ja'
  if (r.startsWith('ko')) return 'ko'
  if (r.startsWith('de')) return 'de'
  if (r.startsWith('es')) return 'es'
  if (r.startsWith('vi')) return 'vi'
  if (r.startsWith('th')) return 'th'
  return 'en'
}

export function derivePublicSignature(input: {
  dayMasterStem: string | null | undefined
  dayMasterStrength: string | null | undefined
  ziweiMingPalaceStar: string | null | undefined
  locale: string | null | undefined
}): { signature: string; explanation: string } | null {
  const stem = input.dayMasterStem
  const strength = input.dayMasterStrength
  if (!stem || !strength || !STEM_SET.has(stem) || !STRENGTH_SET.has(strength)) {
    return null
  }
  const ziweiRaw = input.ziweiMingPalaceStar ?? null
  const ziwei: ZiweiMainStar | null =
    ziweiRaw && ZIWEI_STAR_SET.has(ziweiRaw) ? (ziweiRaw as ZiweiMainStar) : null

  const loc = normalizePublicLocale(input.locale)
  const out = signature({
    dayMasterStem: stem as Stem,
    dayMasterStrength: strength as DayMasterStrength,
    ziweiPalaceStar: ziwei,
    dominantTenGod: null,
    locale: loc,
  })

  const sigLine = out.tokens.join(out.display === 'compact' ? ' · ' : '\n')
  const explanation = out.secondary ? `${out.primary} · ${out.secondary}` : out.primary
  return { signature: sigLine, explanation }
}
