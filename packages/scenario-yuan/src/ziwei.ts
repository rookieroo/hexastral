import 'intl-pluralrules/polyfill'

/**
 * Client-side 紫微斗数 命盘 compute — anonymous, offline, via the `iztro` lib
 * (the same engine svc-astro uses; see services/svc-astro/src/services/stellar/stellar.ts).
 * Ported from ming-pan-app/lib/ziwei.ts per ADR-0021 K1 / ADR-0022; iztro becomes
 * a kindred-app dependency (bundle weight tradeoff accepted in the ADR).
 *
 * timeIndex is the 0-11 shichen index (子=0 … 亥=11), which maps directly to
 * iztro's index (it treats 0 as 早子). True-solar-time correction is skipped in
 * v1 (server-only); the representative shichen is used.
 */

export interface ZiweiStar {
  name: string
  brightness: string
  mutagen: string
}

export interface ZiweiPalace {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace: boolean
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
}

export interface ZiweiChart {
  soul: string
  body: string
  fiveElementsClass: string
  palaces: ZiweiPalace[]
}

interface RawStar {
  name: string
  type?: string
  brightness?: string
  mutagen?: string
}
interface RawPalace {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace: boolean
  majorStars: RawStar[]
  minorStars: RawStar[]
}
interface RawAstrolabe {
  soul: string
  body: string
  fiveElementsClass: string
  palaces: RawPalace[]
}

function mapStar(s: RawStar): ZiweiStar {
  return { name: s.name, brightness: s.brightness ?? '', mutagen: s.mutagen ?? '' }
}

export function computeZiweiChart(input: {
  solarDate: string
  timeIndex: number
  gender: '男' | '女'
}): ZiweiChart {
  // Lazy: iztro pulls i18next; only load when 紫微 tab actually computes.
  const { astro } = require('iztro') as typeof import('iztro')
  const chart = astro.bySolar(
    input.solarDate,
    input.timeIndex,
    input.gender,
    true,
    'zh-CN'
  ) as unknown as RawAstrolabe

  return {
    soul: chart.soul,
    body: chart.body,
    fiveElementsClass: chart.fiveElementsClass,
    palaces: chart.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars.map(mapStar),
      minorStars: p.minorStars.map(mapStar),
    })),
  }
}
