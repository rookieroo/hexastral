/**
 * Signature archetype dictionary — zh-Hant (Traditional Chinese).
 */

import type { SignatureDictionary } from '../../signature-types'

export const zhHant: SignatureDictionary = {
  dayMasterArchetype: {
    甲: '參天喬木',
    乙: '幽蘭藤蔓',
    丙: '烈日驕陽',
    丁: '燭光星火',
    戊: '高山厚土',
    己: '田園沃土',
    庚: '銳金利刃',
    辛: '珠玉精金',
    壬: '江河大水',
    癸: '雨露甘霖',
  },
  dayMasterByStrength: {
    丙: { 极强: '炎炎烈日', 极弱: '殘陽餘暉' },
    壬: { 极强: '滔天巨浪', 极弱: '潺潺細流' },
    甲: { 极强: '參天古木', 极弱: '弱柳扶風' },
    庚: { 极强: '寒鐵霜鋒', 极弱: '鈍金生苔' },
  },
  ziweiArchetype: {
    紫微: '帝座',
    天机: '智星',
    太阳: '日曜',
    武曲: '財將',
    天同: '福星',
    廉贞: '囚星',
    天府: '祿庫',
    太阴: '月華',
    贪狼: '欲星',
    巨门: '言樞',
    天相: '相輔',
    天梁: '壽蔭',
    七杀: '將星',
    破军: '衝鋒',
    空宫: '虛位',
  },
  tenGodArchetype: {
    比肩: '同儕',
    劫财: '奪銳',
    食神: '雅趣',
    伤官: '鋒芒',
    正财: '穩產',
    偏财: '機財',
    正官: '正軌',
    七杀: '殺刃',
    正印: '庇蔭',
    偏印: '偏鑑',
  },
}
