/**
 * Locus marker colors keyed by face VLM `skinTone` — contrast on skin, not theme.
 */

export type FaceSkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'unknown'

const SKIN_TONES = new Set<string>(['fair', 'light', 'medium', 'tan', 'deep', 'unknown'])

export function parseFaceSkinTone(raw: unknown): FaceSkinTone {
  if (typeof raw !== 'string') return 'unknown'
  const t = raw.trim().toLowerCase()
  return SKIN_TONES.has(t) ? (t as FaceSkinTone) : 'unknown'
}

/** High-contrast marker ink for photo annotation dots. */
export function locusMarkerAccentForSkinTone(tone: FaceSkinTone): string {
  switch (tone) {
    case 'fair':
    case 'light':
      return '#1A1714'
    case 'medium':
      return '#2C2416'
    case 'tan':
      return '#F2E6C8'
    case 'deep':
      return '#F7F0DC'
    default:
      return '#2A2622'
  }
}
