/**
 * Signature archetype dictionary — zh (Simplified Chinese, canonical).
 *
 * All non-zh locale dictionaries share the same key shape; missing keys MUST
 * fall back to this canonical source. Hand-curated — never machine-translate.
 */

import type { SignatureDictionary } from '../../signature-types'

export const zh: SignatureDictionary = {
  dayMasterArchetype: {
    甲: '参天乔木',
    乙: '幽兰藤蔓',
    丙: '烈日骄阳',
    丁: '烛光星火',
    戊: '高山厚土',
    己: '田园沃土',
    庚: '锐金利刃',
    辛: '珠玉精金',
    壬: '江河大水',
    癸: '雨露甘霖',
  },
  dayMasterByStrength: {
    丙: { 极强: '炎炎烈日', 极弱: '残阳余晖' },
    壬: { 极强: '滔天巨浪', 极弱: '潺潺细流' },
    甲: { 极强: '参天古木', 极弱: '弱柳扶风' },
    庚: { 极强: '寒铁霜锋', 极弱: '钝金生苔' },
  },
  ziweiArchetype: {
    紫微: '帝座',
    天机: '智星',
    太阳: '日曜',
    武曲: '财将',
    天同: '福星',
    廉贞: '囚星',
    天府: '禄库',
    太阴: '月华',
    贪狼: '欲星',
    巨门: '言枢',
    天相: '相辅',
    天梁: '寿荫',
    七杀: '将星',
    破军: '冲锋',
    空宫: '虚位',
  },
  tenGodArchetype: {
    比肩: '同侪',
    劫财: '夺锐',
    食神: '雅趣',
    伤官: '锋芒',
    正财: '稳产',
    偏财: '机财',
    正官: '正轨',
    七杀: '杀刃',
    正印: '庇荫',
    偏印: '偏鉴',
  },
}
