/**
 * @zhop/astro-core — 四化结构化 (Sì Huà / Four Transformations)
 *
 * 紫微斗数四化系统：化禄、化权、化科、化忌
 * 由天干决定哪四颗星曜分别获得四化
 *
 * 本模块将 iztro 裸字符串 mutagen 替换为结构化枚举，
 * 为 P2 双盘合参引擎提供机器可读输入。
 *
 * 四化类型:
 * - 化禄 (Huà Lù): 财运亨通、机遇增多
 * - 化权 (Huà Quán): 掌权、强势、执行力增强
 * - 化科 (Huà Kē): 贵人、名声、考试
 * - 化忌 (Huà Jì): 波折、执着、需克服的课题
 */

import type { HeavenlyStem } from './types'

/** 四化类型枚举 */
export type SiHuaType = '化禄' | '化权' | '化科' | '化忌'

/** 四化简称 */
export type SiHuaAbbr = '禄' | '权' | '科' | '忌'

/** 单颗星的四化信息 */
export interface StarSiHua {
  /** 星曜名称 */
  starName: string
  /** 四化类型 */
  type: SiHuaType
  /** 简称 */
  abbr: SiHuaAbbr
  /** 吉凶属性 */
  nature: 'auspicious' | 'inauspicious'
}

/** 某天干对应的完整四化组合 */
export interface SiHuaGroup {
  /** 所属天干 */
  stem: HeavenlyStem
  /** 化禄星 */
  lu: StarSiHua
  /** 化权星 */
  quan: StarSiHua
  /** 化科星 */
  ke: StarSiHua
  /** 化忌星 */
  ji: StarSiHua
  /** 全部四化列表 */
  all: readonly [StarSiHua, StarSiHua, StarSiHua, StarSiHua]
}

/** 四化简称映射 */
const SIHUA_ABBR: Record<SiHuaType, SiHuaAbbr> = {
  化禄: '禄',
  化权: '权',
  化科: '科',
  化忌: '忌',
}

/** 四化吉凶属性 */
const SIHUA_NATURE: Record<SiHuaType, 'auspicious' | 'inauspicious'> = {
  化禄: 'auspicious',
  化权: 'auspicious',
  化科: 'auspicious',
  化忌: 'inauspicious',
}

/**
 * 天干四化速查表 — [化禄, 化权, 化科, 化忌] 对应星曜
 *
 * 数据源: 《紫微斗数全书》标准四化表
 */
const SIHUA_TABLE: Record<HeavenlyStem, readonly [string, string, string, string]> = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
}

/** 四化类型数组（固定顺序） */
const SIHUA_TYPES: readonly SiHuaType[] = ['化禄', '化权', '化科', '化忌']

/**
 * 构建 StarSiHua 对象
 */
function makeStarSiHua(starName: string, type: SiHuaType): StarSiHua {
  return {
    starName,
    type,
    abbr: SIHUA_ABBR[type],
    nature: SIHUA_NATURE[type],
  }
}

/**
 * 获取指定天干的四化组合
 *
 * @param stem 天干（可用于年干、宫干、大限天干、流年天干）
 * @returns 结构化四化组合
 *
 * @example
 * ```ts
 * const sihua = getSiHua('甲')
 * // sihua.lu.starName === '廉贞'
 * // sihua.ji.starName === '太阳'
 * // sihua.all.map(s => `${s.starName}${s.abbr}`)
 * // → ['廉贞禄', '破军权', '武曲科', '太阳忌']
 * ```
 */
export function getSiHua(stem: HeavenlyStem): SiHuaGroup {
  const stars = SIHUA_TABLE[stem]
  const lu = makeStarSiHua(stars[0], '化禄')
  const quan = makeStarSiHua(stars[1], '化权')
  const ke = makeStarSiHua(stars[2], '化科')
  const ji = makeStarSiHua(stars[3], '化忌')

  return {
    stem,
    lu,
    quan,
    ke,
    ji,
    all: [lu, quan, ke, ji] as const,
  }
}

/**
 * 解析 iztro 裸字符串 mutagen 为结构化四化类型
 *
 * iztro 输出的 mutagen 字段可能是 "化禄"、"化权"、"化科"、"化忌" 或 ""
 *
 * @param raw iztro 的原始 mutagen 字符串
 * @returns 结构化四化类型，或 null（无四化/空字符串）
 */
export function parseMutagen(raw: string | undefined | null): SiHuaType | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (SIHUA_TYPES.includes(trimmed as SiHuaType)) {
    return trimmed as SiHuaType
  }
  return null
}

/**
 * 查找指定星曜在某天干下是否有四化
 *
 * @param starName 星曜名称
 * @param stem 天干
 * @returns 该星曜的四化信息，或 null
 */
export function findStarSiHua(starName: string, stem: HeavenlyStem): StarSiHua | null {
  const stars = SIHUA_TABLE[stem]
  const index = stars.indexOf(starName)
  if (index === -1) return null
  return makeStarSiHua(starName, SIHUA_TYPES[index]!)
}

/** 流年四化结果 — 将每颗四化星落入的宫位一起返回 */
export interface YearlySiHuaResult {
  /** 流年天干 */
  yearStem: HeavenlyStem
  /** 四化组合 */
  sihua: SiHuaGroup
  /** 四化落宫映射（starName → palaceName），需由调用方传入 */
  palaceMap?: Record<string, string>
}

/**
 * 计算流年四化
 *
 * @param year 公历年份（取年干）
 * @returns 流年四化结构
 */
export function getYearlySiHua(year: number): YearlySiHuaResult {
  const stemIndex = (year - 4) % 10
  const stems: readonly HeavenlyStem[] = [
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
  ]
  const yearStem = stems[stemIndex < 0 ? stemIndex + 10 : stemIndex]!

  return {
    yearStem,
    sihua: getSiHua(yearStem),
  }
}

/**
 * 批量标注宫位中的四化星
 *
 * 遍历所有宫位的星曜，标注其四化信息。
 * 替代 iztro 裸字符串 mutagen，返回结构化数据。
 *
 * @param palaces 宫位数组（需含 majorStars/minorStars.name）
 * @param stem 天干
 * @returns 四化标注映射 { starName: StarSiHua }
 */
export function annotateSiHua(
  palaces: ReadonlyArray<{
    majorStars: ReadonlyArray<{ name: string }>
    minorStars: ReadonlyArray<{ name: string }>
  }>,
  stem: HeavenlyStem
): Map<string, StarSiHua> {
  const sihua = getSiHua(stem)
  const map = new Map<string, StarSiHua>()

  for (const s of sihua.all) {
    map.set(s.starName, s)
  }

  return map
}
