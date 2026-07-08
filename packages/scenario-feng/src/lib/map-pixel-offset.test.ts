import { describe, expect, test } from 'bun:test'
import { pixelOffsetToLatLng } from './map-pixel-offset'

describe('pixelOffsetToLatLng', () => {
  test('zero offset returns same point', () => {
    const p = pixelOffsetToLatLng(31.23, 121.47, 17, 0, 0)
    expect(p.lat).toBeCloseTo(31.23, 5)
    expect(p.lng).toBeCloseTo(121.47, 5)
  })

  test('eastward pixel shift increases longitude', () => {
    const p = pixelOffsetToLatLng(31.23, 121.47, 17, 100, 0)
    expect(p.lng).toBeGreaterThan(121.47)
    expect(p.lat).toBeCloseTo(31.23, 4)
  })
})
