/**
 * Signature archetype dictionary — en.
 */

import type { SignatureDictionary } from '../../signature-types'

export const en: SignatureDictionary = {
  dayMasterArchetype: {
    甲: 'Towering Oak',
    乙: 'Climbing Vine',
    丙: 'Blazing Sun',
    丁: 'Candle Flame',
    戊: 'Mountain Ridge',
    己: 'Tilled Soil',
    庚: 'Forged Blade',
    辛: 'Polished Jewel',
    壬: 'Surging River',
    癸: 'Morning Dew',
  },
  dayMasterByStrength: {
    丙: { 极强: 'Scorching Sun', 极弱: 'Setting Sun' },
    壬: { 极强: 'Tidal Wave', 极弱: 'Quiet Brook' },
    甲: { 极强: 'Ancient Oak', 极弱: 'Bending Willow' },
    庚: { 极强: 'Ice-Tempered Edge', 极弱: 'Moss-Worn Iron' },
  },
  ziweiArchetype: {
    紫微: 'Empire Star',
    天机: 'Strategist',
    太阳: 'Sun Bearer',
    武曲: 'War Banker',
    天同: 'Easeful',
    廉贞: 'Caged Lion',
    天府: 'Treasury',
    太阴: 'Moon Walker',
    贪狼: 'Seeker',
    巨门: 'Voice',
    天相: 'Counselor',
    天梁: 'Elder Pine',
    七杀: 'Vanguard',
    破军: 'Breaker',
    空宫: 'Open Sky',
  },
  tenGodArchetype: {
    比肩: 'Peer',
    劫财: 'Rival',
    食神: 'Muse',
    伤官: 'Blade',
    正财: 'Steady Yield',
    偏财: 'Wild Catch',
    正官: 'Office',
    七杀: 'Sword',
    正印: 'Shelter',
    偏印: 'Lone Mirror',
  },
}
