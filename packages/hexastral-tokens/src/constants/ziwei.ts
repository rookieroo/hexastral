/** 十二宫名称 */
export const PALACE_NAMES = [
  '命宫',
  '兄弟',
  '夫妻',
  '子女',
  '财帛',
  '疾厄',
  '迁移',
  '交友',
  '官禄',
  '田宅',
  '福德',
  '父母',
] as const

export type PalaceName = (typeof PALACE_NAMES)[number]

/** 星曜亮度标签 */
export const BRIGHTNESS_LABELS: Record<string, string> = {
  庙: '庙（最旺）',
  旺: '旺（次旺）',
  得: '得（中上）',
  利: '利（中等）',
  平: '平（平和）',
  不: '不（偏弱）',
  陷: '陷（最弱）',
}

/** 四化标签 */
export const MUTAGEN_LABELS: Record<string, string> = {
  禄: '化禄（财源/顺利）',
  权: '化权（权势/掌控）',
  科: '化科（名声/才华）',
  忌: '化忌（阻碍/纠缠）',
}

/** 十神类型 */
export const SHISHEN_NAMES = [
  '比肩',
  '劫财',
  '食神',
  '伤官',
  '偏财',
  '正财',
  '七杀',
  '正官',
  '偏印',
  '正印',
] as const

export type ShiShen = (typeof SHISHEN_NAMES)[number]
