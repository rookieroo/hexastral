/**
 * SynastryGlyph — the 合盘综合评价 imagery for a COMPLETED bond's list row.
 *
 * The 五行 verdict the report already computes (same as the ink centerpiece), drawn
 * as a tiny relational mark on the right of the row:
 *   相生 good → an upward "cup" (two stars nourishing each other)
 *   相克 hard → a cross (friction at the root)
 *   比和 peer → two parallels (same wavelength)
 *
 * Monochrome + quiet on purpose: the row HINTS the verdict, it never alarms — no
 * red-for-bad (carries the same non-alarmist stance as the 解缘 copy). A bond with
 * no reading yet ('plain') renders nothing; pending bonds show the clock instead.
 */

import Svg, { Path } from 'react-native-svg'
import type { BondQuality } from '@/lib/bondQuality'

export function SynastryGlyph({
  quality,
  size = 20,
  color = 'rgba(245,240,232,0.55)',
}: {
  quality: BondQuality
  size?: number
  color?: string
}) {
  const sw = 1.6
  const common = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const }

  if (quality === 'good') {
    // 相生 — an upward cup ◡: the two hold / lift each other.
    return (
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path d='M5 9 C 8 16.5, 16 16.5, 19 9' {...common} />
      </Svg>
    )
  }
  if (quality === 'hard') {
    // 相克 — a cross ✕: friction at the root.
    return (
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path d='M7.5 7.5 L 16.5 16.5' {...common} />
        <Path d='M16.5 7.5 L 7.5 16.5' {...common} />
      </Svg>
    )
  }
  if (quality === 'peer') {
    // 比和 — two parallels =: same wavelength.
    return (
      <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <Path d='M6 10 H 18' {...common} />
        <Path d='M6 14 H 18' {...common} />
      </Svg>
    )
  }
  // 'plain' — no reading / no verdict yet.
  return null
}
