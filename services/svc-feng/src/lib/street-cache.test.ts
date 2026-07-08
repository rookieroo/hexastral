import { describe, expect, it } from 'bun:test'
import { quantizeCoord, streetGridKey } from './street-cache'

describe('street-cache grid quantization', () => {
  it('snaps coordinates to ~50m grid steps', () => {
    const { gridLat, gridLng } = streetGridKey(31.2304, 121.4737)
    expect(gridLat).toBe(quantizeCoord(31.2304))
    expect(gridLng).toBe(quantizeCoord(121.4737))
  })

  it('maps nearby points to the same grid cell', () => {
    const a = streetGridKey(31.2304, 121.4737)
    const b = streetGridKey(31.23042, 121.47372)
    expect(a).toEqual(b)
  })

  it('separates points farther than one grid step', () => {
    const a = streetGridKey(31.2304, 121.4737)
    const b = streetGridKey(31.231, 121.4745)
    expect(a.gridLat).not.toBe(b.gridLat)
    expect(a.gridLng).not.toBe(b.gridLng)
  })
})
