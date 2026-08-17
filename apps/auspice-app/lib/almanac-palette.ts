/**
 * Almanac paper palettes — classic (通书绿/红 for zh · Zinc for en/ja) vs contrast.
 */

import type { AlmanacThemeId } from './almanac-theme'

export type AlmanacPalette = {
  bg: string
  card: string
  ink: string
  dim: string
  line: string
  gold: string
  brown: string
  seal: string
  goldSoft: string
}

function isZhLocale(locale?: string): boolean {
  return !locale || locale.startsWith('zh')
}

/** @param weekday JS getDay(): 0 Sun … 6 Sat — zh classic uses green weekdays / red weekends. */
export function almanacPalette(
  isDark: boolean,
  theme: AlmanacThemeId,
  weekday: number = new Date().getDay(),
  locale?: string
): AlmanacPalette {
  if (theme === 'classic') {
    // en/ja: restrained Zinc — same layout, no 通书 green/red.
    if (!isZhLocale(locale)) {
      return isDark
        ? {
            bg: '#18181b',
            card: '#27272a',
            ink: '#e4e4e7',
            dim: '#a1a1aa',
            line: '#3f3f46',
            gold: '#e4e4e7',
            brown: '#e4e4e7',
            seal: '#e4e4e7',
            goldSoft: 'rgba(228,228,231,0.1)',
          }
        : {
            bg: '#fafafa',
            card: '#ffffff',
            ink: '#3f3f46',
            dim: '#71717a',
            line: '#d4d4d8',
            gold: '#3f3f46',
            brown: '#3f3f46',
            seal: '#3f3f46',
            goldSoft: 'rgba(63,63,70,0.08)',
          }
    }

    // zh: newsprint + weekday forest green / weekend vermillion.
    // Dark paper is warm charcoal (lamp-on-newsprint), not swamp green.
    const weekend = weekday === 0 || weekday === 6
    if (isDark) {
      const ink = weekend ? '#d98a7c' : '#8fb89a'
      return {
        bg: '#161412',
        card: '#1e1b18',
        ink,
        dim: weekend ? '#b07870' : '#7a9a84',
        line: '#3a3632',
        gold: ink,
        brown: ink,
        seal: ink,
        goldSoft: 'rgba(232, 220, 200, 0.08)',
      }
    }
    const ink = weekend ? '#c23a2e' : '#2a6b42'
    return {
      bg: '#f7f5ef',
      card: '#ffffff',
      ink,
      dim: weekend ? '#a35a52' : '#4f7a5c',
      line: weekend ? '#e0c4c0' : '#c5d9cc',
      gold: ink,
      brown: ink,
      seal: ink,
      goldSoft: weekend ? 'rgba(194,58,46,0.08)' : 'rgba(42,107,66,0.08)',
    }
  }

  // contrast — current high-contrast ink/gold
  return isDark
    ? {
        bg: '#171310',
        card: '#221b15',
        ink: '#e9ddc8',
        dim: '#9c8d78',
        line: '#3c3329',
        gold: '#d9b36a',
        brown: '#cdbba7',
        seal: '#c96b5f',
        goldSoft: 'rgba(217,179,106,0.14)',
      }
    : {
        bg: '#f6f1e6',
        card: '#fffdf7',
        ink: '#2b2118',
        dim: '#8a7f70',
        line: '#e3d9c6',
        gold: '#9a6b1f',
        brown: '#4a3324',
        seal: '#a8342a',
        goldSoft: '#f1e6cf',
      }
}

/**
 * 于你判语手绘圈：凶用朱砂，吉用墨，平用赭。不跟通书绿/周末红走。
 */
export function verdictCircleColor(glyph: string, isDark: boolean): string {
  if (glyph === '凶') return isDark ? '#e05645' : '#c23a2e'
  if (glyph === '吉') return isDark ? '#d8d0c6' : '#2c2824'
  return isDark ? '#d2c0a4' : '#7a6a52'
}

/** Weekday index from YYYY-MM-DD in local civil calendar. */
export function weekdayFromIso(iso: string): number {
  const parts = iso.split('-').map(Number)
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(y, m - 1, d).getDay()
}
