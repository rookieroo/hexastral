/**
 * RedThreadGlyph — the 月老红线 (red thread of fate) mark for the Threads header.
 *
 * Two cinnabar strands woven into a loose braid that meets at the foot like a tie,
 * splaying open at the top — entwined, but not knotted shut (缘未定). Hand-authored
 * SVG paths (not an icon font), cinnabar to echo the YUEL moon. The visual answer to
 * "what is a thread": the invisible line drawn between two people.
 */

import Svg, { Path } from 'react-native-svg'

export function RedThreadGlyph({
  size = 20,
  color = '#C0392B',
}: {
  size?: number
  color?: string
}) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
      {/* strand one — bows right, then left */}
      <Path
        d='M10 3.5 C 14.6 7, 6 11, 10.6 14.6 C 13.6 17, 12 18.8, 12 20.5'
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap='round'
      />
      {/* strand two — the mirror, so the two cross twice into a braid */}
      <Path
        d='M14 3.5 C 9.4 7, 18 11, 13.4 14.6 C 10.4 17, 12 18.8, 12 20.5'
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap='round'
      />
    </Svg>
  )
}
