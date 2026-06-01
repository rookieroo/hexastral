/**
 * @zhop/astro-core — 六十四卦纳甲表
 *
 * 每卦包含: 宫位、六爻纳甲干支、世应爻位。
 * 数据按八宫排列（乾/坎/艮/震/巽/离/坤/兑），每宫八卦。
 *
 * 纳甲规则:
 * - 乾纳甲壬, 坤纳乙癸, 震纳庚, 巽纳辛, 坎纳戊, 离纳己, 艮纳丙, 兑纳丁
 * - 内卦(1-3爻)纳甲/乙/戊/己/庚/辛/丙/丁
 * - 外卦(4-6爻)纳壬/癸/戊/己/庚/辛/丙/丁
 *
 * 索引: 二进制编码 [初爻..上爻], 阳=1, 阴=0
 * 如 乾为天: 111111 = 63, 坤为地: 000000 = 0
 */

import type { NaJiaHexagramData, PalaceName } from './types'

/**
 * 八宫六十四卦纳甲查找表
 *
 * key: 卦名
 * value: { palace, naJia[6], shiLine, yingLine }
 *
 * naJia 数组: [初爻, 二爻, 三爻, 四爻, 五爻, 上爻]
 */
export const NAJIA_TABLE: Record<string, NaJiaHexagramData> = {
  // ==================== 乾宫八卦 ====================
  // 乾纳甲(内卦): 甲子/甲寅/甲辰
  // 乾纳壬(外卦): 壬午/壬申/壬戌
  乾为天: {
    name: '乾为天',
    palace: '乾',
    naJia: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
    shiLine: 6,
    yingLine: 3,
  },
  天风姤: {
    name: '天风姤',
    palace: '乾',
    naJia: ['辛丑', '辛亥', '辛酉', '壬午', '壬申', '壬戌'],
    shiLine: 1,
    yingLine: 4,
  },
  天山遁: {
    name: '天山遁',
    palace: '乾',
    naJia: ['丙辰', '丙午', '丙申', '壬午', '壬申', '壬戌'],
    shiLine: 2,
    yingLine: 5,
  },
  天地否: {
    name: '天地否',
    palace: '乾',
    naJia: ['乙未', '乙巳', '乙卯', '壬午', '壬申', '壬戌'],
    shiLine: 3,
    yingLine: 6,
  },
  风地观: {
    name: '风地观',
    palace: '乾',
    naJia: ['乙未', '乙巳', '乙卯', '辛酉', '辛亥', '辛丑'],
    shiLine: 4,
    yingLine: 1,
  },
  山地剥: {
    name: '山地剥',
    palace: '乾',
    naJia: ['乙未', '乙巳', '乙卯', '丙申', '丙午', '丙辰'],
    shiLine: 5,
    yingLine: 2,
  },
  火地晋: {
    name: '火地晋',
    palace: '乾',
    naJia: ['乙未', '乙巳', '乙卯', '己巳', '己未', '己酉'],
    shiLine: 4,
    yingLine: 1,
  },
  火天大有: {
    name: '火天大有',
    palace: '乾',
    naJia: ['甲子', '甲寅', '甲辰', '己巳', '己未', '己酉'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 坎宫八卦 ====================
  // 坎纳戊(内外卦均用戊)
  坎为水: {
    name: '坎为水',
    palace: '坎',
    naJia: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
    shiLine: 6,
    yingLine: 3,
  },
  水泽节: {
    name: '水泽节',
    palace: '坎',
    naJia: ['丁巳', '丁卯', '丁丑', '戊申', '戊戌', '戊子'],
    shiLine: 1,
    yingLine: 4,
  },
  水雷屯: {
    name: '水雷屯',
    palace: '坎',
    naJia: ['庚子', '庚寅', '庚辰', '戊申', '戊戌', '戊子'],
    shiLine: 2,
    yingLine: 5,
  },
  水火既济: {
    name: '水火既济',
    palace: '坎',
    naJia: ['己卯', '己丑', '己亥', '戊申', '戊戌', '戊子'],
    shiLine: 3,
    yingLine: 6,
  },
  泽火革: {
    name: '泽火革',
    palace: '坎',
    naJia: ['己卯', '己丑', '己亥', '丁丑', '丁卯', '丁巳'],
    shiLine: 4,
    yingLine: 1,
  },
  雷火丰: {
    name: '雷火丰',
    palace: '坎',
    naJia: ['己卯', '己丑', '己亥', '庚辰', '庚寅', '庚子'],
    shiLine: 5,
    yingLine: 2,
  },
  地火明夷: {
    name: '地火明夷',
    palace: '坎',
    naJia: ['己卯', '己丑', '己亥', '癸酉', '癸亥', '癸丑'],
    shiLine: 4,
    yingLine: 1,
  },
  地水师: {
    name: '地水师',
    palace: '坎',
    naJia: ['戊寅', '戊辰', '戊午', '癸酉', '癸亥', '癸丑'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 艮宫八卦 ====================
  // 艮纳丙(内外卦均用丙)
  艮为山: {
    name: '艮为山',
    palace: '艮',
    naJia: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
    shiLine: 6,
    yingLine: 3,
  },
  山火贲: {
    name: '山火贲',
    palace: '艮',
    naJia: ['己卯', '己丑', '己亥', '丙戌', '丙子', '丙寅'],
    shiLine: 1,
    yingLine: 4,
  },
  山天大畜: {
    name: '山天大畜',
    palace: '艮',
    naJia: ['甲子', '甲寅', '甲辰', '丙戌', '丙子', '丙寅'],
    shiLine: 2,
    yingLine: 5,
  },
  山泽损: {
    name: '山泽损',
    palace: '艮',
    naJia: ['丁巳', '丁卯', '丁丑', '丙戌', '丙子', '丙寅'],
    shiLine: 3,
    yingLine: 6,
  },
  火泽睽: {
    name: '火泽睽',
    palace: '艮',
    naJia: ['丁巳', '丁卯', '丁丑', '己巳', '己未', '己酉'],
    shiLine: 4,
    yingLine: 1,
  },
  天泽履: {
    name: '天泽履',
    palace: '艮',
    naJia: ['丁巳', '丁卯', '丁丑', '壬午', '壬申', '壬戌'],
    shiLine: 5,
    yingLine: 2,
  },
  风泽中孚: {
    name: '风泽中孚',
    palace: '艮',
    naJia: ['丁巳', '丁卯', '丁丑', '辛酉', '辛亥', '辛丑'],
    shiLine: 4,
    yingLine: 1,
  },
  风山渐: {
    name: '风山渐',
    palace: '艮',
    naJia: ['丙辰', '丙午', '丙申', '辛酉', '辛亥', '辛丑'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 震宫八卦 ====================
  // 震纳庚(内外卦均用庚)
  震为雷: {
    name: '震为雷',
    palace: '震',
    naJia: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
    shiLine: 6,
    yingLine: 3,
  },
  雷地豫: {
    name: '雷地豫',
    palace: '震',
    naJia: ['乙未', '乙巳', '乙卯', '庚午', '庚申', '庚戌'],
    shiLine: 1,
    yingLine: 4,
  },
  雷水解: {
    name: '雷水解',
    palace: '震',
    naJia: ['戊寅', '戊辰', '戊午', '庚午', '庚申', '庚戌'],
    shiLine: 2,
    yingLine: 5,
  },
  雷风恒: {
    name: '雷风恒',
    palace: '震',
    naJia: ['辛丑', '辛亥', '辛酉', '庚午', '庚申', '庚戌'],
    shiLine: 3,
    yingLine: 6,
  },
  地风升: {
    name: '地风升',
    palace: '震',
    naJia: ['辛丑', '辛亥', '辛酉', '癸酉', '癸亥', '癸丑'],
    shiLine: 4,
    yingLine: 1,
  },
  水风井: {
    name: '水风井',
    palace: '震',
    naJia: ['辛丑', '辛亥', '辛酉', '戊申', '戊戌', '戊子'],
    shiLine: 5,
    yingLine: 2,
  },
  泽风大过: {
    name: '泽风大过',
    palace: '震',
    naJia: ['辛丑', '辛亥', '辛酉', '丁丑', '丁卯', '丁巳'],
    shiLine: 4,
    yingLine: 1,
  },
  泽雷随: {
    name: '泽雷随',
    palace: '震',
    naJia: ['庚子', '庚寅', '庚辰', '丁丑', '丁卯', '丁巳'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 巽宫八卦 ====================
  // 巽纳辛(内外卦均用辛)
  巽为风: {
    name: '巽为风',
    palace: '巽',
    naJia: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
    shiLine: 6,
    yingLine: 3,
  },
  风天小畜: {
    name: '风天小畜',
    palace: '巽',
    naJia: ['甲子', '甲寅', '甲辰', '辛未', '辛巳', '辛卯'],
    shiLine: 1,
    yingLine: 4,
  },
  风火家人: {
    name: '风火家人',
    palace: '巽',
    naJia: ['己卯', '己丑', '己亥', '辛未', '辛巳', '辛卯'],
    shiLine: 2,
    yingLine: 5,
  },
  风雷益: {
    name: '风雷益',
    palace: '巽',
    naJia: ['庚子', '庚寅', '庚辰', '辛未', '辛巳', '辛卯'],
    shiLine: 3,
    yingLine: 6,
  },
  天雷无妄: {
    name: '天雷无妄',
    palace: '巽',
    naJia: ['庚子', '庚寅', '庚辰', '壬午', '壬申', '壬戌'],
    shiLine: 4,
    yingLine: 1,
  },
  火雷噬嗑: {
    name: '火雷噬嗑',
    palace: '巽',
    naJia: ['庚子', '庚寅', '庚辰', '己巳', '己未', '己酉'],
    shiLine: 5,
    yingLine: 2,
  },
  山雷颐: {
    name: '山雷颐',
    palace: '巽',
    naJia: ['庚子', '庚寅', '庚辰', '丙戌', '丙子', '丙寅'],
    shiLine: 4,
    yingLine: 1,
  },
  山风蛊: {
    name: '山风蛊',
    palace: '巽',
    naJia: ['辛丑', '辛亥', '辛酉', '丙戌', '丙子', '丙寅'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 离宫八卦 ====================
  // 离纳己(内外卦均用己)
  离为火: {
    name: '离为火',
    palace: '离',
    naJia: ['己卯', '己丑', '己亥', '己巳', '己未', '己酉'],
    shiLine: 6,
    yingLine: 3,
  },
  火山旅: {
    name: '火山旅',
    palace: '离',
    naJia: ['丙辰', '丙午', '丙申', '己巳', '己未', '己酉'],
    shiLine: 1,
    yingLine: 4,
  },
  火风鼎: {
    name: '火风鼎',
    palace: '离',
    naJia: ['辛丑', '辛亥', '辛酉', '己巳', '己未', '己酉'],
    shiLine: 2,
    yingLine: 5,
  },
  火水未济: {
    name: '火水未济',
    palace: '离',
    naJia: ['戊寅', '戊辰', '戊午', '己巳', '己未', '己酉'],
    shiLine: 3,
    yingLine: 6,
  },
  山水蒙: {
    name: '山水蒙',
    palace: '离',
    naJia: ['戊寅', '戊辰', '戊午', '丙戌', '丙子', '丙寅'],
    shiLine: 4,
    yingLine: 1,
  },
  风水涣: {
    name: '风水涣',
    palace: '离',
    naJia: ['戊寅', '戊辰', '戊午', '辛酉', '辛亥', '辛丑'],
    shiLine: 5,
    yingLine: 2,
  },
  天水讼: {
    name: '天水讼',
    palace: '离',
    naJia: ['戊寅', '戊辰', '戊午', '壬午', '壬申', '壬戌'],
    shiLine: 4,
    yingLine: 1,
  },
  天火同人: {
    name: '天火同人',
    palace: '离',
    naJia: ['己卯', '己丑', '己亥', '壬午', '壬申', '壬戌'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 坤宫八卦 ====================
  // 坤纳乙(内卦)/癸(外卦)
  坤为地: {
    name: '坤为地',
    palace: '坤',
    naJia: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
    shiLine: 6,
    yingLine: 3,
  },
  地雷复: {
    name: '地雷复',
    palace: '坤',
    naJia: ['庚子', '庚寅', '庚辰', '癸丑', '癸亥', '癸酉'],
    shiLine: 1,
    yingLine: 4,
  },
  地泽临: {
    name: '地泽临',
    palace: '坤',
    naJia: ['丁巳', '丁卯', '丁丑', '癸丑', '癸亥', '癸酉'],
    shiLine: 2,
    yingLine: 5,
  },
  地天泰: {
    name: '地天泰',
    palace: '坤',
    naJia: ['甲子', '甲寅', '甲辰', '癸丑', '癸亥', '癸酉'],
    shiLine: 3,
    yingLine: 6,
  },
  雷天大壮: {
    name: '雷天大壮',
    palace: '坤',
    naJia: ['甲子', '甲寅', '甲辰', '庚午', '庚申', '庚戌'],
    shiLine: 4,
    yingLine: 1,
  },
  泽天夬: {
    name: '泽天夬',
    palace: '坤',
    naJia: ['甲子', '甲寅', '甲辰', '丁丑', '丁卯', '丁巳'],
    shiLine: 5,
    yingLine: 2,
  },
  水天需: {
    name: '水天需',
    palace: '坤',
    naJia: ['甲子', '甲寅', '甲辰', '戊申', '戊戌', '戊子'],
    shiLine: 4,
    yingLine: 1,
  },
  水地比: {
    name: '水地比',
    palace: '坤',
    naJia: ['乙未', '乙巳', '乙卯', '戊申', '戊戌', '戊子'],
    shiLine: 3,
    yingLine: 6,
  },

  // ==================== 兑宫八卦 ====================
  // 兑纳丁(内外卦均用丁)
  兑为泽: {
    name: '兑为泽',
    palace: '兑',
    naJia: ['丁巳', '丁卯', '丁丑', '丁未', '丁酉', '丁亥'],
    shiLine: 6,
    yingLine: 3,
  },
  泽水困: {
    name: '泽水困',
    palace: '兑',
    naJia: ['戊寅', '戊辰', '戊午', '丁未', '丁酉', '丁亥'],
    shiLine: 1,
    yingLine: 4,
  },
  泽地萃: {
    name: '泽地萃',
    palace: '兑',
    naJia: ['乙未', '乙巳', '乙卯', '丁未', '丁酉', '丁亥'],
    shiLine: 2,
    yingLine: 5,
  },
  泽山咸: {
    name: '泽山咸',
    palace: '兑',
    naJia: ['丙辰', '丙午', '丙申', '丁未', '丁酉', '丁亥'],
    shiLine: 3,
    yingLine: 6,
  },
  水山蹇: {
    name: '水山蹇',
    palace: '兑',
    naJia: ['丙辰', '丙午', '丙申', '戊申', '戊戌', '戊子'],
    shiLine: 4,
    yingLine: 1,
  },
  地山谦: {
    name: '地山谦',
    palace: '兑',
    naJia: ['丙辰', '丙午', '丙申', '癸酉', '癸亥', '癸丑'],
    shiLine: 5,
    yingLine: 2,
  },
  雷山小过: {
    name: '雷山小过',
    palace: '兑',
    naJia: ['丙辰', '丙午', '丙申', '庚午', '庚申', '庚戌'],
    shiLine: 4,
    yingLine: 1,
  },
  雷泽归妹: {
    name: '雷泽归妹',
    palace: '兑',
    naJia: ['丁巳', '丁卯', '丁丑', '庚午', '庚申', '庚戌'],
    shiLine: 3,
    yingLine: 6,
  },
}

// Note: Binary encoding is ambiguous for hexagram lookup (multiple hexagrams share
// the same 6-bit code). Use TRIGRAM_PAIR_TO_HEXAGRAM via lookupHexagram() which is
// always unambiguous (upper+lower trigram pair → unique hexagram name).

/**
 * 上下卦pair → 卦名查找表
 * key: `${upperTrigram}-${lowerTrigram}` (Chinese names)
 */
export const TRIGRAM_PAIR_TO_HEXAGRAM: Record<string, string> = {
  '乾-乾': '乾为天',
  '乾-巽': '天风姤',
  '乾-艮': '天山遁',
  '乾-坤': '天地否',
  '巽-坤': '风地观',
  '艮-坤': '山地剥',
  '离-坤': '火地晋',
  '离-乾': '火天大有',

  '坎-坎': '坎为水',
  '坎-兑': '水泽节',
  '坎-震': '水雷屯',
  '坎-离': '水火既济',
  '兑-离': '泽火革',
  '震-离': '雷火丰',
  '坤-离': '地火明夷',
  '坤-坎': '地水师',

  '艮-艮': '艮为山',
  '艮-离': '山火贲',
  '艮-乾': '山天大畜',
  '艮-兑': '山泽损',
  '离-兑': '火泽睽',
  '乾-兑': '天泽履',
  '巽-兑': '风泽中孚',
  '巽-艮': '风山渐',

  '震-震': '震为雷',
  '震-坤': '雷地豫',
  '震-坎': '雷水解',
  '震-巽': '雷风恒',
  '坤-巽': '地风升',
  '坎-巽': '水风井',
  '兑-巽': '泽风大过',
  '兑-震': '泽雷随',

  '巽-巽': '巽为风',
  '巽-乾': '风天小畜',
  '巽-离': '风火家人',
  '巽-震': '风雷益',
  '乾-震': '天雷无妄',
  '离-震': '火雷噬嗑',
  '艮-震': '山雷颐',
  '艮-巽': '山风蛊',

  '离-离': '离为火',
  '离-艮': '火山旅',
  '离-巽': '火风鼎',
  '离-坎': '火水未济',
  '艮-坎': '山水蒙',
  '巽-坎': '风水涣',
  '乾-坎': '天水讼',
  '乾-离': '天火同人',

  '坤-坤': '坤为地',
  '坤-震': '地雷复',
  '坤-兑': '地泽临',
  '坤-乾': '地天泰',
  '震-乾': '雷天大壮',
  '兑-乾': '泽天夬',
  '坎-乾': '水天需',
  '坎-坤': '水地比',

  '兑-兑': '兑为泽',
  '兑-坎': '泽水困',
  '兑-坤': '泽地萃',
  '兑-艮': '泽山咸',
  '坎-艮': '水山蹇',
  '坤-艮': '地山谦',
  '震-艮': '雷山小过',
  '震-兑': '雷泽归妹',
}

/**
 * 三爻线条(bottom-to-top) → 卦名
 *
 * 三爻以数组表示 [bottom, mid, top], 1=阳, 0=阴
 */
export const LINES_TO_TRIGRAM: Record<string, string> = {
  '1,1,1': '乾', // ☰ yang yang yang
  '1,1,0': '兑', // ☱ yang yang yin
  '1,0,1': '离', // ☲ yang yin yang
  '1,0,0': '震', // ☳ yang yin yin
  '0,1,1': '巽', // ☴ yin yang yang
  '0,1,0': '坎', // ☵ yin yang yin
  '0,0,1': '艮', // ☶ yin yin yang
  '0,0,0': '坤', // ☷ yin yin yin
}
