/**
 * 黄历日页所需的口诀表 — 全部为公开的传统通书规则，逐条用权威日页
 * （m.168888.com.cn 2026-01-09 癸未日）交叉验证后落表：
 *
 * - 黄道吉时（时家十二值神起例）：子午日起申、丑未日起戌、寅申日起子、
 *   卯酉日起寅、辰戌日起辰、巳亥日起午，青龙起后顺行十二神，青龙/明堂/
 *   金匮/天德/玉堂/司命为吉。验证：未日 子=天刑凶、丑=朱雀凶、寅=金匮吉、
 *   卯=天德吉、午=天牢凶、申=司命吉、戌=青龙吉、亥=明堂吉 ✓
 * - 财神方位（日干）：甲乙东北、丙丁西南、戊己正北、庚辛正东、壬癸正南。
 *   验证：癸日财神正南 ✓
 * - 喜神方位（日干）：甲己东北、乙庚西北、丙辛西南、丁壬正南、戊癸东南。
 *   验证：癸日喜神东南 ✓
 * - 月柱（五虎遁 + 节令月）：甲己之年丙作首…；月支按上一「节」定
 *   （立春寅…小寒丑），「气」映射到前一个节。验证：乙年 + 小寒 → 己丑月 ✓
 */

import {
  EARTHLY_BRANCHES,
  type EarthlyBranch,
  getNaYin,
  HEAVENLY_STEMS,
  type HeavenlyStem,
  makeGanZhi,
} from '@zhop/astro-core'

/** 纳音五行 — 按干支名（如「乙巳」）查表；引擎 getNaYin 需要 GanZhi 对象。 */
export function nayinOf(gzLabel: string): string {
  const s = HEAVENLY_STEMS.indexOf(gzLabel[0] as HeavenlyStem)
  const b = EARTHLY_BRANCHES.indexOf(gzLabel[1] as EarthlyBranch)
  if (s < 0 || b < 0 || gzLabel.length !== 2) return ''
  return getNaYin(makeGanZhi(s, b))
}

/** 时家十二值神（黄道黑道），顺行。 */
export const HOUR_GODS = [
  '青龙',
  '明堂',
  '天刑',
  '朱雀',
  '金匮',
  '天德',
  '白虎',
  '玉堂',
  '天牢',
  '玄武',
  '司命',
  '勾陈',
] as const

const LUCKY_GODS: ReadonlySet<string> = new Set(['青龙', '明堂', '金匮', '天德', '玉堂', '司命'])

/** 青龙起时（时支序 0=子…11=亥）— 按日支。 */
const QINGLONG_START: Record<string, number> = {
  子: 8,
  午: 8,
  丑: 10,
  未: 10,
  寅: 0,
  申: 0,
  卯: 2,
  酉: 2,
  辰: 4,
  戌: 4,
  巳: 6,
  亥: 6,
}

/** 时辰（0=子时）在给定日支下的黄道值神 + 吉凶。 */
export function hourGod(dayBranch: string, hourIndex: number): { god: string; lucky: boolean } {
  const start = QINGLONG_START[dayBranch] ?? 0
  const god = HOUR_GODS[(((hourIndex - start) % 12) + 12) % 12] ?? '青龙'
  return { god, lucky: LUCKY_GODS.has(god) }
}

/** 财神方位（按日干）。 */
const CAISHEN: Record<string, string> = {
  甲: '东北',
  乙: '东北',
  丙: '西南',
  丁: '西南',
  戊: '正北',
  己: '正北',
  庚: '正东',
  辛: '正东',
  壬: '正南',
  癸: '正南',
}

/** 喜神方位（按日干）。 */
const XISHEN: Record<string, string> = {
  甲: '东北',
  己: '东北',
  乙: '西北',
  庚: '西北',
  丙: '西南',
  辛: '西南',
  丁: '正南',
  壬: '正南',
  戊: '东南',
  癸: '东南',
}

export function caishenDirection(dayStem: string): string | null {
  return CAISHEN[dayStem] ?? null
}
export function xishenDirection(dayStem: string): string | null {
  return XISHEN[dayStem] ?? null
}

/** 节 → 月支；气 → 前一个节。 */
const JIE_BRANCH: Record<string, string> = {
  立春: '寅',
  惊蛰: '卯',
  清明: '辰',
  立夏: '巳',
  芒种: '午',
  小暑: '未',
  立秋: '申',
  白露: '酉',
  寒露: '戌',
  立冬: '亥',
  大雪: '子',
  小寒: '丑',
}
const QI_TO_JIE: Record<string, string> = {
  大寒: '小寒',
  雨水: '立春',
  春分: '惊蛰',
  谷雨: '清明',
  小满: '立夏',
  夏至: '芒种',
  大暑: '小暑',
  处暑: '立秋',
  秋分: '白露',
  霜降: '寒露',
  小雪: '立冬',
  冬至: '大雪',
}

/** 五虎遁：年干 → 寅月干。 */
const WUHU_DUN: Record<string, string> = {
  甲: '丙',
  己: '丙',
  乙: '戊',
  庚: '戊',
  丙: '庚',
  辛: '庚',
  丁: '壬',
  壬: '壬',
  戊: '甲',
  癸: '甲',
}

/**
 * 月柱干支 — 年干五虎遁 + 上一「节」定月支（2026-01-09：乙年 + 小寒 → 己丑）。
 */
export function monthPillar(yearStem: string, prevTermName: string): string | null {
  const jie = JIE_BRANCH[prevTermName] ? prevTermName : QI_TO_JIE[prevTermName]
  const branch = JIE_BRANCH[jie ?? '']
  if (!branch) return null
  const base = WUHU_DUN[yearStem]
  if (!base) return null
  const branchIdx = EARTHLY_BRANCHES.indexOf(branch as (typeof EARTHLY_BRANCHES)[number])
  const baseIdx = HEAVENLY_STEMS.indexOf(base as (typeof HEAVENLY_STEMS)[number])
  const stemIdx = (baseIdx + ((((branchIdx - 2) % 12) + 12) % 12)) % 10
  return `${HEAVENLY_STEMS[stemIdx]}${branch}`
}

/** 杨公忌日（十三日）— 正月十三、二月十一、三月初九、四月初七、五月初五、
 *  六月初三、七月初一、七月廿九、八月廿七、九月廿五、十月廿三、冬月廿一、
 *  腊月十九。参考页 2026-01-09（冬月廿一）即杨公忌日 ✓ */
const YANGGONG_DAYS: ReadonlyArray<readonly [number, number]> = [
  [1, 13],
  [2, 11],
  [3, 9],
  [4, 7],
  [5, 5],
  [6, 3],
  [7, 1],
  [7, 29],
  [8, 27],
  [9, 25],
  [10, 23],
  [11, 21],
  [12, 19],
]

export function isYangGongDay(lunarMonth: number, lunarDay: number): boolean {
  return YANGGONG_DAYS.some(([m, d]) => m === lunarMonth && d === lunarDay)
}
