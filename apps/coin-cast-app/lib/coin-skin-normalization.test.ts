import { describe, expect, it } from 'bun:test'

import { normalizedCoinImageSize } from './coin-skin-normalization'

describe('coin skin normalization', () => {
  it('preserves landscape aspect ratio without cropping', () => {
    expect(normalizedCoinImageSize(8_000, 4_000)).toEqual({
      width: 2_048,
      height: 1_024,
    })
  })

  it('preserves portrait aspect ratio without cropping', () => {
    expect(normalizedCoinImageSize(3_000, 6_000)).toEqual({
      width: 1_024,
      height: 2_048,
    })
  })

  it('keeps safe images at their original dimensions', () => {
    expect(normalizedCoinImageSize(1_200, 1_200)).toEqual({
      width: 1_200,
      height: 1_200,
    })
  })

  it('rejects invalid dimensions before native image processing', () => {
    expect(() => normalizedCoinImageSize(0, 100)).toThrow()
    expect(() => normalizedCoinImageSize(Number.NaN, 100)).toThrow()
  })
})
