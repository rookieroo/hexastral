/**
 * SignatureBar — the user's localized identity, rendered as a tiny kicker
 * line directly above the Daily Signal headline (magazine "byline" style).
 *
 * Pure deterministic render: consumes signature() from @zhop/astro-i18n.
 * Renders all tokens on a single line joined with `·`, sized to read as
 * metadata (uppercase, letter-spaced, secondary color).
 *
 * Inputs come from useUserQuery static traits (set during onboarding via
 * /api/onboarding/static-traits) and the active i18n locale. If any required
 * trait is missing (e.g. legacy account pre-Phase-4.8) we render nothing —
 * the surrounding layout is responsible for fallback messaging.
 */

import type { DayMasterStrength, Locale, Stem, TenGod, ZiweiMainStar } from '@zhop/astro-i18n'
import { signature } from '@zhop/astro-i18n'
import { Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

interface Props {
  dayMasterStem: string | null | undefined
  dayMasterStrength: string | null | undefined
  ziweiMingPalaceStar: string | null | undefined
  /** Currently API does not yet bake dominantTenGod onto users — accept null. */
  dominantTenGod?: string | null
}

const STEMS: ReadonlySet<string> = new Set([
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
const STRENGTHS: ReadonlySet<string> = new Set(['极强', '偏强', '中和', '偏弱', '极弱'])
const ZIWEI_STARS: ReadonlySet<string> = new Set([
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
const TEN_GODS: ReadonlySet<string> = new Set([
  '比肩',
  '劫财',
  '食神',
  '伤官',
  '正财',
  '偏财',
  '正官',
  '七杀',
  '正印',
  '偏印',
])

export function SignatureBar({
  dayMasterStem,
  dayMasterStrength,
  ziweiMingPalaceStar,
  dominantTenGod,
}: Props) {
  const { locale } = useI18n()
  const ios = useIosPalette()

  if (!dayMasterStem || !STEMS.has(dayMasterStem)) return null
  if (!dayMasterStrength || !STRENGTHS.has(dayMasterStrength)) return null

  const ziwei =
    ziweiMingPalaceStar && ZIWEI_STARS.has(ziweiMingPalaceStar)
      ? (ziweiMingPalaceStar as ZiweiMainStar)
      : null
  const tenGod = dominantTenGod && TEN_GODS.has(dominantTenGod) ? (dominantTenGod as TenGod) : null

  const out = signature({
    dayMasterStem: dayMasterStem as Stem,
    dayMasterStrength: dayMasterStrength as DayMasterStrength,
    ziweiPalaceStar: ziwei,
    dominantTenGod: tenGod,
    locale: locale as Locale,
  })

  const tokens = out.display === 'compact' ? out.tokens : [out.primary, ...out.tokens.slice(1)]
  const line = tokens.filter(Boolean).join(' · ')

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 0 }}>
      <Text
        style={{
          color: ios.secondary,
          fontSize: 10,
          fontWeight: '300',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
        numberOfLines={1}
      >
        {line}
      </Text>
    </View>
  )
}
