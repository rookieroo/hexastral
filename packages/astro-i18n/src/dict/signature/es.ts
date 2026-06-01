/**
 * Signature archetype dictionary — es.
 */

import type { SignatureDictionary } from '../../signature-types'

export const es: SignatureDictionary = {
  dayMasterArchetype: {
    甲: 'Roble Alto',
    乙: 'Vid Trepadora',
    丙: 'Sol Ardiente',
    丁: 'Llama de Vela',
    戊: 'Cordillera',
    己: 'Tierra Fértil',
    庚: 'Hoja Forjada',
    辛: 'Joya Pulida',
    壬: 'Río Caudaloso',
    癸: 'Rocío del Alba',
  },
  dayMasterByStrength: {
    丙: { 极强: 'Sol Abrasador', 极弱: 'Sol Poniente' },
    壬: { 极强: 'Marea Alta', 极弱: 'Arroyo Tranquilo' },
    甲: { 极强: 'Roble Ancestral', 极弱: 'Sauce Frágil' },
    庚: { 极强: 'Filo de Hielo', 极弱: 'Hierro Oxidado' },
  },
  ziweiArchetype: {
    紫微: 'Estrella Imperial',
    天机: 'Estratega',
    太阳: 'Portador del Sol',
    武曲: 'Tesorero de Guerra',
    天同: 'Sereno',
    廉贞: 'León Enjaulado',
    天府: 'Tesoro',
    太阴: 'Caminante Lunar',
    贪狼: 'Buscador',
    巨门: 'Voz',
    天相: 'Consejero',
    天梁: 'Pino Anciano',
    七杀: 'Vanguardia',
    破军: 'Rompedor',
    空宫: 'Cielo Abierto',
  },
  tenGodArchetype: {
    比肩: 'Par',
    劫财: 'Rival',
    食神: 'Musa',
    伤官: 'Filo',
    正财: 'Ingreso Estable',
    偏财: 'Golpe de Suerte',
    正官: 'Cargo',
    七杀: 'Espada',
    正印: 'Refugio',
    偏印: 'Espejo Solitario',
  },
}
