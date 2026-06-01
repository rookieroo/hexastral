/**
 * Signature archetype dictionary — de.
 */

import type { SignatureDictionary } from '../../signature-types'

export const de: SignatureDictionary = {
  dayMasterArchetype: {
    甲: 'Hohe Eiche',
    乙: 'Rankende Rebe',
    丙: 'Lodernde Sonne',
    丁: 'Kerzenflamme',
    戊: 'Bergrücken',
    己: 'Fruchtbarer Acker',
    庚: 'Geschmiedete Klinge',
    辛: 'Geschliffener Edelstein',
    壬: 'Strömender Fluss',
    癸: 'Morgentau',
  },
  dayMasterByStrength: {
    丙: { 极强: 'Brennende Sonne', 极弱: 'Untergehende Sonne' },
    壬: { 极强: 'Flutwelle', 极弱: 'Stiller Bach' },
    甲: { 极强: 'Uralte Eiche', 极弱: 'Biegsame Weide' },
    庚: { 极强: 'Eisige Klinge', 极弱: 'Verwittertes Eisen' },
  },
  ziweiArchetype: {
    紫微: 'Kaiserstern',
    天机: 'Stratege',
    太阳: 'Sonnenträger',
    武曲: 'Kriegsschatz',
    天同: 'Sanftmut',
    廉贞: 'Käfiglöwe',
    天府: 'Schatzkammer',
    太阴: 'Mondgänger',
    贪狼: 'Suchender',
    巨门: 'Stimme',
    天相: 'Berater',
    天梁: 'Alte Kiefer',
    七杀: 'Vorhut',
    破军: 'Brecher',
    空宫: 'Offener Himmel',
  },
  tenGodArchetype: {
    比肩: 'Gleichgestellter',
    劫财: 'Rivale',
    食神: 'Muse',
    伤官: 'Schneide',
    正财: 'Stetiger Ertrag',
    偏财: 'Glücksfang',
    正官: 'Amt',
    七杀: 'Schwert',
    正印: 'Schutz',
    偏印: 'Einsamer Spiegel',
  },
}
