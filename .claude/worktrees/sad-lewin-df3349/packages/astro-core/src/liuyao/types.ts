/**
 * @zhop/astro-core — 纳甲六爻装卦引擎 类型定义
 *
 * 核心数据结构参照 PRD §5.1
 */

import type { EarthlyBranch, HeavenlyStem, WuXing } from '../types'

/** 六亲 */
export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼'

/** 六神 */
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武'

/** 旺相休囚死 */
export type WangXiu = '旺' | '相' | '休' | '囚' | '死'

/** 爻位索引 (初爻=1, 上爻=6) */
export type YaoIndex = 1 | 2 | 3 | 4 | 5 | 6

/** 爻值: 6=老阴(变), 7=少阳, 8=少阴, 9=老阳(变) */
export type YaoValue = 6 | 7 | 8 | 9

/** 单爻完整信息 */
export interface YaoLine {
  /** 爻位（初爻=1 到 上爻=6） */
  index: YaoIndex
  /** 纳甲干支（如 "壬午"） */
  ganZhi: string
  /** 天干 */
  stem: HeavenlyStem
  /** 地支 */
  branch: EarthlyBranch
  /** 五行 */
  wuXing: WuXing
  /** 六亲 */
  liuQin: LiuQin
  /** 六神 */
  liuShen: LiuShen
  /** 是否变爻 */
  isChanging: boolean
  /** 是否世爻 */
  isShiYao: boolean
  /** 是否应爻 */
  isYingYao: boolean
  /** 旺相休囚死（根据月令） */
  wangXiu: WangXiu
  /** 是否空亡（旬空） */
  isEmpty: boolean
}

/** 八宫名称 */
export type PalaceName = '乾' | '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑'

/** 纳甲卦数据 (查表) */
export interface NaJiaHexagramData {
  /** 卦名 */
  name: string
  /** 所属宫 */
  palace: PalaceName
  /** 六爻纳甲干支, index 0=初爻, 5=上爻 */
  naJia: readonly [string, string, string, string, string, string]
  /** 世爻位 (1-6) */
  shiLine: YaoIndex
  /** 应爻位 (1-6) */
  yingLine: YaoIndex
}

/** 完整装卦结果 */
export interface FullHexagram {
  /** 本卦名称 */
  name: string
  /** 所属宫 */
  palace: PalaceName
  /** 六爻完整信息 */
  lines: YaoLine[]
  /** 动爻列表 */
  changingLines: YaoLine[]
  /** 变卦（如有动爻） */
  derivedHexagram?: {
    name: string
    palace: PalaceName
    lines: YaoLine[]
  }
  /** 互卦（2-5爻组成） */
  nuclearHexagram?: {
    name: string
  }
  /** 世爻位 (1-6) */
  shiLine: YaoIndex
  /** 应爻位 (1-6) */
  yingLine: YaoIndex
  /** 日干 (用于六神) */
  dayStem: HeavenlyStem
  /** 月建地支 (用于旺衰) */
  monthBranch: EarthlyBranch
  /** 日支 (用于旬空) */
  dayBranch: EarthlyBranch
}
