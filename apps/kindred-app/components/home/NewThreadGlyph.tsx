/**
 * NewThreadGlyph — the "tie a new thread" mark for the home's add-bond button.
 *
 * A "+" drawn as two crossing 红线 strands (gently S-curved, not straight): it
 * reads as "add" yet stays on-theme with the 月老红线 motif, and is distinct from
 * the braided RedThreadGlyph in the Threads header. Hand-authored SVG, cinnabar.
 */

import Svg, { Path } from 'react-native-svg'

export function NewThreadGlyph({
  size = 18,
  color = '#C0392B',
}: {
  size?: number
  color?: string
}) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
      {/* vertical strand — bows gently as it crosses */}
      <Path
        d='M12 4.5 C 10.7 9, 13.3 15, 12 19.5'
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap='round'
      />
      {/* horizontal strand — the mirror, so the two cross into a thread "+" */}
      <Path
        d='M4.5 12 C 9 10.7, 15 13.3, 19.5 12'
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap='round'
      />
    </Svg>
  )
}
