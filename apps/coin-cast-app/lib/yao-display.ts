/**
 * Overlay row index 0 = most recently cast line (shown at top).
 * Yao position runs 1 (初爻) … 6 (上爻) as casts accumulate.
 */
export function yaoNumberForOverlayRow(castCount: number, rowIndex: number): number {
  return castCount - rowIndex
}
