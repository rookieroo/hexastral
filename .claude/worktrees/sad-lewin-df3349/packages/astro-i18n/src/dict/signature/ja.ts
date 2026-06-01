/**
 * Signature archetype dictionary — ja.
 */

import type { SignatureDictionary } from '../../signature-types'

export const ja: SignatureDictionary = {
  dayMasterArchetype: {
    甲: '巨木',
    乙: '蔓花',
    丙: '太陽',
    丁: '灯火',
    戊: '山岳',
    己: '田土',
    庚: '剣鋒',
    辛: '宝玉',
    壬: '大河',
    癸: '甘露',
  },
  dayMasterByStrength: {
    丙: { 极强: '炎陽', 极弱: '残照' },
    壬: { 极强: '怒涛', 极弱: '細流' },
    甲: { 极强: '古木', 极弱: '弱柳' },
    庚: { 极强: '霜刃', 极弱: '苔金' },
  },
  ziweiArchetype: {
    紫微: '帝座',
    天机: '智星',
    太阳: '日輝',
    武曲: '財将',
    天同: '福星',
    廉贞: '囚星',
    天府: '禄庫',
    太阴: '月華',
    贪狼: '欲星',
    巨门: '言枢',
    天相: '相補',
    天梁: '寿蔭',
    七杀: '将星',
    破军: '突破',
    空宫: '虚位',
  },
  tenGodArchetype: {
    比肩: '同僚',
    劫财: '競争',
    食神: '雅趣',
    伤官: '鋒芒',
    正财: '安産',
    偏财: '機財',
    正官: '正道',
    七杀: '刃',
    正印: '庇護',
    偏印: '独鑑',
  },
}
