/**
 * signature() — produce the user's localized identity badge.
 *
 * Pure function: same input always yields same output. No network, no LLM.
 * Combines four canonical inputs (day-master + strength, ziwei main star,
 * dominant ten-god) into 1–3 archetype tokens with a render hint suited to the
 * locale's typographic density (CJK packs; Latin/Thai stack).
 */

import { signatureDictionaries } from './dict/signature'
import type {
  SignatureDictionary,
  SignatureInput,
  SignatureOutput,
} from './signature-types'
import type { Locale } from './types'

const COMPACT_LOCALES: ReadonlySet<Locale> = new Set<Locale>([
  'zh',
  'zh-Hant',
  'ja',
  'ko',
])

function pickPrimary(dict: SignatureDictionary, input: SignatureInput): string {
  const { dayMasterStem, dayMasterStrength } = input
  const override = dict.dayMasterByStrength?.[dayMasterStem]?.[dayMasterStrength]
  return override ?? dict.dayMasterArchetype[dayMasterStem]
}

export function signature(input: SignatureInput): SignatureOutput {
  const dict = signatureDictionaries[input.locale] ?? signatureDictionaries.en

  const primary = pickPrimary(dict, input)

  const secondary =
    input.ziweiPalaceStar && input.ziweiPalaceStar !== '空宫'
      ? dict.ziweiArchetype[input.ziweiPalaceStar]
      : null

  const tertiary = input.dominantTenGod ? dict.tenGodArchetype[input.dominantTenGod] : null

  const tokens: string[] = [primary]
  if (secondary) tokens.push(secondary)
  if (tertiary) tokens.push(tertiary)

  return {
    tokens,
    display: COMPACT_LOCALES.has(input.locale) ? 'compact' : 'stacked',
    primary,
    secondary,
  }
}
