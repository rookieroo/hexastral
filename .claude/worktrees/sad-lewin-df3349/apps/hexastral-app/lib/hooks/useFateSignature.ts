/**
 * useFateSignature — personal tagline for Path profile.
 *
 * Priority:
 * 1. Server-persisted `users.fate_signature` (+ explanation) when non-empty —
 *    stable, product-owned copy (e.g. future LLM regen).
 * 2. Else deterministic line from `@zhop/astro-i18n` `signature()` using
 *    day-master / strength / 紫微命宫 (no network).
 *
 * Distinct from Fate tab **daily signal** (`daily_signals` / GET signal/today).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type DayMasterStrength,
  type Locale,
  type Stem,
  signature,
  type ZiweiMainStar,
} from '@zhop/astro-i18n'
import { useMemo } from 'react'
import { useI18n } from '@/lib/i18n'

export type SignatureStyle = 'classical' | 'sharp' | 'poetic' | 'custom'

export interface FateSignatureData {
  signature: string
  /** Plain-language explanation of the signature. */
  explanation: string | null
  style: SignatureStyle
  customPrompt: string | null
  generatedAt: string
}

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

/**
 * Reads the current signature from the cached `user` query payload (no extra fetch).
 *
 * Derives a localised archetype line from the user's chart traits using
 * `@zhop/astro-i18n`. Returns null until the user has at least a day-master
 * stem + strength on file (i.e. their natal chart has been built).
 */
export function useFateSignature(
  userId: string | null | undefined,
  cachedUser: {
    dayMasterStem?: string | null
    dayMasterStrength?: string | null
    ziweiMingPalaceStar?: string | null
    fateSignature?: string | null
    fateSignatureStyle?: string | null
    fateSignatureCustomPrompt?: string | null
    fateSignatureGeneratedAt?: string | null
    fateSignatureExplanation?: string | null
  } | null
): FateSignatureData | null {
  const { locale } = useI18n()

  return useMemo(() => {
    if (!userId || !cachedUser) return null

    const serverSig = cachedUser.fateSignature?.trim()
    if (serverSig) {
      const raw = cachedUser.fateSignatureStyle
      const style: SignatureStyle =
        raw === 'sharp' || raw === 'poetic' || raw === 'custom' || raw === 'classical'
          ? raw
          : 'classical'
      return {
        signature: serverSig,
        explanation: cachedUser.fateSignatureExplanation?.trim() ?? null,
        style,
        customPrompt: cachedUser.fateSignatureCustomPrompt ?? null,
        generatedAt: cachedUser.fateSignatureGeneratedAt ?? new Date().toISOString(),
      }
    }

    const stem = cachedUser.dayMasterStem
    const strength = cachedUser.dayMasterStrength
    if (!stem || !strength || !STEM_SET.has(stem) || !STRENGTH_SET.has(strength)) {
      return null
    }
    const ziweiRaw = cachedUser.ziweiMingPalaceStar ?? null
    const ziwei: ZiweiMainStar | null =
      ziweiRaw && ZIWEI_STAR_SET.has(ziweiRaw) ? (ziweiRaw as ZiweiMainStar) : null

    const out = signature({
      dayMasterStem: stem as Stem,
      dayMasterStrength: strength as DayMasterStrength,
      ziweiPalaceStar: ziwei,
      dominantTenGod: null,
      locale: locale as Locale,
    })

    return {
      signature: out.tokens.join(out.display === 'compact' ? ' · ' : '\n'),
      explanation: out.secondary ? `${out.primary} · ${out.secondary}` : out.primary,
      style: 'classical',
      customPrompt: null,
      generatedAt: new Date().toISOString(),
    }
  }, [userId, cachedUser, locale])
}

/**
 * No-op compatibility shim. The server-side regenerate endpoint was removed;
 * style/custom-prompt customisation is no longer available. Calling
 * `mutate()` simply refreshes the cached user query so the derived signature
 * picks up any chart-trait changes made elsewhere.
 */
export function useGenerateFateSignature() {
  const qc = useQueryClient()
  return useMutation<FateSignatureData | null, Error, { userId: string } & Record<string, unknown>>(
    {
      mutationFn: async (vars) => {
        await qc.invalidateQueries({ queryKey: ['user', vars.userId] })
        return null
      },
    }
  )
}
