/**
 * 玄空飞星 — 山向二星组合断事 (two-star combination readings).
 *
 * Each palace holds a 山星 + 向星; their pairing has an established 应象 that
 * shifts between 得令(旺) and 失令(衰). This is the per-palace layer beneath the
 * whole-chart 格局 (flying-stars-patterns.ts).
 *
 * Source corpus: 沈氏《玄空学》紫白诀 / 飞星赋 / 玄空秘旨 — the canonical,
 * widely-agreed combinations (一四同宫文昌、二五交加病符、二三斗牛煞、
 * 六七交剑煞、三七穿心、七九合辙、五黄/紫黄毒药 等). Combinations not in the
 * table carry no special name — read them from the two stars' 五行生克 + 旺衰.
 *
 * Keyed by the SORTED pair (order-independent); when 山/向 role matters
 * (山管人丁、向管财) that nuance is left to the form-li (D4) layer.
 */

import type { YuanYun } from './flying-stars'
import { classifyStar } from './flying-stars'

export type CombinationDomain = '财' | '丁' | '官' | '文' | '病' | '灾' | '桃花' | '是非' | '盗'

export interface StarCombination {
  /** Sorted ascending [min, max]. */
  pair: readonly [YuanYun, YuanYun]
  /** Classical name, if any (文昌 / 斗牛煞 / 交剑煞 …). */
  name?: string
  domain: readonly CombinationDomain[]
  /** 应象 when 得令 / 旺. */
  prosperous: string
  /** 应象 when 失令 / 衰死. */
  declining: string
}

// Curated canonical table. Pairs are sorted ascending.
const COMBINATIONS: readonly StarCombination[] = [
  {
    pair: [1, 1],
    domain: ['文', '桃花'],
    prosperous: '中男聪秀、文思敏捷',
    declining: '泌尿耳疾、酒色桃花',
  },
  {
    pair: [1, 4],
    name: '文昌（四一同宫）',
    domain: ['文', '桃花'],
    prosperous: '科甲功名、文章显达',
    declining: '桃花淫荡、漂泊他乡',
  },
  {
    pair: [1, 6],
    domain: ['官', '文'],
    prosperous: '文武官贵、聪明显达',
    declining: '金水冷退、孤寡寒苦',
  },
  {
    pair: [1, 7],
    domain: ['财', '桃花'],
    prosperous: '出外得财、武市进益',
    declining: '桃花是非、盗劫',
  },
  {
    pair: [1, 8],
    domain: ['财', '丁'],
    prosperous: '财丁两旺、富贵双全',
    declining: '小口损伤、耳疾',
  },
  { pair: [1, 9], domain: ['丁'], prosperous: '婚喜聪秀、中喜', declining: '水火不容、心目之疾' },
  {
    pair: [2, 2],
    name: '病符',
    domain: ['财', '病'],
    prosperous: '田产致富（当运）',
    declining: '疾病缠身、寡妇当家',
  },
  {
    pair: [2, 3],
    name: '斗牛煞',
    domain: ['是非'],
    prosperous: '田产进益',
    declining: '是非官非、口舌斗争、母子不和',
  },
  {
    pair: [2, 5],
    name: '二五交加',
    domain: ['病', '灾'],
    prosperous: '田产暂旺',
    declining: '重病横祸、损主、孕妇不安（大凶）',
  },
  {
    pair: [2, 7],
    domain: ['财', '灾'],
    prosperous: '先天火生土、横财',
    declining: '火灾、妇科、桃花、肠胃',
  },
  { pair: [2, 9], domain: ['灾'], prosperous: '喜庆生财', declining: '火炎土燥、产厄目疾、愚钝' },
  {
    pair: [3, 3],
    name: '蚩尤',
    domain: ['是非', '盗'],
    prosperous: '兴家立业、震发',
    declining: '官非盗劫、肝胆足疾',
  },
  { pair: [3, 4], domain: ['文', '灾'], prosperous: '文才秀发', declining: '风魔疯疾、肝胆、贼盗' },
  {
    pair: [3, 7],
    name: '穿心煞',
    domain: ['盗', '灾'],
    prosperous: '动中求财',
    declining: '盗劫破财、官非刑狱、足伤',
  },
  { pair: [4, 5], domain: ['病'], prosperous: '文中带秀', declining: '皮肤风疾、乳痈、孕灾' },
  {
    pair: [4, 9],
    domain: ['文', '灾'],
    prosperous: '木火通明、文章科甲',
    declining: '火灾目疾、痰火',
  },
  {
    pair: [5, 5],
    name: '五黄',
    domain: ['灾', '病'],
    prosperous: '—',
    declining: '灾病横祸，尤忌动土（大凶）',
  },
  {
    pair: [5, 7],
    name: '紫黄毒药',
    domain: ['灾'],
    prosperous: '—',
    declining: '中毒、性病、口舌、血光',
  },
  {
    pair: [5, 9],
    name: '紫黄毒药',
    domain: ['灾'],
    prosperous: '—',
    declining: '毒药血光、目疾、性病',
  },
  { pair: [6, 6], domain: ['官'], prosperous: '武贵权威', declining: '金重头痛、官讼、孤刚' },
  {
    pair: [6, 7],
    name: '交剑煞',
    domain: ['是非', '灾'],
    prosperous: '武市横财',
    declining: '夫妻兄弟不和、刀伤斗殴、劫盗',
  },
  {
    pair: [6, 8],
    domain: ['财', '官'],
    prosperous: '武贵富厚、土生金财',
    declining: '关节筋骨之疾',
  },
  {
    pair: [7, 7],
    name: '破军',
    domain: ['财', '灾'],
    prosperous: '武市发财',
    declining: '火灾刀兵、口舌、桃花',
  },
  {
    pair: [7, 9],
    name: '七九合辙',
    domain: ['灾'],
    prosperous: '旺财（火当令）',
    declining: '回禄火灾、血光、心目之疾',
  },
  {
    pair: [8, 8],
    domain: ['财', '丁'],
    prosperous: '大旺财丁、富贵（当运）',
    declining: '小口、关节脾胃',
  },
  {
    pair: [8, 9],
    domain: ['财', '丁'],
    prosperous: '婚喜进财、火生土富贵',
    declining: '目疾、骨痛',
  },
  {
    pair: [9, 9],
    domain: ['丁', '灾'],
    prosperous: '喜庆文明、科名',
    declining: '火灾目疾、血症、官非',
  },
]

const INDEX: ReadonlyMap<string, StarCombination> = new Map(
  COMBINATIONS.map((c) => [`${c.pair[0]}-${c.pair[1]}`, c])
)

/** Look up the combination for two stars (order-independent). */
export function lookupCombination(a: YuanYun, b: YuanYun): StarCombination | null {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return INDEX.get(`${lo}-${hi}`) ?? null
}

export interface PalaceCombination {
  mountainStar: YuanYun
  facingStar: YuanYun
  combination: StarCombination | null
  /** 旺 if 山/向 任一当令或生气, else 衰. Selects which reading applies. */
  phase: '旺' | '衰'
  /** Classical phase-appropriate reading (internal / corpus). */
  reading: string
  /**
   * App Store / consumer-safe reading — strips medical classical imagery.
   * Synthesis, mid-LLM, and UI chips MUST use this, not `reading`.
   */
  readingPublic: string
  name?: string
}

/** Substrings that must not appear in public-facing combination copy. */
export const COMBINATION_MEDICAL_DENYLIST = [
  '重病',
  '孕妇',
  '性病',
  '中毒',
  '血光',
  '产厄',
  '乳痈',
  '孕灾',
  '泌尿',
  '肠胃',
  '肝胆',
  '足疾',
  '风魔',
  '疯疾',
  '皮肤',
  '目疾',
  '血症',
  '心目',
  '关节',
  '筋骨',
  '骨痛',
  '头痛',
  '耳疾',
  '小口',
  '寡妇',
  '损主',
  '毒药',
  '刀伤',
  '盗劫',
  '刑狱',
  '回禄',
  '足伤',
  '痰火',
  '愚钝',
  '酒色',
  '淫荡',
] as const

/**
 * Map classical 应象 to a study-safe public line.
 * Benign literary readings (科甲、文章…) pass through; medical/disaster classical is softened.
 */
export function toReadingPublic(
  classical: string,
  phase: '旺' | '衰',
  domains: readonly CombinationDomain[]
): string {
  if (!classical || classical === '—') return ''
  const hit = COMBINATION_MEDICAL_DENYLIST.some((d) => classical.includes(d))
  if (!hit) return classical
  if (phase === '旺') {
    if (domains.includes('财') || domains.includes('丁')) {
      return '传统上此组合当令时偏旺财丁象（文化研习，非预测）'
    }
    if (domains.includes('文') || domains.includes('官')) {
      return '传统上此组合当令时偏文官吉利象（文化研习，非预测）'
    }
    return '传统上此组合当令时偏吉利象（文化研习，非预测）'
  }
  if (domains.includes('病') || domains.includes('灾')) {
    return '传统上此宫双星组合偏煞象，研习上宜静不宜大动（非医疗/灾祸预测）'
  }
  if (domains.includes('是非') || domains.includes('盗')) {
    return '传统上此宫双星组合偏口舌是非象，研习上宜静（非诉讼预测）'
  }
  return '传统上此宫双星组合偏煞象，研习上宜静不宜大动（文化研习）'
}

/**
 * Describe one palace's 山+向 pairing relative to the current 元运.
 * `phase` reads 旺 when either star is 当令/生气 (the combination's auspicious
 * face shows), otherwise 衰 (its 失令 face).
 */
/** 煞-natured domains: such combinations only read 旺 when a star is truly 当令
 *  (not merely 生气) — e.g. 二五交加 must NOT read auspicious just because 2 is
 *  the future 生气 star; the 五黄 keeps it malefic until actually 当运. */
const MALEFIC_DOMAINS: ReadonlySet<CombinationDomain> = new Set(['灾', '病', '是非', '盗'])

export function describePalaceCombination(
  mountainStar: YuanYun,
  facingStar: YuanYun,
  yuanYun: YuanYun
): PalaceCombination {
  const combination = lookupCombination(mountainStar, facingStar)
  const mq = classifyStar(mountainStar, yuanYun)
  const fq = classifyStar(facingStar, yuanYun)
  const hasDangling = mq === '当令' || fq === '当令'
  const hasSheng = mq === '生气' || fq === '生气'
  const malefic = combination ? combination.domain.some((d) => MALEFIC_DOMAINS.has(d)) : false
  // Benefic combos: 当令 or 生气 → 旺. Malefic combos: only true 当令 → 旺.
  const prosperous = malefic ? hasDangling : hasDangling || hasSheng
  const phase: '旺' | '衰' = prosperous ? '旺' : '衰'
  const reading = combination
    ? phase === '旺'
      ? combination.prosperous
      : combination.declining
    : ''
  const domains = combination?.domain ?? []
  return {
    mountainStar,
    facingStar,
    combination,
    phase,
    name: combination?.name,
    reading,
    readingPublic: toReadingPublic(reading, phase, domains),
  }
}
