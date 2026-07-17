export const MAX_COIN_TEXTURE_DIMENSION = 2_048

export interface ImagePixelSize {
  width: number
  height: number
}

export function normalizedCoinImageSize(
  width: number,
  height: number,
  maxDimension = MAX_COIN_TEXTURE_DIMENSION
): ImagePixelSize {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(maxDimension) ||
    maxDimension <= 0
  ) {
    throw new Error('Image dimensions must be positive finite numbers')
  }
  const largest = Math.max(width, height)
  if (largest <= maxDimension) return { width: Math.round(width), height: Math.round(height) }
  const scale = maxDimension / largest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
