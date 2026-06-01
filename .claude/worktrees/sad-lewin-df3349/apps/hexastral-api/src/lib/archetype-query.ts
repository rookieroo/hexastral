/**
 * archetype-query.ts — D1 命格预设查询助手
 *
 * 主查询：day_stem × month_branch × gender × lang → 人格三条 + 悬念 + 警示
 * 语言回退链：ja→en，zh-Hant→zh，其余直接返回en
 */

import { and, eq } from 'drizzle-orm'
import { archetypePresets } from '../db/schema'
import type { AppDb } from '../infra-types'

export type ArchetypePersonality = {
  personalityBullets: [string, string, string]
  fateTease: string
  warning: string
  /** Row primary key — used internally to increment impressions via waitUntil */
  presetId: string
}

/** Normalise & map lang string to the 4 D1-supported lang codes */
function normLang(lang: string): 'zh' | 'zh-Hant' | 'en' | 'ja' {
  if (lang === 'zh' || lang === 'zh-CN' || lang === 'zh-SG') return 'zh'
  if (lang === 'zh-Hant' || lang === 'zh-TW' || lang === 'zh-HK' || lang === 'zh-MO')
    return 'zh-Hant'
  if (lang === 'ja') return 'ja'
  return 'en'
}

/** Ordered fallback chain — try primary lang first, then fallback */
function langFallbacks(lang: string): string[] {
  const norm = normLang(lang)
  if (norm === 'ja') return ['ja', 'en']
  if (norm === 'zh-Hant') return ['zh-Hant', 'zh']
  return [norm]
}

/**
 * Query D1 for the active variant-A archetype preset.
 * Tries the normalised lang first; falls back per langFallbacks chain.
 * Returns null if the table is empty or D1 is unreachable (caller falls back to in-memory preset).
 */
export async function getArchetypePreset(
  db: AppDb,
  dayStem: string,
  monthBranch: string,
  gender: '男' | '女',
  lang: string
): Promise<ArchetypePersonality | null> {
  const langs = langFallbacks(lang)

  for (const l of langs) {
    const rows = await db
      .select()
      .from(archetypePresets)
      .where(
        and(
          eq(archetypePresets.dayStem, dayStem),
          eq(archetypePresets.monthBranch, monthBranch),
          eq(archetypePresets.gender, gender),
          eq(archetypePresets.lang, l),
          eq(archetypePresets.active, true),
          eq(archetypePresets.variant, 'A')
        )
      )
      .limit(1)

    const row = rows[0]
    if (row) {
      return {
        personalityBullets: [row.bullet1, row.bullet2, row.bullet3],
        fateTease: row.fateTease,
        warning: row.warning,
        presetId: row.id,
      }
    }
  }

  return null
}
