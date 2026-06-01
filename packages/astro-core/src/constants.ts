/**
 * @zhop/astro-core — 基础常量
 *
 * 天干、地支、五行、生肖、方位等命理基础数据。
 */

import type { EarthlyBranch, HeavenlyStem, WuXing, YinYang } from './types'

// ========================================
// 天干 (Heavenly Stems)
// ========================================

export const HEAVENLY_STEMS: readonly HeavenlyStem[] = [
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
] as const

/** 天干 → 五行 */
export const STEM_WUXING: Record<HeavenlyStem, WuXing> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

/** 天干 → 阴阳 */
export const STEM_YINYANG: Record<HeavenlyStem, YinYang> = {
  甲: '阳',
  乙: '阴',
  丙: '阳',
  丁: '阴',
  戊: '阳',
  己: '阴',
  庚: '阳',
  辛: '阴',
  壬: '阳',
  癸: '阴',
}

// ========================================
// 地支 (Earthly Branches)
// ========================================

export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

/** 地支 → 五行 */
export const BRANCH_WUXING: Record<EarthlyBranch, WuXing> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

/** 地支 → 阴阳 */
export const BRANCH_YINYANG: Record<EarthlyBranch, YinYang> = {
  子: '阳',
  丑: '阴',
  寅: '阳',
  卯: '阴',
  辰: '阳',
  巳: '阴',
  午: '阳',
  未: '阴',
  申: '阳',
  酉: '阴',
  戌: '阳',
  亥: '阴',
}

/** 地支 → 生肖 */
export const BRANCH_ZODIAC: Record<EarthlyBranch, string> = {
  子: '鼠',
  丑: '牛',
  寅: '虎',
  卯: '兔',
  辰: '龙',
  巳: '蛇',
  午: '马',
  未: '羊',
  申: '猴',
  酉: '鸡',
  戌: '狗',
  亥: '猪',
}

// ========================================
// 六十甲子
// ========================================

/** 六十甲子表 — 预计算避免运行时循环 */
export const SEXAGENARY_CYCLE: readonly string[] = [
  '甲子',
  '乙丑',
  '丙寅',
  '丁卯',
  '戊辰',
  '己巳',
  '庚午',
  '辛未',
  '壬申',
  '癸酉',
  '甲戌',
  '乙亥',
  '丙子',
  '丁丑',
  '戊寅',
  '己卯',
  '庚辰',
  '辛巳',
  '壬午',
  '癸未',
  '甲申',
  '乙酉',
  '丙戌',
  '丁亥',
  '戊子',
  '己丑',
  '庚寅',
  '辛卯',
  '壬辰',
  '癸巳',
  '甲午',
  '乙未',
  '丙申',
  '丁酉',
  '戊戌',
  '己亥',
  '庚子',
  '辛丑',
  '壬寅',
  '癸卯',
  '甲辰',
  '乙巳',
  '丙午',
  '丁未',
  '戊申',
  '己酉',
  '庚戌',
  '辛亥',
  '壬子',
  '癸丑',
  '甲寅',
  '乙卯',
  '丙辰',
  '丁巳',
  '戊午',
  '己未',
  '庚申',
  '辛酉',
  '壬戌',
  '癸亥',
] as const

// ========================================
// 五行关系
// ========================================

/** 五行相生: 木→火→土→金→水→木 */
export const WUXING_GENERATE: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** 五行相克: 木→土→水→火→金→木 */
export const WUXING_OVERCOME: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

// ========================================
// 农历月/日名称
// ========================================

/** 农历月名 */
export const LUNAR_MONTH_NAMES: readonly string[] = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月',
] as const

/** 农历日名 */
export const LUNAR_DAY_NAMES: readonly string[] = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
] as const

// ========================================
// 时辰
// ========================================

/** 十二时辰 */
export const SHI_CHEN_TABLE = [
  { branch: '子' as const, name: '子时', startHour: 23, endHour: 1, animal: '鼠', index: 0 },
  { branch: '丑' as const, name: '丑时', startHour: 1, endHour: 3, animal: '牛', index: 1 },
  { branch: '寅' as const, name: '寅时', startHour: 3, endHour: 5, animal: '虎', index: 2 },
  { branch: '卯' as const, name: '卯时', startHour: 5, endHour: 7, animal: '兔', index: 3 },
  { branch: '辰' as const, name: '辰时', startHour: 7, endHour: 9, animal: '龙', index: 4 },
  { branch: '巳' as const, name: '巳时', startHour: 9, endHour: 11, animal: '蛇', index: 5 },
  { branch: '午' as const, name: '午时', startHour: 11, endHour: 13, animal: '马', index: 6 },
  { branch: '未' as const, name: '未时', startHour: 13, endHour: 15, animal: '羊', index: 7 },
  { branch: '申' as const, name: '申时', startHour: 15, endHour: 17, animal: '猴', index: 8 },
  { branch: '酉' as const, name: '酉时', startHour: 17, endHour: 19, animal: '鸡', index: 9 },
  { branch: '戌' as const, name: '戌时', startHour: 19, endHour: 21, animal: '狗', index: 10 },
  { branch: '亥' as const, name: '亥时', startHour: 21, endHour: 23, animal: '猪', index: 11 },
] as const

// ========================================
// 二十四节气
// ========================================

/** 二十四节气 — 按黄经度数排列（从春分 0° 开始） */
export const JIEQI_TABLE = [
  { name: '春分', longitude: 0, approxDate: '03-20', monthIndex: 2, type: 'qi' as const },
  { name: '清明', longitude: 15, approxDate: '04-05', monthIndex: 3, type: 'jie' as const },
  { name: '谷雨', longitude: 30, approxDate: '04-20', monthIndex: 3, type: 'qi' as const },
  { name: '立夏', longitude: 45, approxDate: '05-06', monthIndex: 4, type: 'jie' as const },
  { name: '小满', longitude: 60, approxDate: '05-21', monthIndex: 4, type: 'qi' as const },
  { name: '芒种', longitude: 75, approxDate: '06-06', monthIndex: 5, type: 'jie' as const },
  { name: '夏至', longitude: 90, approxDate: '06-21', monthIndex: 5, type: 'qi' as const },
  { name: '小暑', longitude: 105, approxDate: '07-07', monthIndex: 6, type: 'jie' as const },
  { name: '大暑', longitude: 120, approxDate: '07-23', monthIndex: 6, type: 'qi' as const },
  { name: '立秋', longitude: 135, approxDate: '08-07', monthIndex: 7, type: 'jie' as const },
  { name: '处暑', longitude: 150, approxDate: '08-23', monthIndex: 7, type: 'qi' as const },
  { name: '白露', longitude: 165, approxDate: '09-08', monthIndex: 8, type: 'jie' as const },
  { name: '秋分', longitude: 180, approxDate: '09-23', monthIndex: 8, type: 'qi' as const },
  { name: '寒露', longitude: 195, approxDate: '10-08', monthIndex: 9, type: 'jie' as const },
  { name: '霜降', longitude: 210, approxDate: '10-23', monthIndex: 9, type: 'qi' as const },
  { name: '立冬', longitude: 225, approxDate: '11-07', monthIndex: 10, type: 'jie' as const },
  { name: '小雪', longitude: 240, approxDate: '11-22', monthIndex: 10, type: 'qi' as const },
  { name: '大雪', longitude: 255, approxDate: '12-07', monthIndex: 11, type: 'jie' as const },
  { name: '冬至', longitude: 270, approxDate: '12-22', monthIndex: 11, type: 'qi' as const },
  { name: '小寒', longitude: 285, approxDate: '01-06', monthIndex: 0, type: 'jie' as const },
  { name: '大寒', longitude: 300, approxDate: '01-20', monthIndex: 0, type: 'qi' as const },
  { name: '立春', longitude: 315, approxDate: '02-04', monthIndex: 1, type: 'jie' as const },
  { name: '雨水', longitude: 330, approxDate: '02-19', monthIndex: 1, type: 'qi' as const },
  { name: '惊蛰', longitude: 345, approxDate: '03-06', monthIndex: 2, type: 'jie' as const },
] as const

/**
 * 二十四节气按年历序（从小寒开始）
 * 用于确定月干支的「节」界限
 */
export const JIEQI_ORDER: readonly string[] = [
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至',
] as const

/**
 * 月柱起始节气（每月以「节」为界，共 12 节）
 * index 0 = 寅月(正月) → 立春
 */
export const MONTH_JIE: readonly string[] = [
  '立春',
  '惊蛰',
  '清明',
  '立夏',
  '芒种',
  '小暑',
  '立秋',
  '白露',
  '寒露',
  '立冬',
  '大雪',
  '小寒',
] as const
