/**
 * QrCode — renders a scannable QR via react-native-svg (no native dependency).
 *
 * Powers the share card's "scan to install" path: a stranger seeing the 9:16
 * card on social can scan straight to the App Store / share link. Uses the
 * self-contained ./lib/qr encoder (byte mode, ECC level M). Returns null if the
 * value is too long for the supported version range — the caller falls back to
 * the plain text URL.
 */

import { memo } from 'react'
import Svg, { Path, Rect } from 'react-native-svg'
import { encodeQr } from '../lib/qr'

export interface QrCodeProps {
  value: string
  /** Rendered square size in px (includes the quiet-zone margin). */
  size: number
  /** Dark module colour. */
  color?: string
  /** Light background colour (the quiet zone must stay light to scan). */
  background?: string
  /** Quiet-zone width in modules (spec minimum is 4). */
  quietZone?: number
}

export const QrCode = memo(function QrCode({
  value,
  size,
  color = '#1a1a1a',
  background = '#ffffff',
  quietZone = 4,
}: QrCodeProps) {
  let matrix: boolean[][]
  try {
    matrix = encodeQr(value)
  } catch {
    return null
  }
  const n = matrix.length
  const total = n + quietZone * 2
  const cell = size / total

  // One Path of all dark modules — adjacent cells share exact float edges, so
  // they tile without seams.
  let d = ''
  for (let y = 0; y < n; y++) {
    const row = matrix[y]!
    for (let x = 0; x < n; x++) {
      if (!row[x]) continue
      const px = (x + quietZone) * cell
      const py = (y + quietZone) * cell
      d += `M${px} ${py}h${cell}v${cell}h${-cell}z`
    }
  }

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill={background} />
      <Path d={d} fill={color} />
    </Svg>
  )
})
