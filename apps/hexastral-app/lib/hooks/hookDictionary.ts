/**
 * Rule-based hook dictionary — 0 cost, 0 latency, 100% stable
 *
 * Maps 天干 (10 Heavenly Stems) and 星宫主星 (14 Major Stars) to
 * hook strings via i18n keys. All values are TranslationKeys —
 * the actual copy lives in locales/*.ts files.
 *
 * Progressive Disclosure strategy:
 *   1. Instant: 天干 hook (computed locally via astro-core)
 *   2. Upgrade: 主星 hook (from fate reading API response)
 */

import type { HeavenlyStem } from '@zhop/astro-core'
import type { TranslationKeys } from '@/locales/zh'

/** Hook text fields for a 天干 (Day Master stem)  */
export interface StemHook {
  /** Poetic one-liner (~10-15 chars), suitable for hero display & sharing */
  oneLinerKey: TranslationKeys
  /** Personality tag (~8-12 chars), e.g. "秩序的开拓者" */
  personalityTagKey: TranslationKeys
}

/** Hook text fields for a 星宫主星 (Soul Palace Major Star) */
export interface StarHook {
  /** Compound star tag, e.g. "破军坐命：秩序的破坏者" */
  starTagKey: TranslationKeys
}

/**
 * 十天干 → Hook keys
 *
 * Each stem maps to a poetic one-liner and a personality archetype tag.
 * These are rendered instantly after onboarding using local computation.
 */
export const STEM_HOOKS: Record<HeavenlyStem, StemHook> = {
  甲: { oneLinerKey: 'hook_stem_jia_one_liner', personalityTagKey: 'hook_stem_jia_tag' },
  乙: { oneLinerKey: 'hook_stem_yi_one_liner', personalityTagKey: 'hook_stem_yi_tag' },
  丙: { oneLinerKey: 'hook_stem_bing_one_liner', personalityTagKey: 'hook_stem_bing_tag' },
  丁: { oneLinerKey: 'hook_stem_ding_one_liner', personalityTagKey: 'hook_stem_ding_tag' },
  戊: { oneLinerKey: 'hook_stem_wu_one_liner', personalityTagKey: 'hook_stem_wu_tag' },
  己: { oneLinerKey: 'hook_stem_ji_one_liner', personalityTagKey: 'hook_stem_ji_tag' },
  庚: { oneLinerKey: 'hook_stem_geng_one_liner', personalityTagKey: 'hook_stem_geng_tag' },
  辛: { oneLinerKey: 'hook_stem_xin_one_liner', personalityTagKey: 'hook_stem_xin_tag' },
  壬: { oneLinerKey: 'hook_stem_ren_one_liner', personalityTagKey: 'hook_stem_ren_tag' },
  癸: { oneLinerKey: 'hook_stem_gui_one_liner', personalityTagKey: 'hook_stem_gui_tag' },
}

/**
 * 星宫十四主星 → Hook keys
 *
 * Maps the 14 major Zi Wei Dou Shu stars to a compound tag.
 * These are displayed when the fate reading API returns 命宫主星.
 */
export const STAR_HOOKS: Record<string, StarHook> = {
  紫微: { starTagKey: 'hook_star_stellar_tag' },
  天机: { starTagKey: 'hook_star_tianji_tag' },
  太阳: { starTagKey: 'hook_star_taiyang_tag' },
  武曲: { starTagKey: 'hook_star_wuqu_tag' },
  天同: { starTagKey: 'hook_star_tiantong_tag' },
  廉贞: { starTagKey: 'hook_star_lianzhen_tag' },
  天府: { starTagKey: 'hook_star_tianfu_tag' },
  太阴: { starTagKey: 'hook_star_taiyin_tag' },
  贪狼: { starTagKey: 'hook_star_tanlang_tag' },
  巨门: { starTagKey: 'hook_star_jumen_tag' },
  天相: { starTagKey: 'hook_star_tianxiang_tag' },
  天梁: { starTagKey: 'hook_star_tianliang_tag' },
  七杀: { starTagKey: 'hook_star_qisha_tag' },
  破军: { starTagKey: 'hook_star_pojun_tag' },
}
